import { createStaticIndex } from './createStaticIndex';
import { useSyncExternalStore } from 'react';
import { fetchPartsIndex } from '../services/contentPacks';
import type { PartsIndex } from '../utils/characters/parts';

const index = createStaticIndex(fetchPartsIndex);

/** Parts index (built-with relations, sound clues); null until loaded or when unavailable. */
export function useParts(): PartsIndex | null {
  return useSyncExternalStore(index.subscribe, index.getSnapshot, index.getSnapshot);
}
