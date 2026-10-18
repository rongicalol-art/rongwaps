import { memo } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { REVIEW_SESSION_CAP } from '../../../utils/srs/reviewSession';
import type { ReviewOverview } from '../../../utils/srs/reviewOverview';

interface ReviewHubCardProps {
  overview: ReviewOverview;
  onStartReview: () => void;
  onNavigateToPath: () => void;
}

const calendarIcon = new URL('../../../assets/icons/cube/schedule.svg', import.meta.url).href;

/** Daily review uses the existing SRS queue, independently of the selected folder. */
export const ReviewHubCard = memo(function ReviewHubCard({ overview, onStartReview, onNavigateToPath }: ReviewHubCardProps) {
  const { knownTotal, dueCount, stages, dailyCompleted = false } = overview;
  const hasWords = knownTotal > 0 || stages.started > 0;
  const sessionBatchSize = overview.dailyCount ?? Math.min(dueCount, REVIEW_SESSION_CAP);

  return (
    <section aria-label="Daily review" className="group/review min-w-0 rounded-feature border border-ui-divider bg-ui-surface p-5">
      <div className="flex items-center gap-3">
        <img src={calendarIcon} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover/review:-translate-y-0.5" />
        <h2 className="text-base font-black text-ui-ink-strong">Daily review</h2>
      </div>
      <p className="mt-3 text-[13px] font-bold text-ui-muted-strong">
        {dailyCompleted ? 'Today’s review complete' : dueCount > 0
          ? `${sessionBatchSize} ${sessionBatchSize === 1 ? 'word' : 'words'} · about 5 min`
          : hasWords ? 'You’re caught up!' : 'No words to review yet'}
      </p>
      <div data-tone="review">
        {dueCount > 0 && !dailyCompleted ? (
          <div className="mt-4">
            <ActionButton fullWidth onClick={onStartReview} className="normal-case tracking-normal">
              Review words
              <AppIcon name="forward" size={18} />
            </ActionButton>
          </div>
        ) : !hasWords && !dailyCompleted ? (
          <div className="mt-4">
            <ActionButton fullWidth onClick={onNavigateToPath} className="normal-case tracking-normal">
              Explore lessons
            </ActionButton>
          </div>
        ) : null}
      </div>
    </section>
  );
});
