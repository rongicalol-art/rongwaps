import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';

interface LessonCompleteProps {
  accuracy?: number;
  learnedCount?: number;
  unlearnedCount?: number;
  onContinue?: () => void;
  onReviewUnlearned?: () => void;
  onResetAll?: () => void;
  continueLabel?: string;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
  shape: 'rect' | 'circle';
}

const CONFETTI_PIECES: ConfettiParticle[] = [
  { id: 1, x: -115, y: -80, rotation: 45, color: '#1cb0f6', size: 8, delay: 0.04, shape: 'rect' },
  { id: 2, x: 115, y: -75, rotation: -30, color: '#ff9600', size: 9, delay: 0.08, shape: 'circle' },
  { id: 3, x: -85, y: -140, rotation: 60, color: '#58cc02', size: 8, delay: 0.12, shape: 'rect' },
  { id: 4, x: 90, y: -130, rotation: -45, color: '#ffc800', size: 9, delay: 0.06, shape: 'rect' },
  { id: 5, x: -135, y: 15, rotation: 25, color: '#ff4b4b', size: 7, delay: 0.14, shape: 'circle' },
  { id: 6, x: 135, y: 20, rotation: -20, color: '#1cb0f6', size: 8, delay: 0.1, shape: 'rect' },
  { id: 7, x: -50, y: -160, rotation: 80, color: '#ff9600', size: 8, delay: 0.15, shape: 'circle' },
  { id: 8, x: 55, y: -155, rotation: -60, color: '#58cc02', size: 9, delay: 0.09, shape: 'rect' },
  { id: 9, x: -125, y: 90, rotation: 35, color: '#ffc800', size: 7, delay: 0.17, shape: 'rect' },
  { id: 10, x: 120, y: 95, rotation: -40, color: '#58cc02', size: 8, delay: 0.13, shape: 'circle' },
  { id: 11, x: -25, y: -175, rotation: 15, color: '#1cb0f6', size: 8, delay: 0.11, shape: 'rect' },
  { id: 12, x: 30, y: -170, rotation: -10, color: '#ff9600', size: 8, delay: 0.12, shape: 'rect' },
];

