import type { ReactNode } from 'react';
import { AppIcon } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { renderHookText } from './hookText';
import { useMemoryHook } from './useMemoryHook';

export interface MemoryHookBlockProps {
  /** Cache key: `{char}` for characters, `word_{text}` for vocabulary. */
  cacheKey: string;
  /** The character or word shown in the leading tile. */
  word: string;
  /** Optional tone-marked pinyin for the tile. */
  pinyin?: string;
  emptyText: ReactNode;
  className?: string;
}

/** Tile width and glyph size step down as the word grows so it never wraps. */
function tileMetrics(word: string): { tile: string; glyph: string } {
  const length = [...word].length;
  if (length <= 2) return { tile: 'w-[76px] sm:w-[92px]', glyph: 'text-[26px] sm:text-[32px]' };
  if (length === 3) return { tile: 'w-[76px] sm:w-[92px]', glyph: 'text-[22px] sm:text-[26px]' };
  return { tile: 'w-[92px] sm:w-[112px]', glyph: 'text-[18px] sm:text-[22px]' };
}

/**
 * Full-width "Memory Hook" card for detail views (character breakdown, word
 * detail): a solid gold word tile on the left — its own small "word of the
 * day" panel with the glyph and optional pinyin — beside the hook text on the
 * warm cream surface. Reads the canonical hook pack-first; a miss shows the
 * provided empty text.
 */
export function MemoryHookBlock({ cacheKey, word, pinyin, emptyText, className }: MemoryHookBlockProps) {
  const { hook, loaded } = useMemoryHook(cacheKey, true);
  const metrics = tileMetrics(word);

  return (
    <aside
      aria-label="Memory hook"
      className={cn(
        'relative flex w-full items-stretch overflow-hidden rounded-feature border-2 border-feedback-warning-edge border-b-[length:var(--depth-md)] bg-feedback-warning-surface text-left shadow-ambient-sm',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden bg-feedback-warning px-1',
          metrics.tile,
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full border-[16px] border-white/20"
        />
        <span className={cn('relative font-chinese font-bold leading-none text-ui-ink-strong', metrics.glyph)}>
          {word}
        </span>
        {pinyin && (
          <span className="relative max-w-full px-2 text-center text-[10px] font-black leading-tight tracking-wide text-ui-ink-strong/70 sm:text-[11px]">
            {pinyin}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-1.5">
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
      </div>
    </aside>
  );
}
