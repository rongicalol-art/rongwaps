import { useCallback, useMemo } from 'react';
import type { LessonPartSelectionMap } from '../../../types/models';
import { getSelectedLessonIds, setBookLessonSelection } from '../../../utils/lesson/lessonPartSelection';

interface UseLessonSelectionOptions {
  activeBookId: number;
  defaultId?: number | null;
  selectedLessonParts: LessonPartSelectionMap;
  availablePartsByLesson: Record<number, number[]>;
  setSelectedLessonParts: (
    parts: LessonPartSelectionMap
      | ((prev: LessonPartSelectionMap) => LessonPartSelectionMap),
  ) => void;
}

/**
 * Multi-lesson select mode, persisted in the same per-book deck selection the
 * practice screens use. Long-pressing a lesson enters it with that lesson
 * selected; tapping then toggles lessons. It ends on cancel, Escape, a book
 * switch to another book's saved selection, or when the last lesson is
 * deselected.
 */
export function useLessonSelection({
  activeBookId,
  defaultId,
  selectedLessonParts,
  availablePartsByLesson,
  setSelectedLessonParts,
}: UseLessonSelectionOptions) {
  const selectedIds = useMemo(() => {
    const saved = getSelectedLessonIds(selectedLessonParts, activeBookId);
    if (saved.length > 0) return saved;
    return typeof defaultId === 'number' ? [defaultId] : [];
  }, [activeBookId, defaultId, selectedLessonParts]);

  const isSelecting = selectedIds.length > 0;
  const isMultiSelecting = selectedIds.length > 1;

  const write = useCallback((ids: number[]) => {
    setSelectedLessonParts((current) => (
      setBookLessonSelection(current, activeBookId, ids, availablePartsByLesson)
    ));
  }, [activeBookId, availablePartsByLesson, setSelectedLessonParts]);

  const enter = useCallback((id: number) => write([id]), [write]);
  const exit = useCallback(() => {
    write(typeof defaultId === 'number' ? [defaultId] : []);
  }, [defaultId, write]);

  const toggle = useCallback((id: number) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((value) => value !== id)
      : [...selectedIds, id];
    write(next.length > 0 ? next : typeof defaultId === 'number' ? [defaultId] : []);
  }, [defaultId, selectedIds, write]);

  return { selectedIds, isSelecting, isMultiSelecting, enter, exit, toggle };
}
