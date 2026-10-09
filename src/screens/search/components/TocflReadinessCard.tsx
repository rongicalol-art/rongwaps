import { useState } from 'react';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { type TocflBand, type TocflReadiness } from '../../../utils/lesson/tocflReadiness';

/** Official TOCFL band names. */
const BAND_NAME: Record<TocflBand, string> = {
  A: 'Beginner',
  B: 'Intermediate',
  C: 'Advanced',
};

const percentOf = (known: number, total: number) => (total > 0 ? Math.round((known / total) * 100) : 0);

/** Chunky progress bar with a soft highlight stripe, like the practice progress. */
function Bar({ percent, slim = false, label }: { percent: number; slim?: boolean; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className={cn('overflow-hidden rounded-full bg-brand-primary-track', slim ? 'h-2.5' : 'h-4')}
    >
      <div
        className="relative h-full min-w-[var(--bar-min)] rounded-full bg-brand-primary transition-[width] duration-[600ms] ease-[cubic-bezier(0.3,1.2,0.5,1)]"
        style={{ width: `${percent}%`, ['--bar-min' as string]: slim ? '0px' : '16px' }}
      >
        {!slim && <span aria-hidden className="absolute inset-x-1.5 top-[3px] h-1 rounded-full bg-white/35" />}
      </div>
    </div>
  );
}

interface TocflReadinessCardProps {
  readiness: TocflReadiness | null;
}

/**
 * TOCFL readiness as one slim row: the band to work on, a chunky bar and what
 * is left to the goal. Tap to open the other bands.
 */
export function TocflReadinessCard({ readiness }: TocflReadinessCardProps) {
  const [open, setOpen] = useState(false);
  const focus = readiness?.bands.find((b) => b.band === readiness.focusBand);
  const others = readiness?.bands.filter((b) => b.band !== readiness.focusBand) ?? [];

  if (!readiness || !focus) {
    return <div className="h-20 animate-pulse rounded-feature bg-ui-hover" aria-hidden />;
  }

  const toGo = readiness.focusToGo;
  const nextBand = readiness.bands[readiness.bands.findIndex((b) => b.band === readiness.focusBand) + 1]?.band;
  const focusPercent = percentOf(focus.known, focus.total);

  return (
    <section aria-label="TOCFL readiness" className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="block w-full rounded-control text-left focus-ring"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[17px] font-black text-ui-ink-strong">Band {readiness.focusBand} · {BAND_NAME[readiness.focusBand]}</span>
          <span className="text-sm font-extrabold tabular-nums text-ui-muted">{focus.known} of {focus.total} characters</span>
        </span>
        <span className="mt-2.5 block">
          <Bar percent={focusPercent} label={`Band ${readiness.focusBand}: ${focus.known} of ${focus.total} characters known`} />
        </span>
        <span className="mt-2 flex items-center justify-between text-sm font-extrabold text-ui-muted">
          <span>{toGo > 0 ? `${toGo} more to reach ${nextBand ? `Band ${nextBand}` : 'the goal'}` : nextBand ? `Ready for Band ${nextBand}` : 'Band complete'}</span>
          <AppIcon name="expand" size={18} className={cn('transition-transform duration-300', open && 'rotate-180')} />
        </span>
      </button>

      <div className={cn('grid transition-[grid-template-rows] duration-[360ms] ease-[cubic-bezier(0.2,0.9,0.3,1)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <ul className="space-y-3 pt-3">
            {others.map(({ band, known, total }) => (
              <li key={band}>
                <div className="flex items-baseline justify-between gap-2 text-sm font-extrabold text-ui-ink">
                  <span className="truncate">Band {band} · {BAND_NAME[band]}</span>
                  <span className="shrink-0 text-ui-muted" title={`${known} of ${total} characters`}>{percentOf(known, total)}%</span>
                </div>
                <div className="mt-1.5"><Bar slim percent={percentOf(known, total)} label={`Band ${band}: ${known} of ${total} characters known`} /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
