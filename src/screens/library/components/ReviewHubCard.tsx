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
  const { knownTotal, dueCount, stages } = overview;
  const hasWords = knownTotal > 0 || stages.started > 0;
  const sessionBatchSize = Math.min(dueCount, REVIEW_SESSION_CAP);

  return (
    <section aria-label="Daily review" data-tone="review" className="rounded-feature bg-brand-primary-soft p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <h2 className="text-[22px] font-black text-ui-ink-strong sm:text-2xl">Daily review</h2>
          {dueCount > 0 ? (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5 text-ui-ink-strong">
              <span className="text-5xl font-black leading-none tabular-nums sm:text-6xl">{dueCount}</span>
              <span className="text-lg font-extrabold">{dueCount === 1 ? 'word' : 'words'} ready to practice</span>
            </p>
          ) : (
            <p className="mt-2 text-lg font-extrabold text-ui-ink-strong">
              {hasWords ? 'You’re caught up!' : 'No words to review yet'}
            </p>
          )}
          {dueCount === 0 && (
            <p className="mt-1 text-sm font-bold text-ui-ink">
              {hasWords ? 'More words will appear when they’re due.' : 'Finish a lesson to start your daily review.'}
            </p>
          )}
          {dueCount > REVIEW_SESSION_CAP && (
            <p className="mt-2 text-sm font-bold text-ui-ink">{sessionBatchSize} words in this session</p>
          )}
        </div>
        {dueCount > 0 ? (
          <div className="shrink-0 sm:w-60">
            <ActionButton size="lg" fullWidth onClick={onStartReview}>
              <AppIcon name="play" size={20} />
              Start review
            </ActionButton>
          </div>
        ) : !hasWords ? (
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
