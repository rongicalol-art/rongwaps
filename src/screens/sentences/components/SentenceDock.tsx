import { ActionButton, AppIcon, KeyChip } from '../../../lib/widgets';
import type { SentenceSession } from '../hooks/useSentenceSession';

/**
 * The reader's bottom controls: Next (plays the next sentence; Finish on the last) and Replay.
 * It sits in the answer-bar slot, so it clears the practice mode dock when that is shown.
 */
export function SentenceDock({ session }: { session: SentenceSession }) {
  const { current, currentIndex, deck, next, play } = session;
  const isLast = currentIndex >= deck.length - 1;

  return (
    <div className="rw-answer-bar pointer-events-auto w-full shrink-0 px-4 pb-sheet-safe pt-3 sm:px-8">
      <div className="mx-auto flex w-full max-w-md items-center gap-3">
        <ActionButton variant="primary" size="lg" fullWidth onClick={next} className="uppercase tracking-wider">
          <span className="relative">
            {isLast ? 'Finish' : 'Next'}
            <KeyChip className="border-white/50 text-white">Space</KeyChip>
          </span>
        </ActionButton>
        {current?.record.audio && (
          <ActionButton variant="secondary" size="lg" aria-label="Play the sentence" onClick={() => { void play(current); }}>
            <AppIcon name="audio" size={22} />
          </ActionButton>
        )}
      </div>
    </div>
  );
}
