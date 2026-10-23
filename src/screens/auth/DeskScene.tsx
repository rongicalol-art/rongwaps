import { useCallback, useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { LottiePlayer } from '../../lib/widgets';

const loadDeskAnimation = () => import('../../assets/animations/sign-in-desk.json').then((m) => m.default);

// Frame ranges in the desk animation: build-in, calm loop, fade-out.
const INTRO: [number, number] = [0, 153];
const IDLE: [number, number] = [153, 388];
const OUTRO: [number, number] = [392, 480];
const STILL_FRAME = 160;

/**
 * The desk builds itself once, then idles. While `leaving` (sign-in started) it plays
 * its fade-out, so the scene packs up as Google opens; it rebuilds if sign-in fails.
 */
export function DeskScene({ leaving, className }: { leaving: boolean; className?: string }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const phase = useRef<'intro' | 'idle' | 'outro'>('intro');
  const reduceMotion = useReducedMotion();

  const play = useCallback((next: 'intro' | 'outro') => {
    const player = lottieRef.current;
    if (!player) return;
    if (reduceMotion) {
      player.goToAndStop(next === 'outro' ? OUTRO[1] : STILL_FRAME, true);
      return;
    }
    phase.current = next;
    player.playSegments(next === 'outro' ? OUTRO : INTRO, true);
  }, [reduceMotion]);

  // The player runs with loop off, so each finished intro or idle pass queues the idle loop.
  const handleComplete = useCallback(() => {
    if (phase.current === 'outro') return;
    phase.current = 'idle';
    lottieRef.current?.playSegments(IDLE, true);
  }, []);

  const started = useRef(false);
  useEffect(() => {
    if (!started.current) return;
    play(leaving ? 'outro' : 'intro');
  }, [leaving, play]);

  return (
    <div aria-hidden="true" className={className}>
      {/* Without the flask the art sits low and left in its square; nudge it back to centre. */}
      <div className="size-full translate-x-[3.4%] -translate-y-[8.4%]">
        <LottiePlayer
          loadAnimationData={loadDeskAnimation}
          lottieRef={lottieRef}
          autoplay={false}
          loop={false}
          onDOMLoaded={() => {
            started.current = true;
            // DOMLoaded can fire before lottie-react fills the ref; start on the next frame.
            requestAnimationFrame(() => play('intro'));
          }}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
