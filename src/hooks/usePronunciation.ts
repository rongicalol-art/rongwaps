import { useMemo, useSyncExternalStore } from 'react';
import { fetchPronunciationIndex } from '../services/contentPacks';
import { allReadings, primaryReading, type Reading, type ReadingsIndex } from '../utils/pronunciation';

let index: ReadingsIndex | null = null;
let requested = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!requested) {
    requested = true;
    void fetchPronunciationIndex().then((loaded) => {
      if (!loaded) return;
      index = loaded;
      listeners.forEach((notify) => notify());
    });
  }
  return () => listeners.delete(listener);
}

const getSnapshot = () => index;

/** Character readings index (Taiwan-first); null until loaded or when unavailable. */
export function usePronunciation(): ReadingsIndex | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** The pinyin to show for a character; `fallback` (e.g. breakdown pinyin) until the index loads. */
export function usePrimaryReading(char?: string, fallback?: string | null): string | undefined {
  const readings = usePronunciation();
  return useMemo(() => primaryReading(char, readings, fallback), [char, readings, fallback]);
}

/** Every reading of a character, primary first. */
export function useReadings(char?: string): Reading[] {
  const readings = usePronunciation();
  return useMemo(() => allReadings(char, readings), [char, readings]);
}
