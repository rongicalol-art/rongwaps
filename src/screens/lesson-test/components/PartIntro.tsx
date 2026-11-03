import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { ActionButton, LottiePlayer } from '../../../lib/widgets';
import type { AudioPreloadProgress } from '../../../services/audio/audioCache';
import type { LessonTestPart } from '../../../types/lessonTest';
import { LESSON_TEST_PARTS } from '../../../utils/lesson/lessonTestPlan';

/** Long enough to read the title and see the rocket fly. */
const SHOW_MS = 1600;
const SETTLE = [0.16, 1, 0.3, 1] as const;

const loadRocket = () => import('../../../assets/animations/rocket.json').then((m) => m.default);

// The rocket's nose points up and right, so it flies in from the lower left.
const rocket: Variants = {
  hidden: { x: '-38vw', y: '32vh', scale: 0.55, opacity: 0 },
  shown: { x: 0, y: 0, scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 110, damping: 15, mass: 0.9, opacity: { duration: 0.15 } } },
};
const rise = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { delay, duration: 0.45, ease: SETTLE } },
});
const title: Variants = {
  hidden: { opacity: 0, scale: 0.86 },
  shown: { opacity: 1, scale: 1, transition: { delay: 0.22, type: 'spring', stiffness: 320, damping: 20 } },
};
// The intro leaves as one plain fade, everything in place.
const frame: Variants = { hidden: {}, shown: {}, gone: { opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } } };
const stillFrame: Variants = { ...frame, gone: { opacity: 0, transition: { duration: 0 } } };
const still: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1 } };

/** The test's recordings downloading: the intro stays (the rocket keeps flying) until they're ready. */
export interface PartIntroLoading {
  progress: AudioPreloadProgress | null;
  error: boolean;
  onRetry: () => void;
  onBack: () => void;
}

interface PartIntroProps {
  part: LessonTestPart;
  lessonId: number;
  /** Set while the audio downloads: the intro is the loading screen, and a tap can't skip it. */
  loading: PartIntroLoading | null;
  /** Starts the part; called again by a tap, Space or Enter (each call is the same "start"). */
  onDone: () => void;
}

/** Shown once the intro has had its time and the audio still isn't ready: a bar, or Try again. */
function AudioWait({ loading }: { loading: PartIntroLoading }) {
  if (loading.error) {
    return (
      <div className="mt-8 flex w-full max-w-xs flex-col items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <p className="mb-2 text-lg font-black text-ui-ink-strong">Audio couldn’t load</p>
        <ActionButton size="lg" fullWidth onClick={loading.onRetry}>Try again</ActionButton>
        <ActionButton variant="secondary" size="lg" fullWidth edgeColor="var(--color-ui-border)" onClick={loading.onBack}>Back</ActionButton>
      </div>
    );
  }
  const { ready = 0, total = 0 } = loading.progress ?? {};
  const percent = total ? Math.round((ready / total) * 100) : 0;
  return (
    <div role="progressbar" aria-label="Getting audio ready" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="mt-8 h-2.5 w-56 overflow-hidden rounded-full bg-brand-primary-track">
      <div className="h-full rounded-full bg-brand-primary transition-[width] duration-300 ease-out" style={{ width: `${Math.max(percent, 4)}%` }} />
    </div>
  );
}

/**
 * Each part opens on the test's own canvas, under its header: the rocket flies in and keeps drifting, "Lesson N
 * test" pops, and the part's name rises under it. While the recordings download it is also the loading screen
 * (a bar, or Try again, once it has had its time); when they're ready, the whole intro fades out in place as
 * the first question rises in (the parent's AnimatePresence plays the exit). Only transforms and opacity move, so slow phones keep up.
 */
export function PartIntro({ part, lessonId, loading, onDone }: PartIntroProps) {
  const reduceMotion = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  const [shownLong, setShownLong] = useState(false);

  useEffect(() => {
    const shown = window.setTimeout(() => setShownLong(true), SHOW_MS);
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      done.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(shown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  useEffect(() => {
    if (shownLong && !loading) done.current();
  }, [shownLong, loading]);

  const pick = (variants: Variants) => (reduceMotion ? still : variants);
  return (
    <motion.div
      role="status"
      onClick={() => done.current()}
      variants={reduceMotion ? stillFrame : frame}
      initial="hidden"
      animate="shown"
      exit="gone"
      className="absolute inset-0 z-10 flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden px-6 pb-24 text-center"
    >
      <motion.div aria-hidden variants={pick(rocket)} className="mb-2 size-36 will-change-transform md:size-44">
        {/* The drift is a CSS animation (rw-rocket-drift), so it runs off the main thread. */}
        <div className="rw-rocket-drift size-full">
          <LottiePlayer loadAnimationData={loadRocket} loop autoplay />
        </div>
      </motion.div>
      <motion.h1 variants={pick(title)} className="text-4xl font-black leading-tight text-ui-ink-strong md:text-6xl">
        Lesson {lessonId} test
      </motion.h1>
      <motion.div variants={pick(rise(0.36))} className="relative mt-3">
        <p className="text-xl font-black text-ui-muted-strong md:text-2xl">{LESSON_TEST_PARTS.find((entry) => entry.part === part)?.label}</p>
        {/* Hangs below the part's name, so the title and rocket never move when it appears. */}
        {loading && shownLong && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute left-1/2 top-full flex w-80 -translate-x-1/2 justify-center"
          >
            <AudioWait loading={loading} />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
