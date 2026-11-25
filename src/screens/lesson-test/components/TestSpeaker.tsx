import { AppIcon, SpeakerIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import type { TestFace } from '../hooks/useTestAudio';

interface TestSpeakerProps {
  /** Whether the recording is playing, loading, or needs a retry; null while idle. */
  face: TestFace | null;
  playing: boolean;
  /** Plays started so far (exam mode). */
  plays: number;
  /** Exam mode: the recording plays on its own this many times and can't be replayed. */
  maxPlays: number | null;
  onReplay: () => void;
  /** A recording couldn't play: the key becomes a button that plays it again (the failed play isn't used up). */
  onRetry?: () => void;
}

/**
 * The recording as a tactile key. In the test the recording presses it: down while a play runs, up between
 * the two plays, and it stays down once both have played (TOCFL plays twice, no replays), full colour, so it
 * reads as used rather than broken. In the Fix round it is a real button that plays it again.
 */
export function TestSpeaker({ face, playing, plays, maxPlays, onReplay, onRetry }: TestSpeakerProps) {
  const failed = face === 'retry';
  const loading = face === 'loading';
  const exam = maxPlays !== null && !failed;
  const spent = exam && !playing && plays >= maxPlays;
  // Up while it downloads (nothing plays yet) and when it offers a retry (it's a button then).
  const active = face !== null && !loading && !failed;
  const pressed = active || spent;
  const icon = failed
    ? <AppIcon name="restart" size={40} />
    : <SpeakerIcon status={loading ? 'loading' : active ? 'playing' : null} size={44} />;
  const key = (
    <>
      <span aria-hidden className="absolute inset-x-0 bottom-0 top-[length:var(--depth-xl)] rounded-feature bg-brand-primary-edge" />
      <span
        className={cn(
          'relative mb-[length:var(--depth-xl)] flex h-24 w-28 items-center justify-center rounded-feature bg-brand-primary text-brand-on-primary transition-[translate] duration-150 ease-out',
          pressed && 'translate-y-[length:var(--depth-xl)]',
          !exam && 'group-active:translate-y-[length:var(--depth-xl)]',
        )}
      >
        {icon}
      </span>
    </>
  );

  if (!exam) {
    return (
      <button
        type="button"
        onClick={failed ? onRetry : onReplay}
        aria-label={failed ? "The recording didn't load. Try again" : 'Play the recording again'}
        className="group relative block rounded-feature outline-none focus-ring"
      >
        {key}
      </button>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div role="img" aria-label={`Recording plays ${maxPlays === 2 ? 'twice' : 'once'}`} className="relative block">{key}</div>
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: maxPlays }, (_, index) => (
          <i key={index} className={cn('h-2 w-2 rounded-full transition-colors duration-300', index < plays ? 'bg-brand-primary-track' : 'bg-brand-primary')} />
        ))}
      </div>
    </div>
  );
}
