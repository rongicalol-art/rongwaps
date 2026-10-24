import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { SentenceSession } from '../hooks/useSentenceSession';

/**
 * The reader's touch controls: Next (plays the next sentence; Finish on the last) and Play. Hidden
 * with a mouse or trackpad, where Space plays and the arrows move. It sits in the answer-bar slot,
 * so it clears the practice mode dock when that is shown.
 */
export function SentenceDock({ session }: { session: SentenceSession }) {
  const { current, currentIndex, deck, next, play, pauseFlow } = session;
  const isLast = currentIndex >= deck.length - 1;

  return (
    <div className="rw-answer-bar pointer-events-auto w-full shrink-0 px-4 pb-sheet-safe pt-3 pointer-fine:hidden sm:px-8">
      <div className="mx-auto flex w-full max-w-md items-center gap-3">
        <ActionButton variant="primary" size="lg" fullWidth onClick={() => { pauseFlow(); next(); }} className="uppercase tracking-wider">
          {isLast ? 'Finish' : 'Next'}
        </ActionButton>
        {current?.record.audio && (
          <ActionButton variant="secondary" size="lg" aria-label="Play the sentence" onClick={() => { pauseFlow(); void play(current); }}>
            <AppIcon name="audio" size={22} />
          </ActionButton>
        )}
      </div>
    </div>
  );
}
