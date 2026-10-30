import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { RongWapsCharacterPortrait } from '../../../lib/widgets';
import type { RongWapsCharacter } from '../../../types/models';
import { QuizDemo } from './QuizDemo';

const RIDERS: { who: RongWapsCharacter; name: string }[] = [{ who: 'yifan', name: 'You' }, { who: 'meixin', name: '美心' }, { who: 'zhongming', name: '中明' }];
const START = [0.1, 0.14, 0.08];

/** A quiz race against two classmates, with every question type; their faces ride along the progress bar. */
export function PartyDemo() {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(START);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setProgress((now) => {
        const next = now.map((p, i) => (i === 0 ? p : Math.min(1, p + Math.random() * 0.05)));
        return next.some((p) => p >= 1) ? START : next;
      });
    }, 1100);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const answered = (correct: boolean) => {
    if (correct) setProgress((now) => (now[0] + 0.12 >= 1 ? START : [now[0] + 0.12, ...now.slice(1)]));
  };

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <div className="relative h-18" aria-hidden="true">
        <div className="absolute inset-x-0 top-2 h-5 overflow-hidden rounded-full bg-brand-primary-track">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-brand-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.max(4, progress[0] * 100)}%` }}
          >
            {/* Shine lives inside the fill so it can never run ahead of it. */}
            <span className="absolute inset-x-2 top-1 h-1.5 rounded-full bg-white/30" />
          </span>
        </div>
        {RIDERS.map((rider, i) => (
          <span key={rider.who} className="absolute top-8 size-10 overflow-hidden rounded-full border-[3px] border-ui-surface bg-ui-canvas transition-[left] duration-500 ease-out motion-reduce:transition-none" style={{ left: `clamp(0px, calc(${progress[i] * 100}% - 20px), calc(100% - 40px))` }}>
            <RongWapsCharacterPortrait character={rider.who} label={rider.name} className="size-full" />
          </span>
        ))}
      </div>
      <QuizDemo onResult={answered} />
    </div>
  );
}
