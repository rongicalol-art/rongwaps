import { motion, useReducedMotion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

const SLIDE_VARIANTS = {
  initial: (direction: number) => ({
    x: direction > 0 ? 28 : -28,
    opacity: 0,
    scale: 0.992,
    zIndex: 10,
  }),
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    zIndex: 5,
    transition: { type: 'spring' as const, stiffness: 380, damping: 38, mass: 0.82 },
  },
  // 'instant' (Cards done -> quiz): the outgoing screen is already empty, so it just goes.
  exit: (direction: number | 'instant') => direction === 'instant' ? { opacity: 0, transition: { duration: 0 } } : ({
    x: direction > 0 ? -22 : 22,
    opacity: 0,
    scale: 0.992,
    zIndex: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 38, mass: 0.82 },
  }),
};

const FADE_VARIANTS = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

interface AnimatedActivityScreenProps {
  activityKey: string;
  children: ReactNode;
  direction: number;
  useSlide?: boolean;
  className?: string;
  /** Activity key the session opened with: that screen's first mount has no entrance. */
  skipEnter?: string | null;
  /** Enter with no motion (the previous screen leaves instantly too; see ActivityScreens). */
  instant?: boolean;
}

export function AnimatedActivityScreen({
  activityKey,
  children,
  direction,
  useSlide = true,
  className,
  skipEnter = null,
  instant = false,
}: AnimatedActivityScreenProps) {
  // Read once at mount.
  const [enterInstantly] = useState(instant || skipEnter === activityKey);
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={activityKey}
      custom={useSlide && !reduceMotion ? direction : undefined}
      variants={useSlide && !reduceMotion ? SLIDE_VARIANTS : FADE_VARIANTS}
      initial={enterInstantly ? false : 'initial'}
      animate="animate"
      exit="exit"
      transition={useSlide && !reduceMotion ? undefined : { duration: reduceMotion ? 0 : 0.2 }}
      className={cn('absolute inset-0', className)}
    >
      {children}
    </motion.div>
  );
}
