import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';
import type { StudyStreak } from '../../../hooks/useStudyStreak';

const flameArt = new URL('../../../assets/icons/flat/flame.svg', import.meta.url).href;

/**
 * "6 day streak" under the Learn title. The flame stays grey until something is studied today, then lights up
 * with a small pop (seen as the learner comes back from the practice window that kept the streak).
 */
export function HeaderStreak({ streak, studiedToday }: StudyStreak) {
  const flameRef = useRef<HTMLImageElement>(null);
  const wasLit = useRef(studiedToday);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (studiedToday && !wasLit.current && !reduceMotion) {
      flameRef.current?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.45) rotate(-6deg)', offset: 0.35 }, { transform: 'scale(1)' }],
        { duration: 700, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      );
    }
    wasLit.current = studiedToday;
  }, [studiedToday, reduceMotion]);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors duration-500',
        studiedToday ? 'text-streak-text' : 'text-ui-muted-strong',
      )}
      aria-label={`${streak} day streak${studiedToday ? '' : ', study today to keep it'}`}
    >
      <img
        ref={flameRef}
        src={flameArt}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={cn('h-4 w-4 transition-[filter,opacity] duration-500', !studiedToday && 'opacity-60 [filter:var(--art-rest)]')}
      />
      <span aria-hidden="true">{streak} day streak</span>
    </span>
  );
}
