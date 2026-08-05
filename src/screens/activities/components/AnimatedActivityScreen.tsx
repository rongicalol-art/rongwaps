import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

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
  exit: (direction: number) => ({
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
}

export function AnimatedActivityScreen({
  activityKey,
  children,
  direction,
  useSlide = true,
}: AnimatedActivityScreenProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={activityKey}
      custom={useSlide && !reduceMotion ? direction : undefined}
      variants={useSlide && !reduceMotion ? SLIDE_VARIANTS : FADE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={useSlide && !reduceMotion ? undefined : { duration: reduceMotion ? 0 : 0.2 }}
      className="absolute inset-0 h-full w-full will-change-[transform,opacity]"
    >
      {children}
    </motion.div>
  );
}
