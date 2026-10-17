import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface PracticeBubbleProps {
  /** `me` is the learner's reply (right, book blue). */
  side: 'them' | 'me';
  children: ReactNode;
  /** Small line under the sentence: pinyin, English, or the book's gloss. */
  notes?: string[];
}

/** One chat message. Every bubble shares one text size; sentences break at punctuation, not mid-word. */
export function PracticeBubble({ side, children, notes = [] }: PracticeBubbleProps) {
  const mine = side === 'me';
  return (
    <div
      className={cn(
        'max-w-[88%] rounded-feature px-5 py-3.5 [overflow-wrap:anywhere] [word-break:keep-all]',
        mine
          ? 'self-end rounded-br-xs bg-brand-primary text-brand-on-primary'
          : 'self-start rounded-bl-xs border-2 border-ui-divider bg-ui-surface text-ui-ink-strong',
      )}
    >
      <p className="font-chinese text-[22px] leading-normal sm:text-[26px]">{children}</p>
      {notes.map((note) => (
        <p key={note} className={cn('mt-0.5 text-sm font-bold', mine ? 'text-brand-on-primary/85' : 'text-ui-muted-strong')}>{note}</p>
      ))}
    </div>
  );
}
