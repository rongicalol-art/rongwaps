import type { TargetAndTransition, Transition } from 'motion/react';

/**
 * The one owner of window open/close motion. A window names a style that fits
 * what it is; nothing else sets durations or easings for a window.
 *
 * - `sheet`: a hub page opened from a list (lesson window) rises from the bottom edge.
 * - `focus`: immersive study (Reader, Grammar) fades in with a slight settle; no
 *   travel, because heavy canvases mount inside and sliding them janks.
 * - `pop`: quick transient details (dictionary word, character breakdown).
 * - `rise`: a practice activity takes the screen: short expo-out tween, no spring wobble.
 */
export type WindowMotionStyle = 'sheet' | 'focus' | 'pop' | 'rise';

export interface WindowMotion {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const WINDOW_MOTION: Record<WindowMotionStyle, WindowMotion> = {
  sheet: {
    initial: { opacity: 0, y: '100%' },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: '100%' },
    transition: { duration: 0.42, ease: EASE_OUT_EXPO },
  },
  focus: {
    initial: { opacity: 0, scale: 0.985 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.99 },
    transition: { duration: 0.28, ease: EASE_OUT_EXPO },
  },
  pop: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  rise: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 16 },
    transition: { duration: 0.26, ease: EASE_OUT_EXPO },
  },
};

/** Reduced motion: a plain, instant cross-fade for every style. */
export const REDUCED_WINDOW_MOTION: WindowMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0 },
};

export function getWindowMotion(style: WindowMotionStyle, reduceMotion: boolean | null): WindowMotion {
  return reduceMotion ? REDUCED_WINDOW_MOTION : WINDOW_MOTION[style];
}
