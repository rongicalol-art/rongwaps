import { useEffect, useState } from 'react';
import { ActionButton, KeyChip } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface FlashcardAnswerBarProps {
  isFlipped: boolean;
  onFlip: () => void;
  onHard: () => void;
  onUnsure: () => void;
  onGotIt: () => void;
  /** Hidden while the review intro plays (the intro raises it in) and under Cards done, which brings its own buttons. */
  concealed?: boolean;
}

const HINT_MS = 3000;
/** Each hint set (front: Space, back: 1 / 2 / 3) is taught once per page load, on the first card. */
const hintsSeen = { front: false, back: false };

/** Under-card controls: reveal the answer, then grade it with three choices. */
export function FlashcardAnswerBar({ isFlipped, onFlip, onHard, onUnsure, onGotIt, concealed = false }: FlashcardAnswerBarProps) {
  const [hintsVisible, setHintsVisible] = useState(() => !hintsSeen[isFlipped ? 'back' : 'front']);
  useEffect(() => {
    const phase = isFlipped ? 'back' : 'front';
    if (hintsSeen[phase]) {
      setHintsVisible(false);
      return undefined;
    }
    setHintsVisible(true);
    if (concealed) return undefined;

    // Count only visible time, and don't restart the hint if the learner flips quickly.
    hintsSeen[phase] = true;
    const timer = window.setTimeout(() => {
      setHintsVisible(false);
    }, HINT_MS);
    return () => window.clearTimeout(timer);
  }, [concealed, isFlipped]);

  const hintedLabelClass = cn(
    'relative motion-safe:transition-transform duration-200',
    hintsVisible && 'pointer-fine:-translate-x-3',
  );

  return (
    <div className={cn('rw-answer-bar pointer-events-auto w-full shrink-0 border-t-2 border-ui-divider px-4 pb-sheet-safe pt-4 sm:px-8', 'bg-ui-practice-canvas transition-opacity duration-200', concealed && 'pointer-events-none opacity-0')}>
      <div className="mx-auto w-full max-w-md">
      {isFlipped ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <ActionButton
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onHard}
            edgeColor="color-mix(in srgb, var(--color-feedback-danger-edge) 50%, var(--color-ui-border))"
            className="!text-feedback-danger-edge/80"
          >
            <span className={hintedLabelClass}>
              Forgot
              <KeyChip visible={hintsVisible} className="border-ui-border text-ui-muted">1</KeyChip>
            </span>
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onUnsure}
            edgeColor="color-mix(in srgb, var(--color-feedback-warning-edge) 50%, var(--color-ui-border))"
            className="!text-feedback-warning-ink/80"
          >
            <span className={hintedLabelClass}>
              With effort
              <KeyChip visible={hintsVisible} className="border-ui-border text-ui-muted">2</KeyChip>
            </span>
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onGotIt}
            edgeColor="color-mix(in srgb, var(--color-feedback-success-edge) 50%, var(--color-ui-border))"
            className="!text-feedback-success-edge/80"
          >
            <span className={hintedLabelClass}>
              Got it
              <KeyChip visible={hintsVisible} className="border-ui-border text-ui-muted">3</KeyChip>
            </span>
          </ActionButton>
        </div>
      ) : (
        <ActionButton
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onFlip}
          className="!text-ui-muted-strong"
        >
          <span className={hintedLabelClass}>
            Flip card
            <KeyChip visible={hintsVisible} className="border-ui-border text-ui-muted">Space</KeyChip>
          </span>
        </ActionButton>
      )}
      </div>
    </div>
  );
}
