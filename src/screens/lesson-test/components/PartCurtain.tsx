import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import type { LessonTestPart } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { LESSON_TEST_PARTS } from '../../../utils/lesson/lessonTestPlan';

/** Long enough to read the title and the part's one rule. */
const SHOW_MS = 1600;
/** Never held longer than this for the audio download; "Getting audio ready" takes over after. */
const MAX_HOLD_MS = 5000;
const EASE = [0.65, 0, 0.35, 1] as const;

interface PartCurtainProps {
  part: LessonTestPart;
  lessonId: number;
  /** Still getting the part ready (the listening audio downloads): stay up a little longer. */
  holding: boolean;
  /** Lifts the curtain; called again by a tap, Space or Enter (each call is the same "start"). */
  onDone: () => void;
}

/**
 * Each part opens with a gold curtain over the whole test window: the test's name, the parts with the current
 * one lit, and its one rule. It rises from the bottom, holds while the part gets ready, then lifts off the top
 * as the first question rises in (the parent's AnimatePresence plays the exit). Only the panel moves (one
 * transform), so it stays smooth on slow phones; the text inside never animates on its own.
 */
export function PartCurtain({ part, lessonId, holding, onDone }: PartCurtainProps) {
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
  return (
    <motion.div
      data-tone="review"
      role="status"
      onClick={() => done.current()}
      initial={reduceMotion ? false : { y: '100%' }}
      animate={{ y: 0 }}
      exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { y: '-100%' }}
      transition={{ duration: 0.45, ease: EASE }}
      className="absolute inset-0 z-50 flex cursor-pointer select-none flex-col items-center justify-center gap-7 bg-brand-primary px-6 text-center text-brand-on-primary will-change-transform md:gap-8"
    >
      <h1 className="text-4xl font-black leading-tight md:text-6xl">Lesson {lessonId} test</h1>
      <ol className="flex gap-6 md:gap-9">
        {LESSON_TEST_PARTS.map((entry, index) => {
          const lit = index === current;
          return (
            <li key={entry.part} className={cn('flex items-center gap-2.5 text-xl font-black md:text-2xl', !lit && 'opacity-60')}>
              <span
                aria-hidden
                className={cn(
                  'flex size-9 items-center justify-center rounded-xs border-[3px] text-base tabular-nums md:size-11 md:text-lg',
                  lit ? 'border-brand-on-primary bg-brand-on-primary text-brand-primary' : 'border-current',
                )}
              >
                {index < current ? <AppIcon name="check" size={20} /> : index + 1}
              </span>
              {entry.label}
            </li>
          );
        })}
      </ol>
      <p className="text-base font-extrabold opacity-80 md:text-lg">{LESSON_TEST_PARTS[current]?.rule}</p>
    </motion.div>
  );
}
