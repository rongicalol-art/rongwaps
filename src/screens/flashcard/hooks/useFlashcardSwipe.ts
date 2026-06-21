import { useState, useCallback, useRef } from 'react';

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
  handleNextRef.current = handleNext;
  handleNavigateRef.current = handleNavigate;

  /** Rate card and advance via swipe. Does NOT bump navKey, card springs back. */
  const triggerSwipeRate = useCallback((level: number) => {
    // Defer state update slightly so the drag gesture and snap-back can finish/begin cleanly
    setTimeout(() => {
      handleNextRef.current(level);
    }, 100);
  }, []);

  /** Navigate prev/next. dir is both logical (-1/+1) and animation direction */
  const triggerNav = useCallback((dir: number) => {
    setDirection(dir);
    setNavKey(prev => prev + 1);
    requestAnimationFrame(() => handleNavigateRef.current(dir));
  }, []);

  /** Rate card via keyboard 'm' or 'n'. Bumps navKey so it slides out. */
  const triggerKeyboardRate = useCallback((level: number, animDir: number) => {
    setDirection(animDir);
    setNavKey(prev => prev + 1);
    requestAnimationFrame(() => handleNextRef.current(level));
  }, []);

  return {
    direction,
    navKey,
    triggerSwipeRate,
    triggerKeyboardRate,
    triggerNav,
  };
}