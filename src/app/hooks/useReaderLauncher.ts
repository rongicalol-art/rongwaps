import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { ReadingRecord } from '../../types/models';
import { useAppStore } from '../../store/useAppStore';
import { getSelectedLessonIds } from '../../utils/lesson/lessonPartSelection';
import { resolveActiveReadingIndex, findReadingIndexForPart, findReadingIndicesForParts } from '../../utils/lesson/readingContext';
import { isLessonLocked } from '../../data/books';
import { fetchReadingsPack, fetchDialogueAlignmentPack } from '../../services/contentPacks';
import { warmChineseFont } from '../../utils/browser/fontWarmup';

export async function loadReadings(bookId: number, hasFullCourseAccess = false): Promise<ReadingRecord[]> {
  warmChineseFont();
  const [readings] = await Promise.all([
    fetchReadingsPack(bookId),
    import('../../screens/reader/components/ReadingCanvas'),
    import('../../screens/reader/components/ReadingNarrativeView'),
  ]);
  void fetchDialogueAlignmentPack(bookId).catch(() => {});
  return (readings ?? []).filter((reading) => !isLessonLocked(reading.bookId, reading.lessonId, hasFullCourseAccess));
}

export function useReaderLauncher({
  selectedLessons,
  activeBookId,
  activeGrammarPartId,
  onOpen,
}: {
  selectedLessons: number[];
  activeBookId: number;
  activeGrammarPartId: string | null;
  onOpen?: () => void;
}) {
  const { hasFullCourseAccess } = useAuth();
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [activeReadingIndex, setActiveReadingIndex] = useState<number | null>(null);
  const [sessionIndices, setSessionIndices] = useState<number[]>([]);
  const [isOpening, setIsOpening] = useState(false);

  const [loadError, setLoadError] = useState(false);
  const generation = useRef(0);
  const retryRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => () => { generation.current++; }, []);

  const openReading = useCallback(async (bookId: number, selectIndex: (loaded: ReadingRecord[]) => number | number[]): Promise<void> => {
    onOpen?.();
    const request = ++generation.current;
    retryRef.current = () => openReading(bookId, selectIndex);
    setIsOpening(true);
    setLoadError(false);
    setActiveReadingIndex(null);
    setSessionIndices([]);
    const fail = () => {
      if (generation.current !== request) return;
      setLoadError(true);
      setIsOpening(false);
    };
    const timeout = window.setTimeout(() => { if (generation.current === request) { fail(); generation.current++; } }, 25_000);
    try {
      const loaded = await loadReadings(bookId, hasFullCourseAccess);
      if (generation.current !== request) return;
      if (!loaded.length) { fail(); return; }
      const selected = selectIndex(loaded);
      const indices = Array.isArray(selected) ? selected : [selected];
      if (!indices.length) { fail(); return; }
      setReadings(loaded);
      setSessionIndices(indices.length > 1 ? indices : []);
      setActiveReadingIndex(indices[0]);
    } catch { fail(); }
    finally {
      window.clearTimeout(timeout);
      if (generation.current === request) setIsOpening(false);
    }
  }, [hasFullCourseAccess, onOpen]);

  const openReader = useCallback((bookId: number, explicitIndex?: number) => openReading(bookId, (loaded) => {
    if (explicitIndex !== undefined) return Math.max(0, Math.min(explicitIndex, loaded.length - 1));
    const store = useAppStore.getState();
    const storeLessons = getSelectedLessonIds(store.selectedLessonParts, bookId);
    return resolveActiveReadingIndex({
      bookId, selectedLessons: storeLessons.length ? storeLessons : selectedLessons,
      selectedLessonParts: store.selectedLessonParts, readings: loaded,
    });
  }), [openReading, selectedLessons]);

  const openReaderForPart = useCallback((bookId: number, lessonId: number, partId: number | number[]) => (
    openReading(bookId, (loaded) => Array.isArray(partId)
      ? findReadingIndicesForParts(loaded, bookId, lessonId, partId)
      : findReadingIndexForPart(loaded, bookId, lessonId, partId))
  ), [openReading]);

  const closeReader = useCallback(() => {
    generation.current++;
    retryRef.current = null;
    setLoadError(false);
    setIsOpening(false);
    setActiveReadingIndex(null);
    setReadings([]);
    setSessionIndices([]);
  }, []);

  const navigateReader = useCallback((targetIndex: number) => {
    if (sessionIndices.length && !sessionIndices.includes(targetIndex)) setSessionIndices([]);
    setActiveReadingIndex((current) => {
      if (current === null) return current;
      const nextIndex = Math.min(Math.max(targetIndex, 0), readings.length - 1);
      return nextIndex === current ? current : nextIndex;
    });
  }, [readings.length, sessionIndices]);

  useEffect(() => {
    const handleReaderKey = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement | null;
      if (!target || (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key.toLowerCase() !== 'r' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (activeGrammarPartId) return;
      if (activeReadingIndex !== null) closeReader();
      else {
        onOpen?.();
        void openReader(activeBookId);
      }
    };
    window.addEventListener('keydown', handleReaderKey);
    return () => window.removeEventListener('keydown', handleReaderKey);
  }, [activeGrammarPartId, activeReadingIndex, activeBookId, closeReader, openReader, onOpen]);

  return {
    readings,
    sessionIndices,
    activeReadingIndex,
    isOpeningReader: isOpening,
    loadError,
    retry: () => { void retryRef.current?.(); },
    openReader,
    openReaderForPart,
    closeReader,
    navigateReader,
  };
}
