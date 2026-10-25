import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { SentenceSession } from '../hooks/useSentenceSession';

/**
 * The reader's one touch control: Play the focused sentence (scrolling moves between them). Hidden
 * with a mouse or trackpad, where Space opens (and plays) the card, Enter replays it and the arrows move. It sits in the answer-bar slot,
 * so it clears the practice mode dock when that is shown.
 */
export function SentenceDock({ session }: { session: SentenceSession }) {
  const { current, play, pauseFlow } = session;
  const hasAudio = Boolean(current?.record.audio);

  return (
    <div className="rw-answer-bar pointer-events-auto w-full shrink-0 px-4 pb-sheet-safe pt-3 pointer-fine:hidden sm:px-8">
      <ActionButton
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => { if (!current) return; pauseFlow(); void play(current); }}
        // A sentence without a recording keeps the dock's height but has nothing to play.
        className={hasAudio ? 'mx-auto max-w-md gap-2 uppercase tracking-wider' : 'invisible mx-auto max-w-md'}
        aria-hidden={!hasAudio}
        tabIndex={hasAudio ? undefined : -1}
      >
        <AppIcon name="audio" size={20} />
        Play
      </ActionButton>
    </div>
  );
}
