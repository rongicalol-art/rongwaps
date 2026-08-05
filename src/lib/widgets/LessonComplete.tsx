import { motion, useReducedMotion } from 'motion/react';
import { ActionButton } from './ActionButton';
import { IconActionButton } from './IconActionButton';
import { AppIcon } from './AppIcon';

interface LessonCompleteBookStyle {
  accent?: string;
  accentBg?: string;
  accentBorder?: string;
  accentHex?: string;
}

interface LessonCompleteProps {
  score?: number;
  accuracy?: number;
  learnedCount?: number;
  unlearnedCount?: number;
  activeBook?: LessonCompleteBookStyle;
  onContinue?: () => void;
  onReviewUnlearned?: () => void;
  onResetAll?: () => void;
}

export const LessonComplete = ({
  score,
  accuracy,
  learnedCount,
  unlearnedCount,
  onContinue,
  onReviewUnlearned,
  onResetAll
}: LessonCompleteProps) => {
  const reduceMotion = useReducedMotion();
  const hasCardSummary = learnedCount !== undefined || unlearnedCount !== undefined;
  const hasUnlearnedToReview = unlearnedCount !== undefined && unlearnedCount > 0 && Boolean(onReviewUnlearned);

  return (
    <div className="absolute inset-0 z-[100] flex h-full w-full items-center justify-center overflow-y-auto overscroll-contain bg-transparent px-4 pt-14 pb-20 sm:px-6">
      {onContinue && (
        <div className="absolute right-4 top-4 z-[101] sm:right-6 sm:top-6">
          <IconActionButton
            icon={<AppIcon name="close" size={20} />}
            label="Close summary"
            variant="quiet"
            onClick={onContinue}
          />
        </div>
      )}

      <motion.main
        aria-labelledby="lesson-complete-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
        className="relative flex w-full max-w-[380px] sm:max-w-[420px] flex-col items-center rounded-[28px] border-0 border-b-4 border-b-ui-border bg-ui-surface p-6 sm:p-8 text-center"
      >
        <motion.div
          aria-hidden="true"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.75, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 20 }}
          className="mb-2 flex h-16 w-16 items-center justify-center text-amber-400 sm:h-20 sm:w-20"
        >
          <AppIcon name="trophy" size={56} />
        </motion.div>

        <h1 id="lesson-complete-title" className="mb-6 text-2xl sm:text-[28px] font-black leading-tight tracking-tight text-ui-ink">
          Session complete
        </h1>

        {(score !== undefined || accuracy !== undefined || hasCardSummary) && (
          <section aria-label="Session summary" className="mb-6 grid w-full grid-cols-2 gap-3">
            {learnedCount !== undefined && (
              <div className="rounded-[20px] bg-feedback-success/10 px-4 py-4 text-center">
                <span className="block text-xs font-extrabold text-ui-ink/70">Correct</span>
                <span className="mt-1 block text-[34px] font-black leading-none text-feedback-success-edge">{learnedCount}</span>
              </div>
            )}
            {unlearnedCount !== undefined && (
              <div className="rounded-[20px] bg-feedback-danger/10 px-4 py-4 text-center">
                <span className="block text-xs font-extrabold text-ui-ink/70">Review</span>
                <span className="mt-1 block text-[34px] font-black leading-none text-feedback-danger">{unlearnedCount}</span>
              </div>
            )}
            {score !== undefined && learnedCount === undefined && (
              <div className="rounded-[20px] bg-amber-500/10 px-4 py-4 text-center">
                <span className="block text-xs font-extrabold text-ui-ink/70">XP</span>
                <span className="mt-1 block text-[34px] font-black leading-none text-amber-500">+{score}</span>
              </div>
            )}
            {accuracy !== undefined && unlearnedCount === undefined && (
              <div className="rounded-[20px] bg-brand-primary/10 px-4 py-4 text-center">
                <span className="block text-xs font-extrabold text-ui-ink/70">Accuracy</span>
                <span className="mt-1 block text-[34px] font-black leading-none text-brand-primary">{accuracy}%</span>
              </div>
            )}
          </section>
        )}

        <div className="flex w-full flex-col gap-3">
          {hasUnlearnedToReview ? (
            <>
              <ActionButton size="lg" fullWidth onClick={onReviewUnlearned}>
                Review {unlearnedCount} card{unlearnedCount === 1 ? '' : 's'}
              </ActionButton>
              {(onResetAll || onContinue) && (
                <ActionButton variant="quiet" size="lg" fullWidth onClick={onResetAll || onContinue}>
                  Practice all again
                </ActionButton>
              )}
            </>
          ) : (
            (onResetAll || onContinue) && (
              <ActionButton size="lg" fullWidth onClick={onResetAll || onContinue}>
                Practice all again
              </ActionButton>
            )
          )}
        </div>
      </motion.main>
    </div>
  );
};
