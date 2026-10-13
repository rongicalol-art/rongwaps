import type { TargetAndTransition, Transition } from 'motion/react';

/** Routine windows use one short fade, without travel or scaling. */
export type WindowMotionStyle = 'sheet' | 'focus' | 'pop' | 'rise';

export interface WindowMotion {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

const WINDOW_FADE: WindowMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12, ease: 'easeOut' },
};

export const WINDOW_MOTION: Record<WindowMotionStyle, WindowMotion> = {
  sheet: WINDOW_FADE,
  focus: WINDOW_FADE,
  pop: WINDOW_FADE,
  rise: WINDOW_FADE,
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
