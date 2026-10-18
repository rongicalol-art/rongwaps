import { SectionEyebrow } from '../../../lib/widgets';
import type { TocflReadiness } from '../../../utils/lesson/tocflReadiness';

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
        <SectionEyebrow title="TOCFL progress" />
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
      <SectionEyebrow title="TOCFL progress" />
      <ul className="mt-3 space-y-2">
        {readiness.bands.map(({ band, known, total }) => {
          const percent = total > 0 ? Math.round((known / total) * 100) : 0;
          const isFocus = band === readiness.focusBand;

          return (
            <li key={band} className={`rounded-control px-2 py-1.5 ${isFocus ? 'bg-brand-primary-soft/45' : ''}`}>
              <div className="flex items-baseline justify-between gap-2 text-[13px] font-extrabold">
                <span className={isFocus ? 'text-brand-primary' : 'text-ui-ink'}>Band {band}</span>
                <span className="shrink-0 tabular-nums text-ui-muted">{known} / {total} chars</span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={`Band ${band}: ${known} of ${total} characters known`}
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-brand-primary-track"
              >
                <div className="h-full rounded-full bg-brand-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
