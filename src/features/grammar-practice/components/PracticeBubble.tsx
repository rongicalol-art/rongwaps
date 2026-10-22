import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

/** A speech bubble whose tail points at the character beside it. */
export const BUBBLE_TAIL = 'relative max-w-full rounded-control rounded-bl-control before:absolute before:-left-2 before:top-7 before:size-4 before:rotate-45 before:border-b-2 before:border-l-2 before:border-ui-divider before:bg-ui-surface';

interface PracticeBubbleProps {
  /** `me` is the learner's reply (right, book blue). */
  side: 'them' | 'me';
  children: ReactNode;
  /** Small line under the sentence: pinyin, English, or the book's gloss. */
  notes?: string[];
  className?: string;
}

/** One chat message. Every bubble shares one text size; sentences break at punctuation, not mid-word. */
export function PracticeBubble({ side, children, notes = [], className }: PracticeBubbleProps) {
  const mine = side === 'me';
  return (
    <div
      className={cn(
        'max-w-[88%] rounded-feature px-5 py-3.5 [overflow-wrap:anywhere] [word-break:keep-all]',
        mine
          ? 'self-end rounded-br-xs bg-brand-primary text-brand-on-primary'
          : 'self-start rounded-bl-xs border-2 border-ui-divider bg-ui-surface text-ui-ink-strong',
        className,
      )}
    >
      <div className="font-chinese text-[22px] leading-normal sm:text-[26px]">{children}</div>
      {notes.map((note) => (
        <p key={note} className={cn('mt-0.5 text-sm font-extrabold', mine ? 'text-brand-on-primary/85' : 'text-ui-muted-strong')}>{note}</p>
      ))}
    </div>
  );
}
