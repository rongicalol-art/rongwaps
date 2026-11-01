import { ActionButton, SpeakerIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface TestSpeakerProps {
  playing: boolean;
  /** Plays started so far (exam mode). */
  plays: number;
  /** Exam mode: the recording plays on its own this many times and can't be replayed. */
  maxPlays: number | null;
  onReplay: () => void;
}

/**
 * The recording. In the test it is a flat disc (nothing to press, like TOCFL) with one dot per play;
 * in the Fix round it is a real button that plays it again.
 */
export function TestSpeaker({ playing, plays, maxPlays, onReplay }: TestSpeakerProps) {
  if (maxPlays === null) {
    return (
      <ActionButton radius="feature" size="lg" onClick={onReplay} aria-label="Play the recording again" className="h-26 w-28 !px-0">
        <SpeakerIcon status={playing ? 'playing' : null} size={44} />
      </ActionButton>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        role="img"
        aria-label={`Recording plays ${maxPlays === 2 ? 'twice' : 'once'}`}
        className={cn(
          'flex h-24 w-24 items-center justify-center rounded-full transition-colors duration-300',
          playing ? 'bg-brand-primary text-brand-on-primary' : 'bg-brand-primary-wash text-brand-primary-text',
        )}
      >
        <SpeakerIcon status={playing ? 'playing' : null} size={44} />
      </div>
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: maxPlays }, (_, index) => (
          <i key={index} className={cn('h-2 w-2 rounded-full transition-colors duration-300', index < plays ? 'bg-brand-primary-track' : 'bg-brand-primary')} />
        ))}
      </div>
    </div>
  );
}
