import { cn } from '../../../utils/cn';

export type BookBlankState = 'empty' | 'next' | 'filled' | 'correct' | 'wrong' | 'revealed';

interface BookBlankProps {
  state: BookBlankState;
  /** The item is not the one being answered: blanks sit quieter on the canvas. */
  quiet: boolean;
  /** A build line with many blanks: narrower boxes. */
  narrow?: boolean;
  /** The word placed in this blank; tapping it takes it back while the item is open. */
  word?: { text: string; onTakeBack?: () => void };
}

const FILL: Record<BookBlankState, string> = {
  empty: '',
  next: 'bg-brand-primary-soft shadow-[inset_0_0_0_2.5px_var(--color-brand-primary)]',
  filled: 'bg-brand-primary-soft text-brand-primary-deep shadow-[inset_0_0_0_2px_var(--color-brand-primary-soft-edge)]',
  correct: 'bg-feedback-success-surface text-feedback-success-text',
  wrong: 'bg-feedback-danger-surface text-feedback-danger-text',
  revealed: 'bg-ui-divider text-ui-ink-strong',
};

/** A blank on a Book 1 exercise page: a soft box sitting on the text line, holding the word placed in it. */
export function BookBlank({ state, quiet, narrow, word }: BookBlankProps) {
  const fill = state === 'empty' ? (quiet ? 'bg-ui-divider' : 'bg-ui-hover') : FILL[state];
  return (
    <span
      className={cn(
        'mx-[0.08em] inline-block h-[1.4em] rounded-xs px-[0.2em] text-center align-baseline leading-[1.4em] sm:rounded-sm',
        narrow ? 'min-w-[1.5em]' : 'min-w-[1.7em]',
        fill,
      )}
    >
      {word ? (
        <button
          type="button"
          disabled={!word.onTakeBack}
          onClick={word.onTakeBack}
          aria-label={word.onTakeBack ? `Take back ${word.text}` : word.text}
          className="inline select-none [font:inherit] focus-ring-inline enabled:hover:opacity-75"
        >
          {word.text}
        </button>
      ) : (
        // Zero-width text keeps the empty box on the same baseline as its neighbours.
        <span aria-hidden="true">{'​'}</span>
      )}
    </span>
  );
}
