import { debugLogger } from '../utils/debug/debugLogger';
import { useState, useEffect, useCallback, useRef } from 'react';
import { executeRemoteSearch } from '../services/dictionaryService';
import { getCourseVocabLookupMap } from '../services/courseVocabLookup';
import { sanitizeDictionaryDefinitions } from '../utils/vocabulary/dictionaryDefinitions';

export interface SearchResult {
  id: number;
  traditional: string;
  simplified: string;
  pinyin_accented: string;
  definitions: string | string[] | Record<string, unknown>;
  measure_words?: string[];
  match_type: 'exact' | 'prefix' | 'partial';
  total_score: number;
  bookId?: number;
  lessonId?: number;
  pos?: string;
  audio?: string;
}

/** Recent results by normalized query: reopening the tab (or retyping) paints instantly instead of waiting out debounce + RPC. */
const resultCache = new Map<string, SearchResult[]>();
const RESULT_CACHE_LIMIT = 40;

function cacheKey(query: string): string {
  return query.trim().toLowerCase();
}

export function useDictionarySearch(externalQuery: string) {
  const initialCached = resultCache.get(cacheKey(externalQuery));
  const [results, setResults] = useState<SearchResult[]>(initialCached ?? []);
  const [isSearching, setIsSearching] = useState(!initialCached && Boolean(externalQuery.trim()));
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchIdRef = useRef(0);

  const executeSearch = useCallback(async (searchQuery: string) => {
    const currentId = ++searchIdRef.current;

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const queryNormalized = searchQuery.trim().toLowerCase();

    setIsSearching(true);
    setSearchError(null);

    try {
      let courseMap: Awaited<ReturnType<typeof getCourseVocabLookupMap>> | null = null;
      let latestRows: unknown[] | null = null;
      let complete = false;
      const publish = (data: unknown[]) => {
        if (currentId !== searchIdRef.current) return;
        latestRows = data;
        const cleanedData = (data as SearchResult[]).map((res) => {
          const sanitized = sanitizeDictionaryDefinitions(res.definitions);
          const courseCard = courseMap
            ? courseMap.get(res.traditional) ?? courseMap.get(res.simplified)
            : undefined;
          const courseDef = courseCard?.back?.trim();
          const mergedDefs = courseDef
            ? [courseDef, ...sanitized.definitions.filter((d) => d.toLowerCase() !== courseDef.toLowerCase())]
            : sanitized.definitions;
          return {
            ...res,
            definitions: mergedDefs,
            measure_words: sanitized.measure_words,
            bookId: courseCard?.bookId ?? res.bookId,
            lessonId: courseCard?.lessonId ?? res.lessonId,
            pos: courseCard?.pos ?? res.pos,
            audio: courseCard?.audio ?? res.audio ?? undefined,
          };
        });
        // A partial response must not mask the completed search on reopen.
        if (complete) {
          resultCache.set(queryNormalized, cleanedData);
          if (resultCache.size > RESULT_CACHE_LIMIT) resultCache.delete(resultCache.keys().next().value as string);
        }
        setResults(cleanedData);
        setIsSearching(false);
      };
      void getCourseVocabLookupMap().then((map) => {
        courseMap = map;
        if (latestRows) publish(latestRows);
      }).catch(() => {});
      const data = await executeRemoteSearch(queryNormalized, publish);
      complete = true;
      publish(data);
    } catch (err) {
      if (currentId !== searchIdRef.current) return;
      debugLogger.error('Supabase', 'SuperSearch RPC Failed:', err);
      setSearchError('Search is having trouble right now. Please try again.');
      setResults([]);
    } finally {
      if (currentId === searchIdRef.current) setIsSearching(false);
    }
  }, []);

  // Debounce remote execution
  useEffect(() => {
    const cached = resultCache.get(cacheKey(externalQuery));
    if (cached) {
      searchIdRef.current += 1;
      setResults(cached);
      setSearchError(null);
      setIsSearching(false);
      return;
    }
    if (externalQuery.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
      setSearchError(null);
    }

    const timer = setTimeout(() => {
      executeSearch(externalQuery);
    }, 150);

    return () => { clearTimeout(timer); searchIdRef.current += 1; };
  }, [externalQuery, executeSearch]);

  return {
    results,
    isSearching,
    searchError,
  };
}
