import { ActionButton, AppIcon, KeyChip } from '../../../lib/widgets';
import type { SentenceSession } from '../hooks/useSentenceSession';

/**
 * The reader's bottom controls: Flow, the one main action (Show → Next → Finish) and Replay.
 * It sits in the answer-bar slot, so it clears the practice mode dock when that is shown.
 */
export function SentenceDock({ session }: { session: SentenceSession }) {
  const { current, currentIndex, deck, openIds, flowStatus, primaryAction, toggleFlow, pauseFlow, play } = session;
  const isOpen = Boolean(current && openIds.has(current.record.id));
  const isLast = currentIndex >= deck.length - 1;
  const label = !isOpen ? 'Show' : isLast ? 'Finish' : 'Next';
  const isFlowing = flowStatus === 'playing';

  return (
    <div className="rw-answer-bar pointer-events-auto w-full shrink-0 px-4 pb-sheet-safe pt-3 sm:px-8">
      <div className="mx-auto grid w-full max-w-md grid-cols-[auto_1fr_auto] items-center gap-3">
        <ActionButton
          variant="secondary"
          size="lg"
          aria-label={isFlowing ? 'Pause Flow' : 'Flow: play every sentence'}
          aria-pressed={isFlowing}
          onClick={toggleFlow}
          className={isFlowing ? 'text-brand-primary' : undefined}
        >
          <AppIcon name={isFlowing ? 'pause' : 'flow'} size={22} />
        </ActionButton>
        <ActionButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => { pauseFlow(); primaryAction(); }}
          className="uppercase tracking-wider"
        >
          <span className="relative">
            {label}
            <KeyChip className="border-white/50 text-white">Space</KeyChip>
          </span>
        </ActionButton>
        {current?.record.audio ? (
          <ActionButton
            variant="secondary"
            size="lg"
            aria-label="Play the sentence again"
            onClick={() => { pauseFlow(); void play(current); }}
          >
            <AppIcon name="audio" size={22} />
          </ActionButton>
        ) : (
          <span aria-hidden="true" className="w-[58px]" />
        )}
      </div>
    </div>
  );
}
