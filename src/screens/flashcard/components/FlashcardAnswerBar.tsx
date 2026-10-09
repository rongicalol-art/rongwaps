import { useEffect, useState } from 'react';
import { ActionButton } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface FlashcardAnswerBarProps {
  isFlipped: boolean;
  onFlip: () => void;
  onAgain: () => void;
  onGotIt: () => void;
  /** `review` tints the bar and makes Got it amber while missed cards come back. */
  tone?: 'default' | 'review';
  /** Hidden while the review intro plays; the intro raises it in. */
  concealed?: boolean;
}

/** Key hint: only on devices with a precise pointer, never on touch; fades out once `visible` is false. */
function KeyChip({ children, className, visible }: { children: string; className: string; visible: boolean }) {
  return (
    <kbd
      className={`absolute right-4 top-1/2 hidden -translate-y-1/2 min-w-6 rounded-compact border-2 border-b-[3px] px-1.5 py-px text-center text-xs font-black transition-opacity duration-300 pointer-fine:inline ${visible ? '' : 'opacity-0'} ${className}`}
    >
      {children}
    </kbd>
  );
}

const HINT_MS = 3000;
/** Each hint set (front: Space, back: 1 / 2) is taught once per page load, on the first card. */
const hintsSeen = { front: false, back: false };

/** Under-card controls: reveal the answer, then grade it with one of two choices. */
export function FlashcardAnswerBar({ isFlipped, onFlip, onAgain, onGotIt, tone = 'default', concealed = false }: FlashcardAnswerBarProps) {
  const [hintsVisible, setHintsVisible] = useState(() => !hintsSeen[isFlipped ? 'back' : 'front']);
  useEffect(() => {
    const phase = isFlipped ? 'back' : 'front';
    if (hintsSeen[phase]) {
      setHintsVisible(false);
      return undefined;
    }
    setHintsVisible(true);
    const timer = window.setTimeout(() => {
      hintsSeen[phase] = true;
      setHintsVisible(false);
    }, HINT_MS);
    return () => window.clearTimeout(timer);
  }, [isFlipped]);

  // Hard / Flip card: neutral while learning, a warm honey tone while reviewing.
  const review = tone === 'review';
  const quietEdge = review ? 'var(--color-review-line)' : 'var(--color-ui-divider)';
  const quietClass = review ? '!border-review-line !text-review-ink' : '!border-ui-divider !text-ui-muted-strong';
  const quietChip = review ? 'border-review-line bg-ui-surface text-review-ink' : 'border-ui-divider bg-ui-surface text-ui-muted';

  return (
    <div className={cn('rw-answer-bar pointer-events-auto w-full shrink-0 border-t-2 border-ui-divider px-4 pb-sheet-safe pt-4 sm:px-8', 'bg-ui-practice-canvas', concealed && 'opacity-0')}>
      <div className="mx-auto w-full max-w-md">
      {isFlipped ? (
        <div className="grid grid-cols-2 gap-3">
          <ActionButton variant="secondary" size="lg" fullWidth onClick={onAgain} edgeColor={quietEdge} className={quietClass}>
            <span className="text-[17px] font-black">Hard</span>
            <KeyChip visible={hintsVisible} className={quietChip}>1</KeyChip>
          </ActionButton>
          <ActionButton
            size="lg"
            fullWidth
            onClick={onGotIt}
            edgeColor={tone === 'review' ? 'var(--color-review-soft-edge)' : undefined}
            className={tone === 'review' ? '!bg-review-soft !text-ui-ink-strong' : undefined}
          >
            <span className="text-[17px] font-black">Got it</span>
            <KeyChip visible={hintsVisible} className={tone === 'review' ? 'border-ui-ink-strong/30 bg-white/50 text-ui-ink-strong' : 'border-white/40 bg-white/15 text-white'}>2</KeyChip>
          </ActionButton>
        </div>
      ) : (
        <ActionButton
          variant="secondary"
          size="lg"
          fullWidth
          onClick={onFlip}
          edgeColor={quietEdge}
          className={quietClass}
        >
          <span className="text-[17px] font-black">Flip card</span>
          <KeyChip visible={hintsVisible} className={quietChip}>Space</KeyChip>
        </ActionButton>
      )}
      </div>
    </div>
  );
}
