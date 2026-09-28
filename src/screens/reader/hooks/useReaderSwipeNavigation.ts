import { useRef } from 'react';
import type { TouchEvent } from 'react';

interface ReaderSwipeNavigationOptions {
  onNext: () => void;
  onPrevious: () => void;
}

/** Touch swipe gestures for previous / next dialogue. */
export function useReaderSwipeNavigation({ onNext, onPrevious }: ReaderSwipeNavigationOptions) {
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(diffX) > 80 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0) {
        onPrevious();
      } else {
        onNext();
      }
    }
  };

  return { handleTouchStart, handleTouchEnd };
}
