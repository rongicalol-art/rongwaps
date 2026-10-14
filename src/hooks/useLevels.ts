import { createStaticIndex } from './createStaticIndex';
import { useMemo, useSyncExternalStore } from 'react';
import { fetchLevelIndex, type LevelIndex } from '../services/contentPacks';
import { resolveLevel, type ResolvedLevel } from '../utils/lesson/levels';

const index = createStaticIndex(fetchLevelIndex);

/** TOCFL level index (TBCL + HSK gap fill); null until loaded or when unavailable. */
export function useLevels(): LevelIndex | null {
  return useSyncExternalStore(index.subscribe, index.getSnapshot, index.getSnapshot);
}

/** Resolved TOCFL level for one headword (tbcl, hsk or character estimate). */
export function useLevel(text?: string): ResolvedLevel | null {
  const levels = useLevels();
  return useMemo(() => resolveLevel(text, levels), [text, levels]);
}
