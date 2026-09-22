import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { ConfettiBurst, ScoreGauge } from './lesson-complete';

export interface LessonCompleteProps {
  accuracy?: number;
  learnedCount?: number;
  unlearnedCount?: number;
  onContinue?: () => void;
  onReviewUnlearned?: () => void;
  onResetAll?: () => void;
  continueLabel?: string;
}

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
    ? unlearnedCount === 0 && totalCards > 0
    : (accuracy ?? 0) >= 100;

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

  return (
    <div className="absolute inset-0 z-content flex h-full w-full items-center justify-center overflow-y-auto overscroll-contain bg-ui-practice-canvas/80 backdrop-blur-sm px-4 pt-14 pb-dock-clearance sm:px-6 sm:pt-16">
      <motion.main
        aria-labelledby="lesson-complete-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative my-auto flex w-full max-w-[360px] sm:max-w-[380px] flex-col items-center rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-6 sm:p-7 text-center overflow-visible"
      >
        {/* Playful Confetti Burst on Mount */}
        {!reduceMotion && <ConfettiBurst />}

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
            className={
              isFlawless ? 'text-feedback-warning shrink-0' : 'text-brand-primary shrink-0'
            }
          />
          <span>{isFlawless ? 'Flawless Round!' : 'Round Complete'}</span>
        </motion.h1>

        {/* Minimal Gauge with inner canvas disc */}
        <ScoreGauge
          displayPct={displayPct}
          animatedPct={animatedPct}
          isCardSession={isCardSession}
          isFlawless={isFlawless}
          isQuiz={isQuiz}
          learnedCount={learnedCount}
          unlearnedCount={unlearnedCount}
          learnedRatio={learnedRatio}
          unlearnedRatio={unlearnedRatio}
          quizAccuracyRatio={quizAccuracyRatio}
          reduceMotion={reduceMotion}
        />

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
              <ActionButton
                size="lg"
                fullWidth
                onClick={onReviewUnlearned}
                className="rounded-control btn-touch-primary text-base font-extrabold"
              >
                Review {unlearnedCount} {unlearnedCount === 1 ? 'card' : 'cards'}
              </ActionButton>
              {primaryAction && (
                <ActionButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={primaryAction}
                  className="rounded-control btn-touch-primary text-base font-extrabold"
                >
                  {continueLabel}
                </ActionButton>
              )}
            </>
          ) : (
            primaryAction && (
              <ActionButton
                size="lg"
                fullWidth
                onClick={primaryAction}
                className="rounded-control btn-touch-primary text-base font-extrabold"
              >
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
