import type { ReactNode } from 'react';
import { Skeleton } from '../../../../lib/widgets';

/**
 * One list row for every breakdown list (words, sound family): the word large in
 * dark ink with the active character in blue, pinyin over meaning, level at the end.
 */
export function BreakdownRow({ glyph, highlight, pinyin, meaning, loading = false, trailing, onClick, ariaLabel }: {
  glyph: string;
  /** Characters to show in blue (the active character, or every character of the active word). */
  highlight?: string;
  pinyin?: string;
  meaning?: string;
  loading?: boolean;
  trailing?: ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="grid w-full grid-cols-[minmax(3.5rem,auto)_minmax(0,1fr)_auto] sm:grid-cols-[minmax(4.75rem,auto)_minmax(0,1fr)_auto] items-center gap-3 border-b-2 sm:gap-4 border-ui-divider px-1 py-3 text-left transition-colors last:border-b-0 hover:bg-ui-hover focus-ring"
    >
      <span className="font-chinese text-2xl leading-none sm:text-[28px] text-ui-ink-strong">
        {Array.from(glyph).map((char, index) => (
          <span key={index} className={highlight && highlight.includes(char) ? 'text-brand-primary' : undefined}>{char}</span>
        ))}
      </span>
      <span className="min-w-0">
        {loading ? (
          <>
            <Skeleton className="h-3 w-14 rounded-xs" />
            <Skeleton className="mt-1.5 h-3.5 w-full max-w-[10rem] rounded-xs" />
          </>
        ) : (
          <>
            {pinyin && <span className="block truncate text-[13px] font-extrabold leading-tight text-brand-primary">{pinyin}</span>}
            {meaning && <span className="block line-clamp-2 text-[15px] font-extrabold leading-snug text-ui-ink-strong">{meaning}</span>}
          </>
        )}
      </span>
      {trailing}
    </button>
  );
}
