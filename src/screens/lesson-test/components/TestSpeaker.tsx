import { motion, useReducedMotion } from 'motion/react';
import { AppIcon, SpeakerIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import type { TestFace } from '../hooks/useTestAudio';

interface TestSpeakerProps {
  /** What is playing; null while nothing plays (before, between and after the plays). */
  face: TestFace | null;
  playing: boolean;
  /** Plays started so far (exam mode). */
  plays: number;
  /** Exam mode: the recording plays on its own this many times and can't be replayed. */
  maxPlays: number | null;
  onReplay: () => void;
}

const GLYPHS: (TestFace | 'idle')[] = ['idle', 'voice', 'wait', 'ding', 'question', 'A', 'B', 'C', 'D'];

/** The key's face: one glyph at a time, each popping in as the recording reaches it. */
function Glyph({ face }: { face: TestFace | null }) {
  const reduceMotion = useReducedMotion();
  const shown = face ?? 'idle';
  return (
    <span aria-hidden className="grid place-items-center">
      {GLYPHS.map((glyph) => (
        <span
          key={glyph}
          className={cn(
            'col-start-1 row-start-1 grid place-items-center text-4xl font-black leading-none transition-[opacity,scale] duration-300 ease-[cubic-bezier(.3,1.6,.5,1)] motion-reduce:transition-none',
            glyph === shown ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        >
          {glyph === 'idle' && <SpeakerIcon size={44} />}
          {glyph === 'voice' && <SpeakerIcon status="playing" size={44} />}
          {glyph === 'wait' && (
            <span className="flex gap-1.5">
              {[0, 1, 2].map((dot) => (
                <motion.i
                  key={`${dot}-${shown === 'wait'}`}
                  initial={reduceMotion || shown !== 'wait' ? false : { opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: dot * 0.6, duration: 0.25 }}
                  className="block size-2.5 rounded-full bg-current"
                />
              ))}
            </span>
          )}
          {glyph === 'ding' && (
            <motion.span
              key={String(shown === 'ding')}
              animate={reduceMotion || shown !== 'ding' ? undefined : { rotate: [0, 16, -13, 8, 0] }}
              transition={{ duration: 0.7 }}
              style={{ transformOrigin: '50% 10%' }}
              className="grid"
            >
              <AppIcon name="bell" size={42} />
            </motion.span>
          )}
          {glyph === 'question' && '?'}
          {glyph.length === 1 && glyph}
        </span>
      ))}
    </span>
  );
}

/**
 * The recording as a tactile key. In the test the recording presses it: down while a play runs, up between
 * the two plays, and it stays down once both have played (TOCFL plays twice, no replays), full colour, so it
 * reads as used rather than broken. In the Fix round it is a real button that plays it again. Its face shows what is playing.
 */
export function TestSpeaker({ face, playing, plays, maxPlays, onReplay }: TestSpeakerProps) {
  const exam = maxPlays !== null;
  const spent = exam && !playing && plays >= maxPlays;
  const pressed = face !== null || spent;
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
        <Glyph face={face} />
      </span>
    </>
  );

  if (!exam) {
    return (
      <button type="button" onClick={onReplay} aria-label="Play the recording again" className="group relative block rounded-feature outline-none focus-ring">
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
