import { AppIcon } from '../../../lib/widgets';
import { FOCUS_THRESHOLD, type TocflBand, type TocflReadiness } from '../../../utils/tocflReadiness';

const BAND_NAME: Record<TocflBand, string> = {
  A: 'Novice–Beginner',
  B: 'Basic–Intermediate',
  C: 'Advanced–Fluent',
};

const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const GOAL_PERCENT = Math.round(FOCUS_THRESHOLD * 100);

const percentOf = (known: number, total: number) => (total > 0 ? Math.round((known / total) * 100) : 0);

interface TocflReadinessCardProps {
  readiness: TocflReadiness | null;
}

/**
 * TOCFL readiness: one hero for the band to work on (percent ring plus how many
 * characters remain to the goal) and quiet progress for the other bands.
 * Counts TBCL characters found in words the learner has passed.
 */
export function TocflReadinessCard({ readiness }: TocflReadinessCardProps) {
  const focus = readiness?.bands.find((b) => b.band === readiness.focusBand);
  const others = readiness?.bands.filter((b) => b.band !== readiness.focusBand) ?? [];
  const focusPercent = focus ? percentOf(focus.known, focus.total) : 0;

  return (
    <section
      aria-label="TOCFL readiness"
      className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <AppIcon name="target" size={19} className="text-brand-secondary" />
        <h2 className="text-base font-black text-ui-ink-strong">TOCFL readiness</h2>
      </div>

      {!readiness || !focus ? (
        <div className="h-28 animate-pulse rounded-compact bg-ui-canvas" aria-hidden />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-7">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="10" className="stroke-brand-primary-track" />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  className="stroke-brand-primary"
                  strokeDasharray={RING_LENGTH}
                  strokeDashoffset={RING_LENGTH * (1 - focusPercent / 100)}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-ui-ink-strong">
                {focusPercent}%
              </span>
            </div>
            <div className="min-w-0 sm:hidden">
              <FocusText band={readiness.focusBand} known={focus.known} total={focus.total} toGo={readiness.focusToGo} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="hidden sm:block">
              <FocusText band={readiness.focusBand} known={focus.known} total={focus.total} toGo={readiness.focusToGo} />
            </div>
            <ul className="mt-4 space-y-2.5 sm:mt-4">
              {others.map(({ band, known, total }) => (
                <li key={band}>
                  <div className="flex items-baseline justify-between gap-2 text-xs font-extrabold text-ui-muted">
                    <span className="truncate">Band {band} · {BAND_NAME[band]}</span>
                    <span className="shrink-0 text-ui-muted-strong" title={`${known} of ${total} characters`}>
                      {percentOf(known, total)}%
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-primary-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={known}
                    aria-label={`Band ${band}: ${known} of ${total} characters known`}
                  >
                    <div className="h-full rounded-full bg-brand-primary/45" style={{ width: `${percentOf(known, total)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] font-semibold leading-snug text-ui-muted">
        Characters from words you've passed, against the TBCL list TOCFL follows.
      </p>
    </section>
  );
}

function FocusText({ band, known, total, toGo }: { band: TocflBand; known: number; total: number; toGo: number }) {
  return (
    <>
      <p className="text-sm font-black text-ui-ink-strong">
        Band {band} · {BAND_NAME[band]}
      </p>
      <p className="mt-0.5 text-xs font-bold text-ui-muted">
        {known} of {total} characters
      </p>
      <p className="mt-2 inline-flex rounded-xs bg-ui-hover px-2 py-1 text-xs font-extrabold text-ui-ink">
        {toGo > 0 ? `${toGo} more to reach ${GOAL_PERCENT}%` : `${GOAL_PERCENT}% reached`}
      </p>
    </>
  );
}
