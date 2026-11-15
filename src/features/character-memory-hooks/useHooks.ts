import { useEffect, useState } from 'react';
import { fetchTeachHookIndex, fetchWordHookIndex } from '../../services/contentPacks';
import type { TeachHook, TeachHookIndex, WordHook, WordHookIndex } from '../../types/hookPieces';

/** A pack kept once loaded, so later screens resolve on first render. A failed load stays unset and retries. */
function packHook<T>(fetchIndex: () => Promise<Map<string, T> | null>) {
  let cached: Map<string, T> | undefined;
  return function useHook(key: string, enabled = true): { loaded: boolean; hook: T | null } {
    const [index, setIndex] = useState<Map<string, T> | null | undefined>(cached);
    useEffect(() => {
      if (cached || !enabled) return;
      let active = true;
      void fetchIndex().then((loaded) => {
        if (loaded) cached = loaded;
        if (active) setIndex(loaded);
      });
      return () => { active = false; };
    }, [enabled]);
    // False until the pack has answered (found or not), so callers can hold a placeholder instead of flashing a fallback.
    return { loaded: index !== undefined, hook: index?.get(key) ?? null };
  };
}

/** Memory hook for one character (pieces by stroke + one explanation). */
export const useTeachHook = packHook<TeachHook>(fetchTeachHookIndex as () => Promise<TeachHookIndex | null>);

/** Memory hook for one word (its characters added up, or a plain explanation). */
export const useWordHook = packHook<WordHook>(fetchWordHookIndex as () => Promise<WordHookIndex | null>);

/** The hook a study card shows: the word's own, or the character's when the word is one character. */
export function useCardHook(front: string, enabled = true): { loaded: boolean; word: WordHook | null; char: TeachHook | null } {
  const single = [...front].length === 1;
  const word = useWordHook(front, enabled && !single);
  const char = useTeachHook(front, enabled && single);
  return single ? { loaded: char.loaded, word: null, char: char.hook } : { loaded: word.loaded, word: word.hook, char: null };
}
