import { useState, useCallback, useEffect } from 'react';
import type { ReadingRecord } from '../../types/models';
import { useAppStore } from '../../store/useAppStore';
import { getSelectedLessonIds } from '../../utils/lessonPartSelection';
import { resolveActiveReadingIndex } from '../../utils/readingContext';

export async function loadReadings(bookId: number): Promise<ReadingRecord[]> {
  const { getReadingsForBook } = await import('../../data/readings');
  return getReadingsForBook(bookId);
}

export function useReaderLauncher({
  selectedLessons,
  activeBookId,
  activeGrammarPartId,
}: {
  selectedLessons: number[];
  activeBookId: number;
  activeGrammarPartId: string | null;
}) {
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [activeReadingIndex, setActiveReadingIndex] = useState<number | null>(null);

  const openReader = useCallback(async (bookId: number, explicitIndex?: number) => {
    const loaded = await loadReadings(bookId);
    if (!loaded.length) {
      setReadings([]);
      setActiveReadingIndex(null);
      return;
    }
    const store = useAppStore.getState();
    // Lessons derived from the canonical per-book parts map; the passed-in
    // prop is the fallback for callers that already computed a view.
    const storeLessons = getSelectedLessonIds(store.selectedLessonParts, bookId);
    const targetIdx = explicitIndex !== undefined
      ? Math.max(0, Math.min(explicitIndex, loaded.length - 1))
      : resolveActiveReadingIndex({
        bookId,
        selectedLessons: storeLessons.length > 0 ? storeLessons : selectedLessons,
        selectedLessonParts: store.selectedLessonParts,
        readings: loaded,
      });
    setReadings(loaded);
    setActiveReadingIndex(targetIdx);
  }, [selectedLessons]);

  const closeReader = useCallback(() => {
    setActiveReadingIndex(null);
    setReadings([]);
  }, []);

  const navigateReader = useCallback((targetIndex: number) => {
    setActiveReadingIndex((current) => {
      if (current === null) return current;
      const nextIndex = Math.min(Math.max(targetIndex, 0), readings.length - 1);
      return nextIndex === current ? current : nextIndex;
    });
  }, [readings.length]);

  useEffect(() => {
    const handleReaderKey = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement | null;
      if (!target || (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key.toLowerCase() !== 'r' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (activeGrammarPartId) return;
      if (activeReadingIndex !== null) closeReader();
      else void openReader(activeBookId);
    };
    window.addEventListener('keydown', handleReaderKey);
    return () => window.removeEventListener('keydown', handleReaderKey);
  }, [activeGrammarPartId, activeReadingIndex, activeBookId, closeReader, openReader]);

  return {
    readings,
    activeReadingIndex,
    openReader,
    closeReader,
    navigateReader,
  };
}
