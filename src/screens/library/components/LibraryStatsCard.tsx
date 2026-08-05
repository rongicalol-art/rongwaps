import { PiChartDonutFill } from 'react-icons/pi';

interface CollectionStat {
  id: string;
  title: string;
  count: number;
  accentBg?: string;
}

interface LibraryStatsCardProps {
  collections: CollectionStat[];
}

const FALLBACK_COLORS = [
  '#FFB020', '#CE82FF', '#1CB0F6', '#58CC02', '#FF4B4B', '#00CD9C',
];

function extractColor(accentBg: string | undefined, index: number): string {
  const match = accentBg?.match(/\[([^\]]+)\]/);
  return match ? match[1] : FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function DonutChart({ collections }: { collections: CollectionStat[] }) {
  const total = collections.reduce((sum, c) => sum + c.count, 0);
  const r = 30;
  const cx = 40;
  const cy = 40;
  const circumference = 2 * Math.PI * r;
  // gap between segments in px along the arc
  const GAP = 3;

  if (total === 0) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-ui-border)" strokeWidth="9" />
      </svg>
    );
  }

  let offset = 0;
  const slices = collections.map((c, i) => {
    const color = extractColor(c.accentBg, i);
    const fraction = c.count / total;
    const dash = Math.max(0, fraction * circumference - GAP);
    const gap = circumference - dash;
    const slice = { color, dash, gap, offset };
    offset += fraction * circumference;
    return slice;
  });

  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0 -rotate-90">
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-ui-divider)" strokeWidth="9" />
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="9"
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export function LibraryStatsCard({ collections }: LibraryStatsCardProps) {
  const totalItems = collections.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="rounded-[24px] border-0 border-b-4 border-b-ui-border bg-ui-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <PiChartDonutFill size={20} className="text-emerald-500" />
        <h2 className="text-[14px] font-black uppercase tracking-wider text-ui-ink-strong">
          Library at a glance
        </h2>
      </div>

      <div className="flex items-center gap-5">
        {/* Donut with total */}
        <div className="relative shrink-0">
          <DonutChart collections={collections} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <strong className="block text-[17px] font-black leading-none text-ui-ink-strong">{totalItems}</strong>
            <span className="mt-0.5 block text-[8px] font-black uppercase tracking-wide text-ui-muted">items</span>
          </div>
        </div>

        {/* Legend */}
        <dl className="min-w-0 flex-1 space-y-1.5">
          {collections.map((collection, i) => {
            const color = extractColor(collection.accentBg, i);
            return (
              <div key={collection.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="block size-2 shrink-0 rounded-full" style={{ background: color }} />
                  <dt className="min-w-0 truncate text-[11px] font-bold text-ui-muted-strong">
                    {collection.title}
                  </dt>
                </div>
                <dd className="shrink-0 rounded-full bg-ui-canvas px-2 py-0.5 text-[11px] font-black text-ui-ink">
                  {collection.count}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
