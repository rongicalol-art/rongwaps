import { useState, useEffect, useCallback, useRef } from 'react';
import { executeRemoteSearch, prefetchLocalDictionary, getLocalDictionaryData } from '../services/dictionaryService';
import { sanitizeDictionaryDefinitions } from '../utils/dictionaryDefinitions';

export interface SearchResult {
  id: number;
  traditional: string;
  simplified: string;
  pinyin_accented: string;
  definitions: string | string[] | Record<string, unknown>;
  measure_words?: string[];
  match_type: 'exact' | 'prefix' | 'partial';
  total_score: number;
}

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
        .filter((row) => {
          const trad = row[1];
          const simp = row[2];
          const flat = row[3];
          return trad.includes(queryNormalized) || simp.includes(queryNormalized) || flat.includes(queryNormalized.replace(/\s/g, ''));
        })
        .slice(0, 15)
        .map((row) => {
          const sanitizedLocal = sanitizeDictionaryDefinitions(row[5]);
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
          const sanitized = sanitizeDictionaryDefinitions(res.definitions);
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
      if (currentId !== searchIdRef.current) return;
      console.error('SuperSearch RPC Failed:', err);
      setSearchError('Search is having trouble right now. Showing local results only.');
      // Keep local results on error — they're already displayed
    } finally {
      if (currentId === searchIdRef.current) setIsSearching(false);
    }
  }, []);

  // 3. Debounce for remote execution (local trie is instant, so no debounce needed for it)
  useEffect(() => {
    if (externalQuery.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
      setSearchError(null);
    }

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
