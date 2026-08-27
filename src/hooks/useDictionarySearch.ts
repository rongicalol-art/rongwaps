import { useState, useEffect, useCallback, useRef } from 'react';
import { executeRemoteSearch } from '../services/dictionaryService';
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
        setResults(cleanedData);
      } else {
        setResults([]);
      }
    } catch (err) {
      if (currentId !== searchIdRef.current) return;
      console.error('SuperSearch RPC Failed:', err);
      setSearchError('Search is having trouble right now. Please try again.');
      setResults([]);
    } finally {
      if (currentId === searchIdRef.current) setIsSearching(false);
    }
  }, []);

  // Debounce remote execution
  useEffect(() => {
    if (externalQuery.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
      setSearchError(null);
    }

    const timer = setTimeout(() => {
      executeSearch(externalQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [externalQuery, executeSearch]);

  return {
    results,
    isSearching,
    searchError
  };
}