export const LessonComplete = ({
  accuracy,
  learnedCount,
  unlearnedCount,
  onContinue,
  onReviewUnlearned,
  onResetAll,
  continueLabel = 'Continue',
}: LessonCompleteProps) => {
  const reduceMotion = useReducedMotion();
  const primaryAction = onContinue ?? onResetAll;
  const hasUnlearnedToReview =
    unlearnedCount !== undefined && unlearnedCount > 0 && Boolean(onReviewUnlearned);

  const isCardSession = learnedCount !== undefined;
  const totalCards = isCardSession ? (learnedCount ?? 0) + (unlearnedCount ?? 0) : 0;
  const safeTotal = totalCards > 0 ? totalCards : 1;
  const learnedRatio = isCardSession ? (learnedCount ?? 0) / safeTotal : 0;
  const unlearnedRatio = isCardSession ? (unlearnedCount ?? 0) / safeTotal : 0;
  const cardMasteryPct = Math.round(learnedRatio * 100);

  const isQuiz = !isCardSession && accuracy !== undefined;
  const quizAccuracyRatio = isQuiz ? Math.min(100, Math.max(0, accuracy ?? 0)) / 100 : 0;

  const displayPct = isCardSession ? cardMasteryPct : (accuracy ?? 100);
  const isFlawless = isCardSession
    ? (unlearnedCount === 0 && totalCards > 0)
    : ((accuracy ?? 0) >= 100);

  // Animated percentage counter
  const [animatedPct, setAnimatedPct] = useState(reduceMotion ? displayPct : 0);

  useEffect(() => {
    if (reduceMotion) {
      setAnimatedPct(displayPct);
      return;
    }
    const duration = 750;
    const startTime = performance.now();

    let frameId: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPct(Math.round(eased * displayPct));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    const timer = setTimeout(() => {
      frameId = requestAnimationFrame(step);
    }, 120);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
    };
  }, [displayPct, reduceMotion]);

  // SVG Ring geometry
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const hasBothCardSegments = totalCards > 1 && (learnedCount ?? 0) > 0 && (unlearnedCount ?? 0) > 0;
  const segmentGap = hasBothCardSegments ? 5 : 0;

  const learnedStrokeLength = Math.max(0, learnedRatio * circumference - segmentGap);
  const unlearnedStrokeLength = Math.max(0, unlearnedRatio * circumference - segmentGap);
  const quizStrokeLength = quizAccuracyRatio * circumference;

  return (
    <div className="absolute inset-0 z-[100] flex h-full w-full items-center justify-center overflow-y-auto overscroll-contain bg-ui-practice-canvas/80 backdrop-blur-sm px-4 pt-14 pb-24 sm:px-6 sm:pt-16 sm:pb-28">
      <motion.main
        aria-labelledby="lesson-complete-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative my-auto flex w-full max-w-[360px] sm:max-w-[380px] flex-col items-center rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-6 sm:p-7 text-center overflow-visible"
      >
        {/* Playful Confetti Burst on Mount */}
        {!reduceMotion && (
          <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
            {CONFETTI_PIECES.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.2, 1, 0.6],
                  x: p.x,
                  y: p.y,
                  rotate: p.rotation,
                }}
                transition={{
                  duration: 1.3,
                  delay: p.delay,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  position: 'absolute',
                  top: '20%',
                  left: '50%',
                  width: p.size,
                  height: p.shape === 'rect' ? p.size * 1.5 : p.size,
                  backgroundColor: p.color,
                  borderRadius: p.shape === 'circle' ? '9999px' : '3px',
                }}
              />
            ))}
          </div>
        )}

        {/* Title with inline celebratory icon */}
        <motion.h1
          id="lesson-complete-title"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, delay: 0.08 }}
          className="inline-flex items-center justify-center gap-2 text-2xl sm:text-[26px] font-black tracking-tight text-ui-ink-strong"
        >
          <AppIcon
            name={isFlawless ? 'trophy' : 'sparkles'}
            size={24}
            className={isFlawless ? 'text-feedback-warning shrink-0' : 'text-brand-primary shrink-0'}
          />
          <span>{isFlawless ? 'Flawless Round!' : 'Round Complete'}</span>
        </motion.h1>

        {/* Minimal Gauge with inner canvas disc */}
        <div className="relative my-5 flex items-center justify-center">
          <svg
            width="148"
            height="148"
            viewBox="0 0 148 148"
            className="overflow-visible"
            aria-label={`Score: ${displayPct}%`}
            role="img"
          >
            {/* Soft inner canvas disc */}
            <circle
              cx="74"
              cy="74"
              r={radius - 6}
              className="fill-ui-canvas/50"
            />

            {/* Background track circle */}
            <circle
              cx="74"
              cy="74"
              r={radius}
              fill="none"
              strokeWidth="11"
              className="stroke-ui-border/40"
            />

            {/* Card session: Learned arc */}
            {isCardSession && (learnedCount ?? 0) > 0 && (
              <motion.circle
                cx="74"
                cy="74"
                r={radius}
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
                className={isFlawless ? 'stroke-feedback-success' : 'stroke-brand-primary'}
                strokeDasharray={`${learnedStrokeLength} ${circumference}`}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }
                }
                transform="rotate(-90 74 74)"
              />
            )}

            {/* Card session: Mistakes/Unlearned arc */}
            {isCardSession && (unlearnedCount ?? 0) > 0 && (
              <motion.circle
                cx="74"
                cy="74"
                r={radius}
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
                className="stroke-brand-secondary"
                strokeDasharray={`${unlearnedStrokeLength} ${circumference}`}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }
                }
                transform={`rotate(${-90 + learnedRatio * 360} 74 74)`}
              />
            )}

            {/* Quiz session: Accuracy arc */}
            {isQuiz && (
              <motion.circle
                cx="74"
                cy="74"
                r={radius}
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
                className={isFlawless ? 'stroke-feedback-success' : 'stroke-brand-primary'}
                strokeDasharray={`${quizStrokeLength} ${circumference}`}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }
                }
                transform="rotate(-90 74 74)"
              />
            )}
          </svg>

          {/* Inside the pie: animated percentage + small label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-ui-ink-strong leading-none">
              {animatedPct}%
            </span>
            <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-ui-muted-strong">
              {isCardSession ? 'Mastery' : 'Accuracy'}
            </span>
          </div>
        </div>

        {/* Structured Metric Chips Beneath the Gauge */}
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, delay: 0.15 }}
          className="flex flex-col items-center justify-center gap-1.5"
        >
          {isCardSession && (
            <>
              {totalCards === 0 ? (
                <div className="inline-flex items-center gap-1.5 rounded-control bg-ui-canvas border-b-[length:var(--depth-sm)] border-ui-border px-3.5 py-1.5 text-xs font-black text-ui-muted">
                  <span>0 Cards Studied</span>
                </div>
              ) : isFlawless ? (
                <div className="inline-flex items-center gap-2 rounded-control bg-feedback-success-surface border-b-[length:var(--depth-sm)] border-feedback-success-edge/40 px-4 py-1.5 text-xs font-black text-feedback-success-edge">
                  <AppIcon name="sparkles" size={14} className="text-feedback-success" />
                  <span>All {totalCards} Cards Mastered!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-control bg-brand-primary-soft border-b-[length:var(--depth-sm)] border-brand-primary-soft-edge px-3 py-1.5 text-xs font-black text-brand-primary-deep">
                    <AppIcon name="check" size={13} className="text-brand-primary" />
                    <span>{learnedCount} Learned</span>
                  </div>
                  {unlearnedCount !== undefined && unlearnedCount > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-control bg-brand-secondary/15 border-b-[length:var(--depth-sm)] border-brand-secondary-edge/30 px-3 py-1.5 text-xs font-black text-brand-secondary-edge">
                      <AppIcon name="restart" size={13} className="text-brand-secondary" />
                      <span>{unlearnedCount} To Review</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {isQuiz && (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-control bg-brand-primary-soft border-b-[length:var(--depth-sm)] border-brand-primary-soft-edge px-3.5 py-1.5 text-xs font-black text-brand-primary-deep">
                <AppIcon name="target" size={13} className="text-brand-primary" />
                <span>{accuracy}% Accuracy</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, delay: 0.22 }}
          className="mt-6 flex w-full flex-col gap-2.5"
        >
          {hasUnlearnedToReview ? (
            <>
              <ActionButton size="lg" fullWidth onClick={onReviewUnlearned} className="rounded-control">
                Review {unlearnedCount} {unlearnedCount === 1 ? 'card' : 'cards'}
              </ActionButton>
              {primaryAction && (
                <ActionButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={primaryAction}
                  className="rounded-control bg-ui-canvas hover:bg-ui-hover text-ui-ink-strong border-b-[length:var(--depth-lg)] border-ui-border active:translate-y-[length:var(--depth-lg)] active:border-b-0"
                >
                  {continueLabel}
                </ActionButton>
              )}
            </>
          ) : (
            primaryAction && (
              <ActionButton size="lg" fullWidth onClick={primaryAction} className="rounded-control">
                {continueLabel}
              </ActionButton>
            )
          )}
          {onResetAll && (
            <button
              type="button"
              onClick={onResetAll}
              className="w-full py-2 text-center text-base font-extrabold text-ui-muted-strong hover:text-ui-ink active:text-ui-ink transition-colors outline-none focus-ring rounded-control"
            >
              Practice all again
            </button>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
};
