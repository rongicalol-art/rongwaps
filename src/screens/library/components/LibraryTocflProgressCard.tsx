import { SectionEyebrow } from '../../../lib/widgets';
import { FOCUS_THRESHOLD, type TocflReadiness } from '../../../utils/lesson/tocflReadiness';

interface LibraryTocflProgressCardProps {
  readiness: TocflReadiness | null;
}

export function LibraryTocflProgressCard({ readiness }: LibraryTocflProgressCardProps) {
  if (!readiness) {
    return (
      <section
        aria-label="TOCFL progress"
        aria-busy="true"
        className="min-w-0 animate-pulse rounded-feature border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6"
      >
        <SectionEyebrow title="TOCFL journey" />
        <div aria-hidden="true" className="mt-4 space-y-4">
          {['A', 'B', 'C'].map((band) => (
            <div key={band} className="space-y-2">
              <div className="h-3 w-3/4 rounded bg-ui-hover" />
              <div className="h-2.5 rounded-full bg-ui-hover" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="TOCFL character progress" className="min-w-0 rounded-feature border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6">
      <SectionEyebrow title="TOCFL journey" />
      <ol className="mt-4 space-y-3">
        {readiness.bands.map(({ band, known, total }, index) => {
          const ratio = total > 0 ? known / total : 0;
          const percent = Math.round(ratio * 100);
          const isFocus = band === readiness.focusBand;
          const isOnTrack = ratio >= FOCUS_THRESHOLD;

          return (
            <li key={band} className="flex gap-2.5">
              <div className="relative flex w-7 shrink-0 justify-center">
                {index < readiness.bands.length - 1 && (
                  <span aria-hidden="true" className="absolute -bottom-3 left-1/2 top-7 w-0.5 -translate-x-1/2 bg-ui-divider" />
                )}
                <span
                  aria-hidden="true"
                  className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-black ${isFocus
                    ? 'border-brand-primary bg-brand-primary text-ui-surface'
                    : isOnTrack
                      ? 'border-brand-primary/30 bg-brand-primary-soft text-brand-primary'
                      : 'border-ui-border bg-ui-surface text-ui-muted-strong'}`}
                >
                  {band}
                </span>
              </div>
              <div className={`min-w-0 flex-1 rounded-control ${isFocus ? 'bg-brand-primary-soft/45 px-3 py-2.5' : 'px-3 py-2'}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm font-extrabold ${isFocus ? 'text-brand-primary' : 'text-ui-ink'}`}>Band {band}</span>
                  {isFocus && <span className="shrink-0 text-xl font-black leading-none tabular-nums text-brand-primary">{percent}%</span>}
                </div>
                {isFocus ? (
                  <>
                    <p className="mt-1 text-xs font-extrabold tabular-nums text-ui-muted-strong">{known} / {total} chars</p>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      aria-label={`Band ${band}: ${known} of ${total} characters known`}
                      className="relative mt-2 h-2.5 overflow-visible rounded-full bg-brand-primary-track"
                    >
                      <div className="h-full rounded-full bg-brand-primary transition-[width] duration-500" style={{ width: `${Math.min(percent, 100)}%` }} />
                      <span aria-hidden="true" className="absolute -bottom-1 -top-1 z-10 w-0.5 rounded-full bg-feedback-warning-edge" style={{ left: `${FOCUS_THRESHOLD * 100}%` }} />
                    </div>
                    <p className="mt-1 text-right text-xs font-extrabold text-ui-muted">90% goal</p>
                  </>
                ) : (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      aria-label={`Band ${band}: ${known} of ${total} characters known`}
                      className="h-1.5 min-w-7 flex-1 overflow-hidden rounded-full bg-brand-primary-track"
                    >
                      <div className="h-full rounded-full bg-brand-primary transition-[width] duration-500" style={{ width: `${Math.min(percent, 100)}%` }} />
                    </div>
                    <span className="shrink-0 text-right text-xs font-extrabold tabular-nums text-ui-muted">{known} / {total}</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
