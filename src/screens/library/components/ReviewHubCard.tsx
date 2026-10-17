import { memo } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { REVIEW_SESSION_CAP } from '../../../utils/srs/reviewSession';
import type { ReviewOverview } from '../../../utils/srs/reviewOverview';

interface ReviewHubCardProps {
  overview: ReviewOverview;
  onStartReview: () => void;
  onNavigateToPath: () => void;
}

/** Daily review uses the existing SRS queue, independently of the selected folder. */
export const ReviewHubCard = memo(function ReviewHubCard({ overview, onStartReview, onNavigateToPath }: ReviewHubCardProps) {
  const { knownTotal, dueCount, stages, dailyCompleted = false } = overview;
  const hasWords = knownTotal > 0 || stages.started > 0;
  const sessionBatchSize = overview.dailyCount ?? Math.min(dueCount, REVIEW_SESSION_CAP);

  return (
    <section aria-label="Daily review" data-tone="review" className="rounded-feature bg-brand-primary-soft p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <h2 className="text-[22px] font-black text-ui-ink-strong sm:text-2xl">Daily review</h2>
          <p className="mt-2 text-lg font-extrabold text-ui-ink-strong">
            {dailyCompleted ? 'Today’s review complete' : dueCount > 0 ? 'About 5 minutes' : hasWords ? 'You’re caught up!' : 'No words to review yet'}
          </p>
          <p className="mt-1 text-sm font-bold text-ui-ink">
            {dailyCompleted ? 'A little practice, every day.' : dueCount > 0
              ? `${sessionBatchSize} ${sessionBatchSize === 1 ? 'word' : 'words'} picked for you`
              : hasWords ? 'More words will appear when they’re due.' : 'Study a few words to start your daily review.'}
          </p>
          {dueCount > 0 && (
            <details className="mt-3 text-sm font-bold text-ui-ink">
              <summary className="cursor-pointer focus-ring-inline">Review details</summary>
              <p className="mt-1">{dueCount} words are due in your collection. Today’s session is kept small.</p>
            </details>
          )}
        </div>
        {dueCount > 0 && !dailyCompleted ? (
          <div className="shrink-0 sm:w-60">
            <ActionButton size="lg" fullWidth onClick={onStartReview}>
              <AppIcon name="play" size={20} />
              Start review
            </ActionButton>
          </div>
        ) : !hasWords && !dailyCompleted ? (
          <div className="shrink-0 sm:w-60">
            <ActionButton size="lg" fullWidth onClick={onNavigateToPath}>
              <AppIcon name="books" size={20} />
              Explore lessons
            </ActionButton>
          </div>
        ) : null}
      </div>
    </section>
  );
});
