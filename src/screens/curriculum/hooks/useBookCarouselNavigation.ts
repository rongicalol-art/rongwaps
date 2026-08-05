import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';

interface BookCarouselNavigationOptions {
  activeIndex: number;
  itemCount: number;
  onSelect: (index: number) => void;
}

const WHEEL_THRESHOLD = 44;
const SWIPE_THRESHOLD = 48;

export function useBookCarouselNavigation({
  activeIndex,
  itemCount,
  onSelect,
}: BookCarouselNavigationOptions) {
  const stageRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(activeIndex);
  const onSelectRef = useRef(onSelect);
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const ignoreClickRef = useRef(false);

  activeIndexRef.current = activeIndex;
  onSelectRef.current = onSelect;

  const selectIndex = (index: number) => {
    const nextIndex = Math.max(0, Math.min(itemCount - 1, index));
    if (nextIndex === activeIndexRef.current) return;
    activeIndexRef.current = nextIndex;
    onSelectRef.current(nextIndex);
  };

  const changeBook = (direction: -1 | 1) => {
    selectIndex(activeIndexRef.current + direction);
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let wheelDistance = 0;
    let changedDuringGesture = false;
    let gestureEndTimer: number | undefined;

    const handleWheel = (event: WheelEvent) => {
      window.clearTimeout(gestureEndTimer);
      gestureEndTimer = window.setTimeout(() => {
        wheelDistance = 0;
        changedDuringGesture = false;
      }, 160);

      // Vertical trackpad gestures belong entirely to the page.
      if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) return;

      event.preventDefault();
      if (changedDuringGesture) return;

      wheelDistance += event.deltaX;
      if (Math.abs(wheelDistance) < WHEEL_THRESHOLD) return;

      const direction = wheelDistance > 0 ? 1 : -1;
      const nextIndex = activeIndexRef.current + direction;
      if (nextIndex >= 0 && nextIndex < itemCount) {
        activeIndexRef.current = nextIndex;
        onSelectRef.current(nextIndex);
      }
      changedDuringGesture = true;
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      stage.removeEventListener('wheel', handleWheel);
      window.clearTimeout(gestureEndTimer);
    };
  }, [itemCount]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.id !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    ignoreClickRef.current = true;
    changeBook(deltaX < 0 ? 1 : -1);
    window.setTimeout(() => { ignoreClickRef.current = false; }, 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    changeBook(event.key === 'ArrowRight' ? 1 : -1);
  };

  return {
    stageRef,
    selectIndex,
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel: () => { pointerStartRef.current = null; },
    handleKeyDown,
    shouldIgnoreClick: () => ignoreClickRef.current,
  };
}
