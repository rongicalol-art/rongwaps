import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Skeleton } from '../../../../lib/widgets';
import { cn } from '../../../../utils/cn';

/** The raised card that holds one group of compact breakdown rows. */
export const BREAKDOWN_LIST_CARD = 'flex w-full flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface';

/** The first `max` items across ordered groups; groups left empty are dropped. */
export function capGroups<T extends { cards: unknown[] }>(groups: readonly T[], max: number): T[] {
  let remaining = max;
  return groups.flatMap((group) => {
    const cards = group.cards.slice(0, remaining);
    remaining -= cards.length;
    return cards.length > 0 ? [{ ...group, cards } as T] : [];
  });
}

interface BreakdownListSectionProps {
  title: string;
  /** Every item, shown in the "Show All" count. */
  total: number;
  /** The compact list hides some items, so "Show All" is offered. */
  hasMore: boolean;
  onShowAll: () => void;
  accent: string;
  loading: boolean;
  skeletonRows: number;
  gap: 'gap-3' | 'gap-5';
  children: ReactNode;
}

/** A titled compact list in the breakdown (Used As Component, Related Words) with its loading rows. */
export function BreakdownListSection({ title, total, hasMore, onShowAll, accent, loading, skeletonRows, gap, children }: BreakdownListSectionProps) {
  return (
    <div className={cn('flex flex-col pt-2', gap)}>
      <div className="ml-2 flex flex-row items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-ui-muted">{title}</h3>
        {!loading && hasMore && (
          <button type="button" onClick={onShowAll} className={`min-h-11 rounded-compact px-2 text-xs font-extrabold uppercase tracking-wider transition-colors hover:bg-ui-hover focus-ring ${accent}`}>
            Show All ({total})
          </button>
        )}
      </div>
      <motion.div
        key={loading ? 'skeleton' : 'loaded'}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn('flex flex-col', gap)}
      >
        {loading ? (
          <div className={BREAKDOWN_LIST_CARD}>
            {Array.from({ length: skeletonRows }, (_, i) => (
              <div key={i} className="flex w-full flex-row items-center gap-4 border-b-2 border-ui-divider bg-ui-surface px-4 py-3 last:border-0">
                <Skeleton className="size-8 shrink-0 rounded-compact" />
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                  <div className="flex w-full flex-row items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-16 rounded-compact" />
                    <Skeleton className="h-3 w-20 rounded-xs" />
                  </div>
                  <Skeleton className="h-3.5 w-36 rounded-compact" />
                </div>
              </div>
            ))}
          </div>
        ) : children}
      </motion.div>
    </div>
  );
}
