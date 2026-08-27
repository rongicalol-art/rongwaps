import { useEffect, useState } from 'react';
import { getDictionaryEntries } from '../../../services/dictionaryService';
import type { DBDictionaryEntry } from '../../../types/database';

/**
 * Loads the dictionary entries for a single character. Fetches through
 * `getDictionaryEntries`, which caches results in the shared dictionary
 * cache, so repeat lookups (practice, dictionary, pushed views) are cheap.
 * Returns an empty list while loading and when no entry exists.
 */
export function useCharDictionaryEntry(char: string | undefined): DBDictionaryEntry[] {
  const [entries, setEntries] = useState<DBDictionaryEntry[]>([]);

  useEffect(() => {
    let active = true;
    setEntries([]);
    if (!char) return;
    getDictionaryEntries(char)
      .then((data) => {
        if (active) setEntries(data);
      })
      .catch((error) => {
        console.error('useCharDictionaryEntry: failed to load entries:', error);
      });
    return () => {
      active = false;
    };
  }, [char]);

  return entries;
}
