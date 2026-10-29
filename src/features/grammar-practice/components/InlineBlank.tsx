import { motion } from 'motion/react';
import { cn } from '../../../utils/cn';
import { WORD_FLIGHT } from '../practiceMotion';

export interface DragHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onClickCapture: (event: { stopPropagation: () => void; preventDefault: () => void }) => void;
  style: { touchAction: 'none' };
}

export type BlankState = 'empty' | 'next' | 'filled' | 'correct' | 'wrong';

interface InlineBlankProps {
  state: BlankState;
  /** `onPrimary` inside the learner's blue chat bubble. */
  tone?: 'plain' | 'onPrimary';
  /** The placed word, with the layoutId of its dock tile. */
  word?: {
    text: string;
    /** Left out when the word was dropped by hand, so it settles in place instead of flying from the dock. */
    layoutId?: string;
    onTakeBack: () => void;
    disabled: boolean;
    /** Pointer handlers that let the learner pick the word up again. */
    drag?: DragHandlers;
    /** This word is the one being carried. */
    carried?: boolean;
  };
  /** Marks this spot as somewhere a dragged word can land. */
  slotId?: string;
  /** A word is being carried over this spot: open room for it, this wide (px). */
  openFor?: number;
  /** Makes the empty blank itself tappable (choose which blank the dock fills). */
  onSelect?: () => void;
  /** Spoken name of a selectable blank. */
  selectLabel?: string;
  /** A spot between words (place-the-word): a thin caret instead of an underline. */
  gap?: boolean;
}

const CARET: Record<'plain' | 'onPrimary', string> = {
  plain: 'bg-ui-muted group-hover:bg-brand-primary',
  onPrimary: 'bg-brand-on-primary/60 group-hover:bg-brand-on-primary',
};

const OPEN_LINE: Record<'plain' | 'onPrimary', string> = {
  plain: 'border-brand-primary',
  onPrimary: 'border-brand-on-primary',
};

const LINE: Record<'plain' | 'onPrimary', Record<BlankState, string>> = {
  plain: {
    empty: 'border-ui-divider',
    next: 'border-ui-muted',
    filled: 'border-ui-border',
    correct: 'border-feedback-success',
    wrong: 'border-feedback-danger',
  },
  onPrimary: {
    empty: 'border-brand-on-primary/45',
    next: 'border-brand-on-primary',
    filled: 'border-brand-on-primary/60',
    correct: 'border-feedback-success-surface',
    wrong: 'border-feedback-danger-surface',
  },
};

/**
 * A blank in a sentence: an underline on the text's baseline. A placed word is
 * ordinary sentence text on that line (tap it to send it back to the dock).
 */
export function InlineBlank({ state, tone = 'plain', word, onSelect, selectLabel, gap, slotId, openFor }: InlineBlankProps) {
  const open = openFor !== undefined;
  if (!word && gap) {
    // Wide, invisible tap area around a short caret, so a gap between two characters is easy to hit.
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        aria-label={selectLabel}
        data-drop-slot={slotId}
        style={{ width: open ? `${openFor + 12}px` : undefined }}
        className="group -mx-[0.12em] inline-flex h-[1.2em] w-[0.5em] items-center justify-center align-[-0.15em] transition-[width] duration-150 ease-out focus-ring-inline motion-reduce:transition-none"
      >
        <span
          aria-hidden="true"
          className={cn(
            'transition-all duration-150 motion-reduce:transition-none',
            open
              ? cn('h-[1.1em] w-full rounded-md border-2 border-dashed', tone === 'plain' ? 'border-brand-primary bg-brand-primary-soft' : 'border-brand-on-primary bg-brand-on-primary/15')
              : cn('h-[0.85em] w-[3px] rounded-full', CARET[tone]),
          )}
        />
      </button>
    );
  }
  if (!word && onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={selectLabel}
        data-drop-slot={slotId}
        style={{ minWidth: open ? `${openFor}px` : undefined }}
        className={cn('mx-[0.08em] inline-block min-w-[1.6em] border-b-[3px] pb-px align-baseline [font:inherit] leading-[1.2] transition-[min-width,border-color] duration-150 focus-ring-inline motion-reduce:transition-none', open ? OPEN_LINE[tone] : LINE[tone][state])}
      >
        <span aria-hidden="true">{'\u200b'}</span>
      </button>
    );
  }
  return (
    <span
      data-drop-slot={slotId}
      style={{ minWidth: open ? `${openFor}px` : undefined }}
      className={cn(
        'mx-[0.08em] inline-block border-b-[3px] pb-px text-center align-baseline leading-[1.2] transition-[min-width,border-color] duration-150 motion-reduce:transition-none',
        word ? 'min-w-0' : 'min-w-[1.6em]',
        open ? OPEN_LINE[tone] : LINE[tone][state],
      )}
    >
      {word ? (
        <motion.button
          type="button"
          layout="position"
          layoutId={word.layoutId}
          transition={WORD_FLIGHT}
          disabled={word.disabled}
          onClick={word.onTakeBack}
          aria-label={`Take back ${word.text}`}
          {...word.drag}
          className={cn(
            'inline select-none px-[0.06em] align-baseline [font:inherit] focus-ring-inline enabled:hover:opacity-75',
            word.carried && 'opacity-30',
            tone === 'plain' && state === 'correct' && 'text-feedback-success-text',
            tone === 'plain' && state === 'wrong' && 'text-feedback-danger-text',
          )}
        >
          {word.text}
        </motion.button>
      ) : (
        // Zero-width text gives the empty blank the same baseline as its neighbours.
        <span aria-hidden="true">{'​'}</span>
      )}
    </span>
  );
}
