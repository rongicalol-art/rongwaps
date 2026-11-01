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
  next: 'border-brand-primary bg-brand-primary-soft',
  filled: 'border-brand-primary-soft-edge text-brand-primary-deep',
  correct: 'border-feedback-success text-feedback-success-text',
  wrong: 'border-feedback-danger text-feedback-danger-text',
  revealed: 'border-ui-muted text-ui-ink-strong',
};

/** A blank on a Book 1 exercise page: an underline on the text line, holding the word placed in it. */
export function BookBlank({ state, quiet, narrow, word }: BookBlankProps) {
  const fill = state === 'empty' ? (quiet ? 'border-ui-border' : 'border-ui-muted') : FILL[state];
  return (
    <span
      className={cn(
        'mx-[0.1em] inline-block h-[1.4em] border-b-[3px] px-[0.15em] text-center align-baseline leading-[1.3em]',
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
