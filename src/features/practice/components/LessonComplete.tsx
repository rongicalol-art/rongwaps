import { motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';

interface LessonCompleteProps {
  score?: number;
  accuracy?: number;
  learnedCount?: number;
  unlearnedCount?: number;
  onContinue?: () => void;
  onReviewUnlearned?: () => void;
  onResetAll?: () => void;
}

interface CompleteStat {
  label: string;
  value: string;
  tileClass: string;
  valueClass: string;
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
  const primaryAction = onContinue ?? onResetAll;
  const hasUnlearnedToReview = unlearnedCount !== undefined && unlearnedCount > 0 && Boolean(onReviewUnlearned);

  const stats: CompleteStat[] = [];
  if (learnedCount !== undefined) {
    stats.push({
      label: 'Learned',
      value: String(learnedCount),
      tileClass: 'bg-brand-primary/10',
      valueClass: 'text-brand-primary-deep',
    });
  }
  if (unlearnedCount !== undefined) {
    stats.push({
      label: 'To review',
      value: String(unlearnedCount),
      tileClass: 'bg-brand-secondary/15',
      valueClass: 'text-brand-secondary-edge',
    });
  }
  if (score !== undefined && learnedCount === undefined) {
    stats.push({
      label: 'XP earned',
      value: `+${score}`,
      tileClass: 'bg-brand-secondary/15',
      valueClass: 'text-brand-secondary-edge',
    });
  }
  if (accuracy !== undefined && unlearnedCount === undefined) {
    stats.push({
      label: 'Accuracy',
      value: `${accuracy}%`,
      tileClass: 'bg-brand-primary/10',
      valueClass: 'text-brand-primary-deep',
    });
  }

  let encouragement = 'Great job — see you next session!';
  if (learnedCount !== undefined) {
    encouragement = unlearnedCount === 0
      ? 'Perfect round — every word locked in!'
      : 'Nice work — a few words want another pass.';
  } else if (accuracy !== undefined) {
    encouragement = accuracy >= 100 ? 'Flawless round — you nailed it!' : 'Nice round — keep it up!';
  }

  const rise = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : delay, ease: 'easeOut' as const },
  });

  const sparkleTransition = (delay: number) =>
    reduceMotion
      ? { duration: 0 }
      : { repeat: Infinity, duration: 1.8, delay, ease: 'easeInOut' as const };

  return (
    <div className="absolute inset-0 z-[100] flex h-full w-full items-center justify-center overflow-y-auto overscroll-contain bg-ui-canvas/70 px-4 pb-16 pt-12 backdrop-blur-[2px] sm:px-6">
      <motion.main
        aria-labelledby="lesson-complete-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
        className="relative flex w-full max-w-[380px] flex-col items-center rounded-[28px] border border-ui-border border-b-4 border-b-ui-border bg-ui-surface p-6 text-center sm:max-w-[420px] sm:p-8"
      >
        <motion.div aria-hidden="true" className="relative mb-5" {...rise(0.05)}>
          <motion.div
            initial={reduceMotion ? { scale: 1 } : { scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 16 }}
            className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-brand-secondary/15 sm:h-[104px] sm:w-[104px]"
          >
            <AppIcon name="trophy" size={52} className="text-brand-secondary" />
          </motion.div>
          <motion.span
            className="absolute -left-2 top-2 text-brand-primary"
            animate={reduceMotion ? {} : { scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={sparkleTransition(0.3)}
          >
            <AppIcon name="sparkles" size={18} />
          </motion.span>
          <motion.span
            className="absolute -right-3 top-8 text-feedback-warning"
            animate={reduceMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={sparkleTransition(0.9)}
          >
            <AppIcon name="sparkles" size={24} />
          </motion.span>
        </motion.div>

        <motion.h1
          id="lesson-complete-title"
          {...rise(0.12)}
          className="font-black leading-tight tracking-tight text-ui-ink-strong text-[28px] sm:text-[32px]"
        >
          Session complete!
        </motion.h1>

        <motion.p {...rise(0.16)} className="mt-2 max-w-[280px] text-[15px] font-bold text-ui-muted-strong">
          {encouragement}
        </motion.p>

        {stats.length > 0 && (
          <motion.section {...rise(0.22)} aria-label="Session summary" className="mt-6 grid w-full grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-[20px] px-4 py-4 text-center ${stat.tileClass}`}>
                <span className="block text-xs font-extrabold text-ui-muted-strong">{stat.label}</span>
                <span className={`mt-1 block font-black leading-none text-[34px] ${stat.valueClass}`}>{stat.value}</span>
              </div>
            ))}
          </motion.section>
        )}

        <motion.div {...rise(0.26)} className="mt-6 flex w-full flex-col gap-3">
          {primaryAction && (
            <ActionButton size="lg" fullWidth onClick={primaryAction}>
              Continue
            </ActionButton>
          )}
          {hasUnlearnedToReview && (
            <ActionButton variant="secondary" size="lg" fullWidth onClick={onReviewUnlearned}>
              Review {unlearnedCount} card{unlearnedCount === 1 ? '' : 's'}
            </ActionButton>
          )}
          {onResetAll && (
            <ActionButton variant="quiet" size="lg" fullWidth onClick={onResetAll}>
              Practice all again
            </ActionButton>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
};
