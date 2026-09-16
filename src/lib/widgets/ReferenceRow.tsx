import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';

/**
 * One shared row anatomy for every reference sheet row: Chinese glyph on the
 * left, pinyin over meaning on the right. The character-breakdown and
 * dictionary supporting-information rails render the same rows, so the
 * anatomy lives here instead of being re-declared per feature.
 *
 * `accentClassName` tints the glyph with the active book's accent; pass
 * `loading` to render the skeleton placeholder while reference data resolves.
 */
export function ReferenceRow({
  glyph,
  accentClassName,
  primary,
  secondary,
  loading = false,
  trailing,
  onClick,
  ariaLabel,
}: {
  glyph: string;
  accentClassName?: string;
  primary?: string;
  secondary?: string;
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
      className="group flex min-h-[54px] w-full items-center gap-3 rounded-compact px-2 py-2 text-left transition-colors hover:bg-ui-hover focus-visible:z-10 focus-ring"
    >
      <span
        className={`min-w-[3.75rem] shrink-0 font-chinese text-2xl leading-none ${accentClassName ?? 'text-ui-ink-strong'}`}
      >
        {glyph}
      </span>
      <span className="min-w-0 flex-1">
        {loading ? (
          <>
            <Skeleton className="h-3 w-14 rounded-xs" />
            <Skeleton className="mt-1.5 h-3 w-full max-w-[10rem] rounded-xs" />
          </>
        ) : (
          <>
            {primary && (
              <span className="block truncate text-xs font-extrabold leading-tight text-brand-primary">
                {primary}
              </span>
            )}
            {secondary && (
              <span className="block truncate text-sm font-bold leading-snug text-ui-ink">
                {secondary}
              </span>
            )}
          </>
        )}
      </span>
      {trailing}
    </button>
  );
}
