import { useEffect, useState, type RefObject } from 'react';
import { useReducedMotion } from 'motion/react';
import { pickReading, type EntryReading, type WordEntry } from '../../../utils/vocabulary/wordEntry';

/**
 * The reading a word page leads with: the one it was opened for (`reading`,
 * a search row's pinyin), until the learner picks another. Picking one
 * scrolls the hero back into view, where that reading now shows.
 */
export function useEntryLead(
  entry: WordEntry | null,
  word: string,
  reading: string | null | undefined,
  topRef: RefObject<HTMLElement | null>,
): { lead: EntryReading | undefined; selectReading: (key: string) => void } {
  const reduceMotion = useReducedMotion();
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => setChosen(null), [word, reading]);
  const lead = entry
    ? entry.readings.find((item) => item.key === chosen) ?? pickReading(entry, reading)
    : undefined;
  const selectReading = (key: string) => {
    setChosen(key);
    topRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  return { lead, selectReading };
}
