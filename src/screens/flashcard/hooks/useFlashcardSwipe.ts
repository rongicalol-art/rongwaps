import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Handles the direction state for swipe/tap animations and provides
 * safe wrappers around the navigation/rating callbacks.
 */
export function useFlashcardSwipe(
  handleNext: (level: number) => void,
  handleNavigate: (dir: number) => void,
) {
  // direction: 1 for next/right, -1 for prev/left
  const [direction, setDirection] = useState<number>(1);
  // Refs to avoid stale closures
  const handleNextRef = useRef(handleNext);
  const handleNavigateRef = useRef(handleNavigate);
  const ratePendingRef = useRef(false);
  const navPendingRef = useRef(false);
  const swipeTimeoutRef = useRef<number | null>(null);
  const unlockTimeoutRef = useRef<number | null>(null);
  const [isRatingPending, setIsRatingPending] = useState(false);
  handleNextRef.current = handleNext;
  handleNavigateRef.current = handleNavigate;

  const unlockRating = useCallback(() => {
    ratePendingRef.current = false;
    setIsRatingPending(false);
  }, []);

  /** Rate a card after its gesture has begun settling. */
  const triggerSwipeRate = useCallback((level: number) => {
    if (ratePendingRef.current) return;
    ratePendingRef.current = true;
    setIsRatingPending(true);
    setDirection(level <= 2 ? 1 : -1);
    // Defer state update slightly so the drag gesture and snap-back can finish/begin cleanly
    swipeTimeoutRef.current = window.setTimeout(() => {
      handleNextRef.current(level);
      unlockTimeoutRef.current = window.setTimeout(unlockRating, 260);
    }, 100);
  }, [unlockRating]);

  /** Navigate prev/next. dir is both logical (-1/+1) and animation direction */
  const triggerNav = useCallback((dir: number) => {
    if (navPendingRef.current || ratePendingRef.current) return;
    navPendingRef.current = true;
    setDirection(dir);
    handleNavigateRef.current(dir);
    window.requestAnimationFrame(() => {
      navPendingRef.current = false;
    });
  }, []);

  /** Rate a card via keyboard with an explicit travel direction. */
  const triggerKeyboardRate = useCallback((level: number, animDir: number) => {
    if (ratePendingRef.current) return;
    ratePendingRef.current = true;
    setIsRatingPending(true);
    setDirection(animDir);
    handleNextRef.current(level);
    unlockTimeoutRef.current = window.setTimeout(unlockRating, 260);
  }, [unlockRating]);

  useEffect(() => () => {
    if (swipeTimeoutRef.current !== null) window.clearTimeout(swipeTimeoutRef.current);
    if (unlockTimeoutRef.current !== null) window.clearTimeout(unlockTimeoutRef.current);
  }, []);

  return {
    direction,
    isRatingPending,
    triggerSwipeRate,
    triggerKeyboardRate,
    triggerNav,
  };
}
