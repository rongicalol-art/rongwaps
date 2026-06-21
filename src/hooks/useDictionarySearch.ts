import { useState, useEffect, useCallback, useRef } from 'react';
import { executeRemoteSearch, prefetchLocalDictionary, getLocalDictionaryData } from '../services/dictionaryService';

export interface SearchResult {
  id: number;
  traditional: string;
  simplified: string;
  pinyin_accented: string;
  definitions: any;
  measure_words?: string[];
  match_type: 'exact' | 'prefix' | 'partial';
  total_score: number;
}

// Helper to sanitize definitions
const sanitizeDefinitions = (defs: any) => {
  let parsed: string[] = [];
  if (Array.isArray(defs)) {
    parsed = defs.map(d => typeof d === 'string' ? d : d.meaning || String(d));
  } else if (defs && typeof defs === 'object') {
    parsed = Object.values(defs).map(d => String(d));
  } else if (typeof defs === 'string') {
    parsed = [defs];
  }
  
  const measureWords: string[] = [];
  
  let clean = parsed.map(d => {
    let text = d;

    // Extract Measure Words (CL:...) before stripping them
    // Matches patterns like "CL:個|个[ge4]" or "CL:隻|只[zhi1],條|条[tiao2]"
    const clMatches = text.match(/CL:([^;$]+)/i);
    if (clMatches && clMatches[1]) {
      // Split multiple measure words usually separated by comma
      const extractedMWs = clMatches[1].split(',').map(mw => {
        // e.g. "個|个[ge4]" -> let's just keep the whole string for now, we'll format it gracefully in UI.
        return mw.trim();
      }).filter(Boolean);
      measureWords.push(...extractedMWs);
    }
    // Now remove the CL:... segment completely from the definition text
    text = text.replace(/(?:^|;?\s*)CL:[^;$]+(?:;|$)/gi, '');

    // Remove grammatical metadata in parens that aren't very useful for flashcards

    text = text.replace(/\(idiom\)/gi, '');
    text = text.replace(/\(slang\)/gi, '');
    text = text.replace(/\(dialect\)/gi, '');
    text = text.replace(/\(coll\.\)/gi, '');
    text = text.replace(/\(fig\.\)/gi, '');
    text = text.replace(/\(lit\.\)/gi, '');
    text = text.replace(/lit\.\s*/gi, '');
    text = text.replace(/esp\.\s*/gi, 'especially ');
    
    // Remove references to other characters, e.g. "see 漢字|汉字[han4 zi4]"
    text = text.replace(/see (?:\S+)?\[.*?\]/gi, '');
    text = text.replace(/see also (?:\S+)?\[.*?\]/gi, '');
    
    // Remove variant notes, e.g. "variant of 字[zi4]"
    text = text.replace(/(?:old )?variant of (?:\S+)?\[.*?\]/gi, '');
    text = text.replace(/(?:old )?variant of \S+/gi, '');
    text = text.replace(/archaic variant of (?:\S+)?\[.*?\]/gi, '');
    text = text.replace(/also written (?:\S+)?\[.*?\]/gi, '');
    
    // Normalize classifier/measure word phrasing
    text = text.replace(/classifier for/gi, 'measure word for');
    
    // Clean up any double spaces, comma issues, or leading/trailing punctuation left over
    text = text.replace(/\s+/g, ' ').replace(/^\s*[,;]\s*/, '').replace(/\s*[,;]\s*$/, '').trim();
    
    return text;
  });
  
  // Filter out empty strings after cleanup, and purely surname definitions
  clean = clean.filter(d => 
    d.length > 0 && 
    !/^surname\b/i.test(d) && 
    !/\(surname\)/i.test(d)
  );
  
  // Deduplicate strings to remove identical repeats
  clean = Array.from(new Set(clean));

  if (clean.length === 0 && parsed.length > 0) clean = parsed; // fallback
  return { definitions: clean, measure_words: Array.from(new Set(measureWords)) };
};

export function useDictionarySearch(externalQuery: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trieLoaded, setTrieLoaded] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchIdRef = useRef(0);
  // Track local results so we can merge with remote instead of overwriting
  const localResultsRef = useRef<SearchResult[]>([]);

  // 1. Lazy load the massive Trie cache in the background on mount
  useEffect(() => {
    prefetchLocalDictionary().then(() => {
      setTrieLoaded(true);
    });
  }, []);

  // 2. The combined execution — local trie + remote RPC, merged intelligently
  const executeSearch = useCallback(async (searchQuery: string) => {
    const currentId = ++searchIdRef.current;

    if (!searchQuery.trim()) {
      setResults([]);
      localResultsRef.current = [];
      return;
    }

    const queryNormalized = searchQuery.trim().toLowerCase();

    // A: INSTANT LOCAL TRIE SEARCH — runs synchronously for zero-latency feedback
    const localData = getLocalDictionaryData();
    localResultsRef.current = [];
    if (localData && queryNormalized.length <= 15) {
      const localMatches = localData
        .filter((row: any) => {
          const trad = row[1];
          const simp = row[2];
          const flat = row[3];
          return trad.includes(queryNormalized) || simp.includes(queryNormalized) || flat.includes(queryNormalized.replace(/\s/g, ''));
        })
        .slice(0, 15)
        .map((row: any) => {
          const sanitizedLocal = sanitizeDefinitions([row[5]]);
          return {
            id: row[0],
            traditional: row[1],
            simplified: row[2],
            pinyin_accented: row[4],
            definitions: sanitizedLocal.definitions,
            measure_words: sanitizedLocal.measure_words,
            match_type: 'prefix' as const,
            total_score: 50
          };
        });
      localResultsRef.current = localMatches;
      setResults(localMatches);
    }

    setIsSearching(true);
    setSearchError(null);

    // B: SUPABASE RPC DEEP SEARCH — merges with local results
    try {
      const data = await executeRemoteSearch(queryNormalized);

      if (currentId !== searchIdRef.current) return;

      if (data && data.length > 0) {
        const cleanedData = (data as SearchResult[]).map(res => {
          const sanitized = sanitizeDefinitions(res.definitions);
          return {
            ...res,
            definitions: sanitized.definitions,
            measure_words: sanitized.measure_words
          };
        });
        // Merge: remote results first, then local results not already in remote
        const remoteIds = new Set(cleanedData.map(r => r.traditional));
        const extraLocal = localResultsRef.current.filter(r => !remoteIds.has(r.traditional));
        setResults([...cleanedData, ...extraLocal]);
      }
      // If remote returns empty, keep local results (already set above)
    } catch (err) {
      console.error('SuperSearch RPC Failed:', err);
      setSearchError('Search is having trouble right now. Showing local results only.');
      // Keep local results on error — they're already displayed
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 3. Debounce for remote execution (local trie is instant, so no debounce needed for it)
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(externalQuery);
    }, 300); // Reduced from 400ms for snappier feel

    return () => clearTimeout(timer);
  }, [externalQuery, executeSearch]);

  return {
    results,
    isSearching,
    isReady: trieLoaded,
    searchError
  };
}
