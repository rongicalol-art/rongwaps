import type { ReactNode } from 'react';
import { formatPosLabel } from '../../../utils/vocabulary/posLabels';

interface DictionaryRowProps {
  glyph: string;
  pinyin?: string | null;
  meaning?: string;
  pos?: string | null;
  /** Level / lesson chip, placed right after the meaning. */
  trailing?: ReactNode;
  /** Far-right control, such as the save button. */
  action?: ReactNode;
  onOpen: () => void;
  ariaLabel: string;
}

/**
 * The one word row for every dictionary list: heavy word, blue pinyin over a
 * bold meaning (two lines on phones), the word type, then the trailing
 * controls. Phones keep only the lesson chip: audio and save live on the word
 * page, so the meaning gets the room. Type and book marks align down the list.
 */
export function DictionaryRow({ glyph, pinyin, meaning, pos, trailing, action, onOpen, ariaLabel }: DictionaryRowProps) {
  const posLabel = formatPosLabel(pos, 2);
  return (
    <div
      className="flex items-center gap-3 border-b-2 border-ui-divider px-1 last:border-b-0 sm:gap-3.5"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 80px' }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel}
        className="group grid min-w-0 flex-1 grid-cols-[minmax(3.5rem,auto)_minmax(0,1fr)] items-center gap-3 rounded-sm py-3.5 text-left focus-ring sm:grid-cols-[minmax(5rem,auto)_minmax(0,1fr)] sm:gap-3.5 sm:py-5"
      >
        <span className="font-chinese text-3xl leading-none text-ui-ink-strong transition-colors group-hover:text-brand-primary-text">{glyph}</span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-sm font-extrabold leading-tight text-brand-primary-text">{pinyin || ' '}</span>
            {posLabel && <span className="truncate text-xs font-black uppercase tracking-wider text-ui-muted-strong sm:hidden">{posLabel}</span>}
          </span>
          <span className="line-clamp-2 text-base font-extrabold leading-snug text-ui-ink-strong sm:line-clamp-1">{meaning || ' '}</span>
        </span>
      </button>
      {posLabel && <span className="hidden w-36 shrink-0 text-right text-xs font-black uppercase leading-tight tracking-widest text-ui-muted-strong sm:line-clamp-2">{posLabel}</span>}
      {trailing && <span className="flex shrink-0 sm:w-21 sm:justify-center">{trailing}</span>}
      {action && <span className="hidden shrink-0 items-center sm:flex">{action}</span>}
    </div>
  );
}
