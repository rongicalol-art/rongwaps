import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Multi-lesson select mode. Long-pressing a lesson enters it with that lesson
 * selected; tapping then toggles lessons. It ends on cancel, Escape, a book
 * switch, or when the last lesson is deselected.
 */
export function useLessonSelection(activeBookId: number, defaultId?: number | null) {
  const [selectedIds, setSelectedIds] = useState<number[]>(() => (
    typeof defaultId === 'number' ? [defaultId] : []
  ));
  const isSelecting = selectedIds.length > 0;
  const isMultiSelecting = selectedIds.length > 1;

  const enter = useCallback((id: number) => setSelectedIds([id]), []);
  const exit = useCallback(() => {
    setSelectedIds(typeof defaultId === 'number' ? [defaultId] : []);
  }, [defaultId]);

  const toggle = useCallback((id: number) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        const next = current.filter((value) => value !== id);
        return next.length > 0 ? next : typeof defaultId === 'number' ? [defaultId] : [];
      }
      return [...current, id];
    });
  }, [defaultId]);

  const prevBookIdRef = useRef(activeBookId);
  const prevDefaultIdRef = useRef(defaultId);
  useEffect(() => {
    const bookChanged = prevBookIdRef.current !== activeBookId;
    const defaultChanged = prevDefaultIdRef.current !== defaultId;
    prevBookIdRef.current = activeBookId;
    prevDefaultIdRef.current = defaultId;

    if (bookChanged || defaultChanged) {
      setSelectedIds(typeof defaultId === 'number' ? [defaultId] : []);
      return;
    }

    setSelectedIds((current) => {
      if (current.length === 0 && typeof defaultId === 'number') {
        return [defaultId];
      }
      return current;
    });
  }, [activeBookId, defaultId]);

  useEffect(() => {
    if (!isSelecting) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exit, isSelecting]);

  return { selectedIds, isSelecting, isMultiSelecting, enter, exit, toggle };
}
