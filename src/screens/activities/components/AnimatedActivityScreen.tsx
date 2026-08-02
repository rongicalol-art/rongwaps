import { motion } from 'motion/react';
import type { ReactNode } from 'react';

const SLIDE_VARIANTS = {
  initial: (direction: number) => ({
    x: direction > 0 ? '100%' : '-30%',
    opacity: direction > 0 ? 1 : 0.4,
    zIndex: direction > 0 ? 10 : 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    zIndex: 5,
    transition: { type: 'spring' as const, stiffness: 400, damping: 40 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-30%' : '100%',
    opacity: direction > 0 ? 0.4 : 1,
    zIndex: direction > 0 ? 0 : 10,
    transition: { type: 'spring' as const, stiffness: 400, damping: 40 },
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
  return (
    <motion.div
      key={activityKey}
      custom={useSlide ? direction : undefined}
      variants={useSlide ? SLIDE_VARIANTS : FADE_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={useSlide ? undefined : { duration: 0.2 }}
      className="absolute inset-0 h-full w-full"
    >
      {children}
    </motion.div>
  );
}
