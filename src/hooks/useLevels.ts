import { useMemo, useSyncExternalStore } from 'react';
import { fetchLevelIndex, type LevelIndex } from '../services/contentPacks';
import { resolveLevel, type ResolvedLevel } from '../utils/lesson/levels';

let index: LevelIndex | null = null;
let requested = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!requested) {
    requested = true;
    void fetchLevelIndex().then((loaded) => {
      if (!loaded) return;
      index = loaded;
      listeners.forEach((notify) => notify());
    });
  }
  return () => listeners.delete(listener);
}

const getSnapshot = () => index;

/** TOCFL level index (TBCL + HSK gap fill); null until loaded or when unavailable. */
export function useLevels(): LevelIndex | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Resolved TOCFL level for one headword (tbcl, hsk or character estimate). */
export function useLevel(text?: string): ResolvedLevel | null {
  const levels = useLevels();
  return useMemo(() => resolveLevel(text, levels), [text, levels]);
}
