import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Handles the direction state for swipe/tap animations and provides
 * safe wrappers around the navigation/rating callbacks.
 */
export function useFlashcardSwipe(
  handleNext: (level: number) => void,
  handleNavigate: (dir: number) => void,
  currentIndex?: number,
) {
  // direction: 1 for next/right, -1 for prev/left
  const [direction, setDirection] = useState<number>(1);
  // Refs to avoid stale closures
  const handleNextRef = useRef(handleNext);
  const handleNavigateRef = useRef(handleNavigate);
  const ratePendingRef = useRef(false);
  const navPendingRef = useRef(false);
  const lastRatedIndexRef = useRef<number | null>(null);
  const unlockTimeoutRef = useRef<number | null>(null);
  handleNextRef.current = handleNext;
  handleNavigateRef.current = handleNavigate;

  const unlockRating = useCallback(() => {
    ratePendingRef.current = false;
    lastRatedIndexRef.current = null;
  }, []);

  // When card advances to a new index, immediately release any pending locks
  // so the new card is instantly interactive and never locked out.
  useEffect(() => {
    ratePendingRef.current = false;
    navPendingRef.current = false;
    lastRatedIndexRef.current = null;
    if (unlockTimeoutRef.current !== null) {
      window.clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = null;
    }
  }, [currentIndex]);

  /** Rate a card via horizontal swipe. Returns true if accepted, false if locked. */
  const triggerSwipeRate = useCallback((level: number, animDir?: number): boolean => {
    if (currentIndex !== undefined && lastRatedIndexRef.current === currentIndex) return false;
    if (ratePendingRef.current) return false;
    ratePendingRef.current = true;
    lastRatedIndexRef.current = currentIndex ?? null;
    setDirection(animDir ?? (level <= 2 ? 1 : -1));
    handleNextRef.current(level);
    if (unlockTimeoutRef.current !== null) window.clearTimeout(unlockTimeoutRef.current);
    unlockTimeoutRef.current = window.setTimeout(unlockRating, 60);
    return true;
  }, [currentIndex, unlockRating]);

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
  const triggerKeyboardRate = useCallback((level: number, animDir: number): boolean => {
    if (currentIndex !== undefined && lastRatedIndexRef.current === currentIndex) return false;
    if (ratePendingRef.current) return false;
    ratePendingRef.current = true;
    lastRatedIndexRef.current = currentIndex ?? null;
    setDirection(animDir);
    handleNextRef.current(level);
    if (unlockTimeoutRef.current !== null) window.clearTimeout(unlockTimeoutRef.current);
    unlockTimeoutRef.current = window.setTimeout(unlockRating, 60);
    return true;
  }, [currentIndex, unlockRating]);

  useEffect(() => () => {
    if (unlockTimeoutRef.current !== null) window.clearTimeout(unlockTimeoutRef.current);
  }, []);

  return {
    direction,
    triggerSwipeRate,
    triggerKeyboardRate,
    triggerNav,
  };
}
