import { motion } from 'motion/react';
import { cn } from '../../../utils/cn';
import { WORD_FLIGHT } from '../practiceMotion';

export type BlankState = 'empty' | 'next' | 'filled' | 'correct' | 'wrong';

interface InlineBlankProps {
  state: BlankState;
  /** `onPrimary` inside the learner's blue chat bubble. */
  tone?: 'plain' | 'onPrimary';
  /** The placed word, with the layoutId of its dock tile. */
  word?: { text: string; layoutId: string; onTakeBack: () => void; disabled: boolean };
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
export function InlineBlank({ state, tone = 'plain', word, onSelect, selectLabel, gap }: InlineBlankProps) {
  if (!word && gap) {
    // Wide, invisible tap area around a short caret, so a gap between two characters is easy to hit.
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        aria-label={selectLabel}
        className="group -mx-[0.12em] inline-flex h-[1.2em] w-[0.5em] items-center justify-center align-[-0.15em] focus-ring-inline"
      >
        <span aria-hidden="true" className={cn('h-[0.85em] w-[3px] rounded-full transition-colors', CARET[tone])} />
      </button>
    );
  }
  if (!word && onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={selectLabel}
        className={cn('mx-[0.08em] inline-block min-w-[1.6em] border-b-[3px] pb-px align-baseline [font:inherit] leading-[1.2] transition-colors focus-ring-inline', LINE[tone][state])}
      >
        <span aria-hidden="true">{'\u200b'}</span>
      </button>
    );
  }
  return (
    <span
      className={cn(
        'mx-[0.08em] inline-block border-b-[3px] pb-px text-center align-baseline leading-[1.2] transition-colors',
        word ? 'min-w-0' : 'min-w-[1.6em]',
        LINE[tone][state],
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
          className={cn(
            'inline px-[0.06em] align-baseline [font:inherit] focus-ring-inline enabled:hover:opacity-75',
            tone === 'plain' && state === 'correct' && 'text-feedback-success-edge',
            tone === 'plain' && state === 'wrong' && 'text-feedback-danger-edge',
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
