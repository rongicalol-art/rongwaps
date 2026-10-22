import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import type { ListenClip } from '../../../types/models';
import { cn } from '../../../utils/cn';
import type { PracticeStatus } from '../practiceTypes';
import { BUBBLE_TAIL } from './PracticeBubble';
import { PracticeCharacterPrompt } from './PracticeCharacterPrompt';

type ClipState = 'idle' | 'playing' | 'failed';

/** Heights (%) of the voice-message bars: fixed, so a clip always looks the same. */
const WAVE = [30, 55, 80, 45, 95, 60, 35, 70, 50, 90, 40, 65, 85, 45, 30, 60, 75, 40, 55, 25];

/**
 * The recording of a listening item: the character's voice message: play and a waveform that lights up while it plays. It plays the book's own dialogue
 * (never text-to-speech) from `start` to `end`, and a tap plays it again. It also plays once as
 * the item opens when the learner's `autoPlayAudio` setting is on; a browser that blocks that
 * quietly leaves the button for a tap.
 */
export function ClipButton({ clip: { file, start, end }, status }: { clip: ListenClip; status: PracticeStatus }) {
  const rate = useAppStore((state) => state.pronunciationRate);
  const autoPlayAudio = useAppStore((state) => state.autoPlayAudio);
  const [state, setState] = useState<ClipState>('idle');
  const latest = useRef({ rate, autoPlayAudio });
  latest.current = { rate, autoPlayAudio };
  /** Each play gets a number; a play that was replaced or stopped no longer touches the button. */
  const run = useRef(0);

  const play = useCallback((tapped: boolean) => {
    const token = run.current + 1;
    run.current = token;
    setState('playing');
    void audioService.playRange(file, start, end, {
      rate: latest.current.rate,
      onUnavailable: () => { if (run.current === token) setState(tapped ? 'failed' : 'idle'); },
    }).then(() => { if (run.current === token) setState((now) => (now === 'failed' ? now : 'idle')); });
  }, [file, start, end]);

  useEffect(() => {
    if (latest.current.autoPlayAudio) play(false);
    return () => { run.current += 1; audioService.pause(); };
  }, [play]);

  return (
    <PracticeCharacterPrompt status={status} speaking={state === 'playing'} waiting>
      <div className="flex w-full flex-col items-start gap-2">
        <div className={cn(BUBBLE_TAIL, 'flex w-fit max-w-full items-center gap-3 border-2 border-ui-divider bg-ui-surface p-3 pr-4')}>
          <ActionButton
            aria-label={state === 'playing' ? 'Playing the recording' : 'Play the recording'}
            size="md"
            variant="primary"
            className="w-14 !px-0"
            onClick={() => play(true)}
          >
            <AppIcon name="audio" size={26} />
          </ActionButton>
          <div className="flex h-10 items-center gap-[3px]" aria-hidden="true">
            {WAVE.map((height, index) => (
              <span
                key={index}
                style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }}
                className={cn('w-1 rounded-xs transition-colors', state === 'playing' ? 'bg-brand-primary motion-safe:animate-pulse' : 'bg-brand-primary-track')}
              />
            ))}
          </div>
        </div>
        {state === 'failed' && <p role="status" className="text-sm font-extrabold text-ui-muted-strong">The recording would not play. Tap to try again, or skip.</p>}
      </div>
    </PracticeCharacterPrompt>
  );
}
