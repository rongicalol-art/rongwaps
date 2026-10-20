import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import type { ListenClip } from '../../../types/models';
import { cn } from '../../../utils/cn';
import type { PracticeStatus } from '../practiceTypes';
import { PracticeCharacterPrompt } from './PracticeCharacterPrompt';

type ClipState = 'idle' | 'playing' | 'failed';

/**
 * The recording of a listening item: one big speaker button. It plays the book's own dialogue
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
      <div className="flex w-full max-w-60 flex-col items-start gap-2">
        <ActionButton
          aria-label={state === 'playing' ? 'Playing the recording' : 'Play the recording'}
          size="lg"
          variant="secondary"
          radius="feature"
          fullWidth
          onClick={() => play(true)}
          className="h-24 !p-0 sm:h-28"
        >
          <AppIcon name="audio" size={44} className={cn('text-brand-primary', state === 'playing' && 'motion-safe:animate-pulse')} />
        </ActionButton>
        {state === 'failed' && <p role="status" className="text-sm font-bold text-ui-muted-strong">The recording would not play. Tap to try again, or skip.</p>}
      </div>
    </PracticeCharacterPrompt>
  );
}
