import { useSyncExternalStore } from 'react';
import { fetchPartsIndex } from '../services/contentPacks';
import type { PartsIndex } from '../utils/parts';

let index: PartsIndex | null = null;
let requested = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!requested) {
    requested = true;
    void fetchPartsIndex().then((loaded) => {
      if (!loaded) return;
      index = loaded;
      listeners.forEach((notify) => notify());
    });
  }
  return () => listeners.delete(listener);
}

const getSnapshot = () => index;

/** Parts index (built-with relations, sound clues); null until loaded or when unavailable. */
export function useParts(): PartsIndex | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
