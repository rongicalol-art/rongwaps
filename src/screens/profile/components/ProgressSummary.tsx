import React from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { ReviewOverview } from '../../../utils/reviewOverview';

interface ProgressSummaryProps {
  overview: ReviewOverview;
  favoriteCount: number;
  onStartReview: () => void;
}

const CARD =
  'rounded-feature bg-ui-surface p-5 sm:p-6 border-b-[length:var(--depth-md)] border-ui-border';

/**
 * A single, calm learning-progress card. When there is nothing learned yet it
 * reads as a compact prompt (never a row of zeroes). With data it shows the
 * learned count, a solid/learning retention rail, due and saved chips, and one
 * primary review action.
 */
export function ProgressSummary({ overview, favoriteCount, onStartReview }: ProgressSummaryProps) {
  const { knownTotal, dueCount, stages } = overview;
  const { solid, learning } = stages;

  if (knownTotal === 0) {
    return (
      <div className={`flex items-center gap-4 ${CARD}`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-brand-primary/10 text-brand-primary-deep">
          <AppIcon name="books" size={24} />
        </div>
        <div className="min-w-0 text-left">
          <h2 className="text-[15px] font-black text-ui-ink-strong">No progress yet</h2>
          <p className="text-sm font-bold text-ui-muted">
            Start a lesson — words, streaks and reviews appear here.
          </p>
        </div>
      </div>
    );
  }

  const segment = (count: number) =>
    count === 0 ? undefined : { width: `${Math.max(4, Math.round((count / knownTotal) * 100))}%` };

  return (
    <div className={CARD}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AppIcon name="progress" size={19} className="text-brand-primary" />
          <h2 className="text-[17px] font-black text-ui-ink-strong">Your progress</h2>
        </div>
        {dueCount > 0 && (
          <span className="rounded-md bg-brand-secondary/15 px-2.5 py-1 text-xs font-black text-brand-secondary-edge">
            {dueCount} due now
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-[34px] font-black leading-none text-ui-ink-strong">{knownTotal}</span>
        <span className="text-sm font-bold text-ui-muted">words learned</span>
      </div>

      <div className="mt-4">
        <div
          role="img"
          aria-label={`${solid} solid, ${learning} learning`}
          className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-ui-canvas p-0.5"
        >
          {solid > 0 && (
            <span
              className="h-full rounded-full bg-feedback-success transition-all duration-500"
              style={segment(solid)}
            />
          )}
          {learning > 0 && (
            <span
              className="h-full rounded-full bg-brand-primary transition-all duration-500"
              style={segment(learning)}
            />
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-bold text-ui-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-feedback-success" />
            {solid} solid
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-primary" />
            {learning} learning
          </span>
          <span className="inline-flex items-center gap-1.5 text-ui-muted-strong">
            <AppIcon name="bookmarkFilled" size={13} className="text-feedback-warning-edge" />
            {favoriteCount} saved
          </span>
        </div>
      </div>

      {dueCount > 0 ? (
        <div className="mt-5">
          <ActionButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={onStartReview}
            className="font-black uppercase tracking-wider"
          >
            <AppIcon name="play" size={20} />
            <span>Start review</span>
          </ActionButton>
        </div>
      ) : (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-control border-b-[length:var(--depth-sm)] border-feedback-success-edge bg-feedback-success-surface p-3 text-sm font-black text-feedback-success-edge">
          <AppIcon name="check" size={18} />
          <span>All caught up!</span>
        </div>
      )}
    </div>
  );
}
