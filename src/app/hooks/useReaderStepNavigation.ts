import { useCallback } from 'react';
import { INTERACTIVE_GRAMMAR_PARTS } from '../../data/interactiveGrammarPages';
import { findGrammarPartForReading, findNextGrammarPartForReading } from '../../utils/readingContext';
import type { ReadingRecord } from '../../types/models';

interface UseReaderStepNavigationOptions {
  activeReadingIndex: number | null;
  readings: ReadingRecord[];
  closeReader: () => void;
  openGrammarPart: (partId: string, pageId?: string | null) => void;
}

/**
 * The reader is one step on the lesson path, so both gestures walk it:
 * `→` / swipe-left continue into the next part's grammar, `←` / swipe-right
 * return into this reading's part grammar at its last page (the page that
 * handed off to the reading). Readings that belong to no part — essays —
 * have no step in either direction.
 */
export function useReaderStepNavigation({
  activeReadingIndex,
  readings,
  closeReader,
  openGrammarPart,
}: UseReaderStepNavigationOptions) {
  const handleReaderNext = useCallback(() => {
    if (activeReadingIndex === null) return;
    const reading = readings[activeReadingIndex];
    const nextPart = reading
      ? findNextGrammarPartForReading(reading, INTERACTIVE_GRAMMAR_PARTS)
      : null;
    if (!nextPart) return;
    closeReader();
    openGrammarPart(nextPart.id);
  }, [activeReadingIndex, readings, closeReader, openGrammarPart]);

  const handleReaderPrevious = useCallback(() => {
    if (activeReadingIndex === null) return;
    const reading = readings[activeReadingIndex];
    const part = reading ? findGrammarPartForReading(reading, INTERACTIVE_GRAMMAR_PARTS) : null;
    if (!part) return;
    closeReader();
    openGrammarPart(part.id, part.grammarPages.at(-1)?.id ?? null);
  }, [activeReadingIndex, readings, closeReader, openGrammarPart]);

  return { handleReaderNext, handleReaderPrevious };
}
