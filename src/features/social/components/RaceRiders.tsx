import { Avatar } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { useProfileAvatar } from '../../../hooks/useProfileAvatar';
import { socialColor, type SocialColor } from '../../../../shared/quizRace';

/** Solid fill per profile colour. */
const FILL: Record<SocialColor, string> = {
  blue: 'bg-brand-primary',
  honey: 'bg-feedback-warning',
  jade: 'bg-feedback-success',
  plum: 'bg-[var(--color-avatar-plum-ink)]',
  ink: 'bg-ui-ink-strong',
};

/** True while a race is on: the header hands its progress bar over to `RaceBar`. */
export const useRaceFill = () => useAppStore((state) => state.racePlaying);

/** One solid bar in my colour with every player's face just below their position. */
export function RaceBar() {
  const race = useAppStore((state) => (state.racePlaying ? state.race : null));
  const me = useAppStore((state) => state.socialMe);
  const photo = useProfileAvatar();
  if (!race) return null;
  const riders = race.players
    .filter((player) => !player.left)
    .map((player) => {
      const progress = player.total > 0 ? Math.min(1, player.answered / player.total) : 0;
      return { player, share: Math.max(0.04, Math.min(player.finishedAt === null && progress === 1 ? 0.97 : 1, progress)) };
    });
  const mine = riders.find((r) => r.player.id === me) ?? riders[0];
  if (!mine) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded-full">
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${FILL[socialColor(mine.player.color)]}`}
          style={{ width: `${mine.share * 100}%` }}
        >
          {/* Shine lives inside the fill so it can never run ahead of it. */}
          <span className="absolute inset-x-2 top-1 h-1.5 rounded-full bg-white/30" />
        </span>
      </div>
      {riders.map(({ player, share }) => {
        const fill = FILL[socialColor(player.color)];
        return (
          <span key={player.id} className="absolute top-[calc(50%+0.75rem)] flex h-7 w-7 transition-[left] duration-500 ease-out motion-reduce:transition-none" style={{ left: `clamp(0px, calc(${share * 100}% - 14px), calc(100% - 28px))` }}>
            <span className={`grid h-7 w-7 place-items-center rounded-full border-2 border-ui-surface p-px ${fill}`}>
              <Avatar name={player.name} color={socialColor(player.color)} size="sm" src={player.id === me ? photo : player.image} className="size-full! ring-0!" />
            </span>
          </span>
        );
      })}
    </div>
  );
}
