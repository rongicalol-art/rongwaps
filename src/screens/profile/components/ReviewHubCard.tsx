import { memo } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { REVIEW_SESSION_CAP } from '../../../utils/srs/reviewSession';
import type { ReviewOverview } from '../../../utils/srs/reviewOverview';

interface ReviewHubCardProps {
  overview: ReviewOverview;
  onStartReview: () => void;
  onNavigateToPath?: () => void;
}

function Stage({ value, label, valueClassName }: { value: number; label: string; valueClassName?: string }) {
  return (
    <div className="rounded-control bg-ui-canvas px-2 py-3 text-center">
      <p className={`text-[28px] font-black leading-none tabular-nums ${valueClassName ?? 'text-ui-ink-strong'}`}>{value}</p>
      <p className="mt-1.5 text-xs font-black uppercase tracking-widest text-ui-muted">{label}</p>
    </div>
  );
}

/**
 * The review centrepiece: how many words are ready, one chunky bar, the three
 * stage numbers and one big button. Empty and caught-up states stay in the same card.
 */
export const ReviewHubCard = memo(function ReviewHubCard({ overview, onStartReview, onNavigateToPath }: ReviewHubCardProps) {
  const { knownTotal, dueCount, stages } = overview;
  const { solid, learning } = stages;
  const cardClass = 'rounded-feature border-2 border-b-[length:var(--depth-lg)] border-ui-divider bg-ui-surface p-5';

  if (knownTotal === 0) {
    return (
      <section className={`${cardClass} flex flex-col items-center text-center`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-feature bg-brand-primary/10 text-brand-primary">
          <AppIcon name="books" size={30} />
        </div>
        <h2 className="mt-3 text-[22px] font-black text-ui-ink-strong">No words to review yet</h2>
        <p className="mt-1.5 max-w-xs text-[15px] font-bold leading-snug text-ui-muted">
          Finish a lesson and its words will show up here, ready to review.
        </p>
        {onNavigateToPath && (
          <div className="mt-5 w-full">
            <ActionButton variant="primary" size="lg" fullWidth onClick={onNavigateToPath}>
              <span>Go to the course path</span>
            </ActionButton>
          </div>
        )}
      </section>
    );
  }

  const solidPct = Math.round((solid / knownTotal) * 100);
  const learningPct = Math.round((learning / knownTotal) * 100);
  const sessionBatchSize = Math.min(dueCount, REVIEW_SESSION_CAP);

  return (
    <section className={`${cardClass} flex flex-col gap-4`}>
      {dueCount > 0 ? (
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-brand-primary">Ready to review</p>
          <p className="mt-1.5 flex items-baseline gap-2.5">
            <span className="text-[64px] font-black leading-[0.9] tabular-nums tracking-tight text-ui-ink-strong">{dueCount}</span>
            <span className="text-xl font-black text-ui-ink-strong">{dueCount === 1 ? 'word' : 'words'}</span>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 rounded-control bg-feedback-success-surface p-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-feedback-success text-white">
            <AppIcon name="statusCheck" size={24} />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-[17px] font-black text-ui-ink-strong">All caught up</p>
            <p className="text-sm font-bold text-ui-muted">Nothing is due. New reviews will show up here.</p>
          </div>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={solidPct}
        aria-label={`${solid} solid, ${learning} learning`}
        className="flex h-4 w-full gap-[3px] overflow-hidden rounded-full bg-ui-canvas"
      >
        {solid > 0 && <div className="relative h-full rounded-full bg-feedback-success transition-[width] duration-[700ms] ease-[cubic-bezier(0.3,1.15,0.5,1)]" style={{ width: `${solidPct}%` }}><span aria-hidden className="absolute inset-x-1.5 top-[3px] h-1 rounded-full bg-white/35" /></div>}
        {learning > 0 && <div className="relative h-full rounded-full bg-brand-primary transition-[width] duration-[700ms] ease-[cubic-bezier(0.3,1.15,0.5,1)]" style={{ width: `${learningPct}%` }}><span aria-hidden className="absolute inset-x-1.5 top-[3px] h-1 rounded-full bg-white/35" /></div>}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Stage value={knownTotal} label="Learned" />
        <Stage value={learning} label="Learning" valueClassName="text-brand-primary" />
        <Stage value={solid} label="Solid" valueClassName="text-feedback-success" />
      </div>

      {dueCount > 0 && (
        <ActionButton variant="primary" size="lg" fullWidth onClick={onStartReview}>
          <AppIcon name="play" size={20} />
          <span>Review {sessionBatchSize} {sessionBatchSize === 1 ? 'word' : 'words'}</span>
        </ActionButton>
      )}
    </section>
  );
});
