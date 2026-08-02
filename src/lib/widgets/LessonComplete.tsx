import { motion, useReducedMotion } from 'motion/react';
import { ActionButton } from './ActionButton';
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
  activeBook,
  onContinue,
  onReviewUnlearned,
  onResetAll
}: LessonCompleteProps) => {
  const reduceMotion = useReducedMotion();
  const hasCardSummary = learnedCount !== undefined || unlearnedCount !== undefined;

  return (
    <div className="absolute inset-0 z-[100] flex h-full w-full items-start justify-center overflow-y-auto overscroll-contain bg-ui-canvas px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:items-center sm:px-6">
      <motion.main
        aria-labelledby="lesson-complete-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
        className="relative my-auto flex w-full max-w-[420px] flex-col items-center"
      >
        <motion.div
          aria-hidden="true"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.75, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 20 }}
          className={`mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 text-white sm:h-28 sm:w-28 ${activeBook?.accentBg || 'bg-brand-primary'} ${activeBook?.accentBorder || 'border-brand-primary-edge'}`}
        >
          <AppIcon name="trophy" size={56} />
        </motion.div>

        <div className="mb-6 w-full text-center">
          <h1 id="lesson-complete-title" className="text-[28px] font-black leading-tight tracking-normal text-ui-ink sm:text-[32px]">
            Session complete
          </h1>
          <p className="mt-2 text-[15px] font-bold text-ui-muted sm:text-base">
            Nice work. Your progress has been saved.
          </p>
        </div>

        {(score !== undefined || accuracy !== undefined || hasCardSummary) && (
          <section aria-label="Session summary" className="mb-6 grid w-full grid-cols-2 gap-3">
            {score !== undefined && (
              <div className="rounded-[18px] border-2 border-ui-border bg-ui-surface px-4 py-3 text-center">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-ui-muted">XP earned</span>
                <span className={`mt-1 block text-[26px] font-black ${activeBook?.accent || 'text-brand-primary'}`}>+{score}</span>
              </div>
            )}
            {accuracy !== undefined && (
              <div className="rounded-[18px] border-2 border-ui-border bg-ui-surface px-4 py-3 text-center">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-ui-muted">Accuracy</span>
                <span className="mt-1 block text-[26px] font-black text-ui-ink">{accuracy}%</span>
              </div>
            )}
            {learnedCount !== undefined && (
              <div className="rounded-[18px] border-2 border-ui-border bg-ui-surface px-4 py-3 text-center">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-ui-muted">Got it</span>
                <span className="mt-1 block text-[26px] font-black text-feedback-success-edge">{learnedCount}</span>
              </div>
            )}
            {unlearnedCount !== undefined && (
              <div className="rounded-[18px] border-2 border-ui-border bg-ui-surface px-4 py-3 text-center">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-ui-muted">Review again</span>
                <span className="mt-1 block text-[26px] font-black text-ui-ink">{unlearnedCount}</span>
              </div>
            )}
          </section>
        )}

        <div className="flex w-full flex-col gap-3">
          {onContinue && (
            <ActionButton size="lg" fullWidth onClick={onContinue}>
              Continue
            </ActionButton>
          )}
          {unlearnedCount !== undefined && unlearnedCount > 0 && onReviewUnlearned && (
            <ActionButton variant="secondary" size="lg" fullWidth onClick={onReviewUnlearned}>
              Review {unlearnedCount} card{unlearnedCount === 1 ? '' : 's'}
            </ActionButton>
          )}
          {onResetAll && (
            <ActionButton variant="quiet" size="lg" fullWidth onClick={onResetAll}>
              Practice all again
            </ActionButton>
          )}
        </div>
      </motion.main>
    </div>
  );
};
