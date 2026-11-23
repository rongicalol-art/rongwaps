import { useEffect, useState } from 'react';
import { Avatar } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { useProfileAvatar } from '../../../hooks/useProfileAvatar';
import { ghostAnswered } from '../../../../shared/challenge';
import { socialColor } from '../../../../shared/quizRace';
import { FILL } from './RaceRiders';

const TICK_MS = 250;

/** True while a challenge quiz is on screen: the header adds the sender's ghost to its progress bar. */
export const useChallengeRide = () => useAppStore((state) => state.challengePlaying && state.challenge !== null);

/**
 * The challenge's progress bar riders, in the race's style: my face under my own progress, and the sender's face
 * moving at the pace they answered (a replay of their first pass). The ghost steps aside once my first pass ends.
 */
export function ChallengeGhost({ answered, total }: { answered: number; total: number }) {
  const link = useAppStore((state) => (state.challengePlaying ? state.challenge : null));
  const startedAt = useAppStore((state) => state.challengeStartedAt);
  const doneMs = useAppStore((state) => state.challengeDoneMs);
  const name = useAppStore((state) => state.displayName.trim() || 'You');
  const color = useAppStore((state) => state.avatarColor);
  const photo = useProfileAvatar();
  const [now, setNow] = useState(() => Date.now());
  const ghostDone = link && startedAt !== null ? ghostAnswered(link.run, now - startedAt) >= link.total : false;
  useEffect(() => {
    if (!link || startedAt === null || doneMs !== null || ghostDone) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [link, startedAt, doneMs, ghostDone]);
  if (!link || startedAt === null || doneMs !== null) return null;
  const share = (done: number, of: number) => Math.max(0.04, Math.min(1, of > 0 ? done / of : 0));
  const riders = [
    { key: 'ghost', name: link.name, color: link.color, src: undefined, share: share(ghostAnswered(link.run, now - startedAt), link.total) },
    { key: 'me', name, color: socialColor(color), src: photo, share: share(answered, total) },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {riders.map((rider) => (
        <span
          key={rider.key}
          className="absolute top-[calc(50%+0.75rem)] flex h-7 w-7 transition-[left] duration-500 ease-out motion-reduce:transition-none"
          style={{ left: `clamp(0px, calc(${rider.share * 100}% - 14px), calc(100% - 28px))` }}
        >
          <span className={`grid h-7 w-7 place-items-center rounded-full border-2 border-ui-surface p-px ${FILL[rider.color]}`}>
            <Avatar name={rider.name} color={rider.color} size="sm" src={rider.src} className="size-full! ring-0!" />
          </span>
        </span>
      ))}
    </div>
  );
}
