import { Fragment, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { AppIcon, LottiePlayer } from '../../../lib/widgets';
import type { LessonTestPart } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { LESSON_TEST_PARTS } from '../../../utils/lesson/lessonTestPlan';

/** Long enough to read the title and the part's one rule. */
const SHOW_MS = 1600;
/** Never held longer than this for the audio download; "Getting audio ready" takes over after. */
const MAX_HOLD_MS = 5000;
const SETTLE = [0.16, 1, 0.3, 1] as const;
const LAUNCH = [0.55, 0, 0.75, 0.2] as const;

const loadRocket = () => import('../../../assets/animations/rocket.json').then((m) => m.default);

// The rocket's nose points up and right, so it flies in from the lower left and leaves off the upper right.
const rocket: Variants = {
  hidden: { x: '-38vw', y: '32vh', scale: 0.55, opacity: 0 },
  shown: { x: 0, y: 0, scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 15, mass: 0.9, opacity: { duration: 0.15 } } },
  gone: { x: '48vw', y: '-62vh', scale: 0.7, transition: { duration: 0.5, ease: LAUNCH } },
};
const rise = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { delay, duration: 0.45, ease: SETTLE } },
  gone: { opacity: 0, y: -18, transition: { delay: 0.06, duration: 0.22, ease: 'easeIn' } },
});
const title: Variants = {
  hidden: { opacity: 0, scale: 0.86 },
  shown: { opacity: 1, scale: 1, transition: { delay: 0.22, type: 'spring', stiffness: 320, damping: 20 } },
  gone: { opacity: 0, y: -18, transition: { duration: 0.22, ease: 'easeIn' } },
};
// The whole intro stays until the rocket has left.
const frame: Variants = { hidden: {}, shown: {}, gone: { transition: { when: 'afterChildren' } } };
const still: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1 }, gone: { opacity: 0, transition: { duration: 0 } } };

interface PartIntroProps {
  part: LessonTestPart;
  lessonId: number;
  /** Still getting the part ready (the listening audio downloads): stay a little longer. */
  holding: boolean;
  /** Starts the part; called again by a tap, Space or Enter (each call is the same "start"). */
  onDone: () => void;
}

/**
 * Each part opens on the test's own canvas, under its header: the rocket flies in, "Lesson N test" pops,
 * the parts show with the current one lit, and its one rule. It holds while the part gets ready, then the
 * rocket blasts off the top right and the words lift away as the first question rises in (the parent's
 * AnimatePresence plays the exit). Only transforms and opacity move, so slow phones keep up.
 */
export function PartIntro({ part, lessonId, holding, onDone }: PartIntroProps) {
  const reduceMotion = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  const [shownLong, setShownLong] = useState(false);

  useEffect(() => {
    const shown = window.setTimeout(() => setShownLong(true), SHOW_MS);
    const maxHold = window.setTimeout(() => done.current(), MAX_HOLD_MS);
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      done.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(shown);
      window.clearTimeout(maxHold);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  useEffect(() => {
    if (shownLong && !holding) done.current();
  }, [shownLong, holding]);

  const current = LESSON_TEST_PARTS.findIndex((entry) => entry.part === part);
  const pick = (variants: Variants) => (reduceMotion ? still : variants);
  return (
    <motion.div
      role="status"
      onClick={() => done.current()}
      variants={frame}
      initial="hidden"
      animate="shown"
      exit="gone"
      className="absolute inset-0 z-10 flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden px-6 pb-24 text-center"
    >
      <motion.div aria-hidden variants={pick(rocket)} className="mb-2 size-36 will-change-transform md:size-44">
        <LottiePlayer loadAnimationData={loadRocket} loop autoplay />
      </motion.div>
      <motion.h1 variants={pick(title)} className="text-4xl font-black leading-tight text-ui-ink-strong md:text-6xl">
        Lesson {lessonId} test
      </motion.h1>
      <motion.p variants={pick(rise(0.36))} className="mt-5 flex items-center gap-3 text-xl font-black md:gap-4 md:text-2xl">
        {LESSON_TEST_PARTS.map((entry, index) => (
          <Fragment key={entry.part}>
            {index > 0 && <span aria-hidden className="text-ui-border">·</span>}
            <span className={cn('inline-flex items-center gap-1.5', index === current ? 'text-ui-ink-strong' : 'text-ui-muted')}>
              {index < current && <AppIcon name="check" size={20} className="text-brand-primary-text" />}
              {entry.label}
            </span>
          </Fragment>
        ))}
      </motion.p>
      <motion.p variants={pick(rise(0.46))} className="mt-3 text-base font-bold text-ui-muted-strong md:text-lg">
        {LESSON_TEST_PARTS[current]?.rule}
      </motion.p>
    </motion.div>
  );
}
