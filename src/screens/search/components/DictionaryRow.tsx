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

/** The one word row for every dictionary list: heavy word, blue pinyin over a bold meaning, quiet type, then the trailing controls. */
export function DictionaryRow({ glyph, pinyin, meaning, pos, trailing, action, onOpen, ariaLabel }: DictionaryRowProps) {
  const posLabel = formatPosLabel(pos);
  return (
    <div
      className="flex items-center gap-3 border-b-2 border-ui-divider px-1 last:border-b-0"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 64px' }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel}
        className="group grid min-w-0 flex-[0_1_auto] grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)] items-center gap-4 py-3 text-left focus-ring"
      >
        <span className="font-chinese text-[28px] leading-none text-ui-ink-strong transition-colors group-hover:text-brand-primary">{glyph}</span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-extrabold leading-tight text-brand-primary">{pinyin || ' '}</span>
          <span className="block truncate text-[15px] font-extrabold leading-snug text-ui-ink-strong">{meaning || ' '}</span>
        </span>
      </button>
      {posLabel && <span className="hidden shrink-0 text-[11px] font-black uppercase tracking-widest text-ui-muted sm:block">{posLabel}</span>}
      {trailing}
      {action && <span className="ml-auto flex shrink-0 items-center">{action}</span>}
    </div>
  );
}
