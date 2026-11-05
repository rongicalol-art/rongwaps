import { useEffect, useState } from 'react';
import { getWordEntry } from '../services/wordEntryService';
import type { WordEntry } from '../utils/vocabulary/wordEntry';
import { debugLogger } from '../utils/debug/debugLogger';

/** A word's dictionary entry (every reading, course senses first); `entry` is null while loading or when unknown. */
export function useWordEntry(word: string | undefined): { entry: WordEntry | null; isLoading: boolean } {
  const [state, setState] = useState<{ word?: string; entry: WordEntry | null }>({ entry: null });
  useEffect(() => {
    if (!word) return undefined;
    let active = true;
    getWordEntry(word)
      .then((entry) => { if (active) setState({ word, entry }); })
      .catch((error) => {
        debugLogger.warn('Cache', `Word entry for ${word} failed`, error);
        if (active) setState({ word, entry: null });
      });
    return () => { active = false; };
  }, [word]);
  const current = state.word === word;
  return { entry: current ? state.entry : null, isLoading: Boolean(word) && !current };
}
