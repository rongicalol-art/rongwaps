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
  // navKey only increments for tap/keyboard navigation, triggering AnimatePresence.
  // Swipes don't increment this, so the card stays mounted and springs back naturally.
  const [navKey, setNavKey] = useState<number>(0);

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

  /** Rate card and advance via swipe. Does NOT bump navKey, card springs back. */
  const triggerSwipeRate = useCallback((level: number) => {
    if (ratePendingRef.current) return;
    ratePendingRef.current = true;
    setIsRatingPending(true);
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
    setNavKey(prev => prev + 1);
    window.requestAnimationFrame(() => {
      handleNavigateRef.current(dir);
      window.requestAnimationFrame(() => {
        navPendingRef.current = false;
      });
    });
  }, []);

  /** Rate card via keyboard 'm' or 'n'. Bumps navKey so it slides out. */
  const triggerKeyboardRate = useCallback((level: number, animDir: number) => {
    if (ratePendingRef.current) return;
    ratePendingRef.current = true;
    setIsRatingPending(true);
    setDirection(animDir);
    setNavKey(prev => prev + 1);
    window.requestAnimationFrame(() => {
      handleNextRef.current(level);
      unlockTimeoutRef.current = window.setTimeout(unlockRating, 260);
    });
  }, [unlockRating]);

  useEffect(() => () => {
    if (swipeTimeoutRef.current !== null) window.clearTimeout(swipeTimeoutRef.current);
    if (unlockTimeoutRef.current !== null) window.clearTimeout(unlockTimeoutRef.current);
  }, []);

  return {
    direction,
    navKey,
    isRatingPending,
    triggerSwipeRate,
    triggerKeyboardRate,
    triggerNav,
  };
}
