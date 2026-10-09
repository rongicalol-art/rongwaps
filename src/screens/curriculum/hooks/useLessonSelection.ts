import { useCallback, useEffect, useState } from 'react';

/**
 * Multi-lesson select mode. Long-pressing a lesson enters it with that lesson
 * selected; tapping then toggles lessons. It ends on cancel, Escape, a book
 * switch, or when the last lesson is deselected.
 */
export function useLessonSelection(activeBookId: number) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const isSelecting = selectedIds.length > 0;

  const enter = useCallback((id: number) => setSelectedIds([id]), []);
  const exit = useCallback(() => setSelectedIds([]), []);
  const toggle = useCallback((id: number) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    ));
  }, []);

  useEffect(() => exit(), [activeBookId, exit]);

  useEffect(() => {
    if (!isSelecting) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exit, isSelecting]);

  return { selectedIds, isSelecting, enter, exit, toggle };
}
