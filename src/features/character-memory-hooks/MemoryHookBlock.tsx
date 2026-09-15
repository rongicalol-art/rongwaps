import type { ReactNode } from 'react';
import { AppIcon } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { renderHookText } from './hookText';
import { useMemoryHook } from './useMemoryHook';

export interface MemoryHookBlockProps {
  /** Cache key: `{char}` for characters, `word_{text}` for vocabulary. */
  cacheKey: string;
  /** Optional glyph medallion (kept for backward compatibility; content now flows full width). */
  glyph?: ReactNode;
  emptyText: ReactNode;
  className?: string;
}

/**
 * Full-width "Memory Hook" card for detail views (character breakdown, word
 * detail). Warm warning-tinted surface with universal tactile border and
 * left-aligned sparkle eyebrow. Reads the canonical hook pack-first; a miss shows
 * the provided empty text.
 */
export function MemoryHookBlock({ cacheKey, emptyText, className }: MemoryHookBlockProps) {
  const { hook, loaded } = useMemoryHook(cacheKey, true);

  return (
    <aside
      aria-label="Memory hook"
      className={cn(
        'relative w-full rounded-feature border-2 border-feedback-warning-edge border-b-[length:var(--depth-md)] bg-feedback-warning-surface p-4 sm:p-5 text-left shadow-ambient-sm',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <AppIcon name="sparkles" size={13} className="text-feedback-warning-edge" />
        <span className="text-[11px] font-black uppercase tracking-wider text-feedback-warning-edge">
          Memory hook
        </span>
      </div>

      {loaded ? (
        hook ? (
          <p className="text-sm sm:text-base font-bold leading-relaxed text-ui-ink">
            {renderHookText(hook)}
          </p>
        ) : (
          <p className="text-sm font-semibold leading-relaxed text-ui-muted">
            {emptyText}
          </p>
        )
      ) : (
        <div className="flex flex-col justify-start gap-2 pt-1">
          <span className="block h-4 w-full animate-pulse rounded-full bg-feedback-warning-edge/15" />
          <span className="block h-4 w-3/4 animate-pulse rounded-full bg-feedback-warning-edge/15" />
        </div>
      )}
    </aside>
  );
}
