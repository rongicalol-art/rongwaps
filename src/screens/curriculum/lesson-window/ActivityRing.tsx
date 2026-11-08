import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';

const RADIUS = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * An activity's progress at the end of its row: a thin ring in the book colour that fills as the
 * learner goes, and turns into a check once the activity is done.
 */
export function ActivityRing({ fraction, label, className }: { fraction: number; label: string; className?: string }) {
  const reduce = useReducedMotion();
  const done = fraction >= 1;
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <span role="img" aria-label={done ? `${label} done` : `${label} ${percent}% done`} className={cn('relative grid size-7 shrink-0 place-items-center', className)}>
      <AnimatePresence initial={false} mode="popLayout">
        {done ? (
          <motion.svg
            key="check"
            viewBox="0 0 24 24"
            fill="none"
            className="size-7 text-brand-primary"
            initial={reduce ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
          >
            <path d="M5.5 12.5l4.2 4.2L18.5 8" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        ) : (
          <motion.svg
            key="ring"
            viewBox="0 0 28 28"
            className="size-7 -rotate-90"
            exit={reduce ? undefined : { scale: 0.6, opacity: 0, transition: { duration: 0.12 } }}
          >
            <circle cx="14" cy="14" r={RADIUS} fill="none" strokeWidth={3.2} className="stroke-brand-primary-track" />
            {fraction > 0 && (
              <circle
                cx="14"
                cy="14"
                r={RADIUS}
                fill="none"
                strokeWidth={3.2}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
                className="stroke-brand-primary transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
              />
            )}
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  );
}
