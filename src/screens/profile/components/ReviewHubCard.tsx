import React, { memo } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { REVIEW_SESSION_CAP } from '../../../utils/reviewSession';
import type { ReviewOverview } from '../../../utils/reviewOverview';

interface ReviewHubCardProps {
  overview: ReviewOverview;
  onStartReview: () => void;
  onNavigateToPath?: () => void;
}

/**
 * Spaced Repetition Review centerpiece.
 * Shows retention stages (Solid vs. Learning), due cards, and the primary
 * review action with Duolingo-like tactile polish.
 */
export const ReviewHubCard = memo(function ReviewHubCard({
  overview,
  onStartReview,
  onNavigateToPath,
}: ReviewHubCardProps) {
  const { knownTotal, dueCount, stages } = overview;
  const { solid, learning } = stages;

  if (knownTotal === 0) {
    return (
      <section className="flex flex-col items-center rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-6 text-center sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-feature bg-brand-primary/10 text-brand-primary">
          <AppIcon name="books" size={28} />
        </div>
        <h2 className="mt-4 text-lg font-black text-ui-ink-strong sm:text-xl">
          No words to review yet
        </h2>
        <p className="mt-1.5 max-w-md text-sm font-bold text-ui-muted">
          Complete lessons on the Course Path to start reviewing.
        </p>
        {onNavigateToPath && (
          <div className="mt-6 w-full max-w-xs">
            <ActionButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={onNavigateToPath}
              className="font-black uppercase tracking-wider"
            >
              <AppIcon name="play" size={20} />
              <span>Go to Course Path</span>
            </ActionButton>
          </div>
        )}
      </section>
    );
  }

  const solidPct = knownTotal > 0 ? Math.round((solid / knownTotal) * 100) : 0;
  const learningPct = knownTotal > 0 ? Math.round((learning / knownTotal) * 100) : 0;
  const sessionBatchSize = Math.min(dueCount, REVIEW_SESSION_CAP);

  return (
    <section className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-5 sm:p-6">
      {/* Header with Title */}
      <div className="flex items-center gap-2.5">
        <div className="flex shrink-0 items-center justify-center text-brand-primary">
          <AppIcon name="progress" size={24} />
        </div>
        <h2 className="text-[17px] font-black leading-tight text-ui-ink-strong">
          Review
        </h2>
      </div>

      {/* Hero Words Learned Metric */}
      <div className="mt-5 flex items-baseline gap-2.5">
        <span className="text-4xl font-black leading-none text-ui-ink-strong sm:text-5xl">
          {knownTotal}
        </span>
        <span className="text-sm font-black uppercase tracking-wider text-ui-muted">
          words learned
        </span>
      </div>

      {/* Retention Progress Rail - Simple 2-segment bar */}
      <div className="mt-4">
        <div
          role="progressbar"
          aria-label={`${solid} solid, ${learning} in training`}
          className="flex h-3.5 w-full overflow-hidden rounded-full bg-ui-canvas"
        >
          {solid > 0 && (
            <div
              className="h-full bg-feedback-success transition-all duration-500"
              style={{ width: `${solidPct}%` }}
            />
          )}
          {learning > 0 && (
            <div
              className="h-full bg-brand-primary transition-all duration-500"
              style={{ width: `${learningPct}%` }}
            />
          )}
        </div>

        {/* Legend pills matching app metric typography */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-feedback-success" />
            <span className="font-black text-ui-ink-strong">{solid}</span>
            <span className="text-[11px] font-black uppercase tracking-wider text-ui-muted">Solid</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-primary" />
            <span className="font-black text-ui-ink-strong">{learning}</span>
            <span className="text-[11px] font-black uppercase tracking-wider text-ui-muted">Learning</span>
          </span>
        </div>
      </div>

      {/* Action Banner */}
      {dueCount > 0 ? (
        <div className="mt-6">
          <ActionButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={onStartReview}
            className="font-black uppercase tracking-wider"
          >
            <AppIcon name="play" size={20} />
            <span>Review {sessionBatchSize} {sessionBatchSize === 1 ? 'Word' : 'Words'}</span>
          </ActionButton>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-control border border-feedback-success-edge/30 bg-feedback-success-surface p-3.5 text-feedback-success-edge">
          <AppIcon name="check" size={22} className="shrink-0" />
          <div className="min-w-0 text-left">
            <p className="text-sm font-black">All caught up for today!</p>
            <p className="text-xs font-bold text-feedback-success-edge/80">
              Check back later for new reviews.
            </p>
          </div>
        </div>
      )}
    </section>
  );
});
