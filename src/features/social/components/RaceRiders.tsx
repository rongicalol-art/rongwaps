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

/** One solid bar in my colour with my face at its end; everyone else is a small pinned face above the bar, pointing at their spot. */
export function RaceBar() {
  const race = useAppStore((state) => (state.racePlaying ? state.race : null));
  const me = useAppStore((state) => state.socialMe);
  const photo = useProfileAvatar();
  if (!race) return null;
  const riders = race.players
    .filter((player) => !player.left)
    .map((player) => ({ player, share: Math.max(0.04, Math.min(1, player.total > 0 ? player.answered / player.total : 0)) }));
  const mine = riders.find((r) => r.player.id === me) ?? riders[0];
  if (!mine) return null;
  const others = riders.filter((r) => r !== mine).sort((a, b) => b.share - a.share);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2">
      <div className="absolute inset-x-0 h-5 -translate-y-1/2 overflow-hidden rounded-full">
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${FILL[socialColor(mine.player.color)]}`}
          style={{ width: `${mine.share * 100}%` }}
        >
          {/* Shine lives inside the fill so it can never run ahead of it. */}
          <span className="absolute inset-x-2 top-1 h-1.5 rounded-full bg-white/30" />
        </span>
      </div>
      <span className="absolute flex -translate-y-1/2 transition-[left] duration-500 ease-out motion-reduce:transition-none" style={{ left: `calc(${mine.share * 100}% - 12px)` }}>
        <Avatar name={mine.player.name} color={socialColor(mine.player.color)} size="sm" src={mine.player.id === me ? photo : mine.player.image} />
      </span>
      {others.map(({ player, share }) => {
        const fill = FILL[socialColor(player.color)];
        return (
          <span key={player.id} className="absolute bottom-[10px] flex -translate-x-1/2 flex-col items-center transition-[left] duration-500 ease-out motion-reduce:transition-none" style={{ left: `${share * 100}%` }}>
            <span className={`h-[19px] w-[19px] rounded-full p-[2px] ${fill}`}>
              <span className="block h-[15px] w-[15px] overflow-hidden rounded-full">
                <span className="block origin-top-left scale-[0.625]">
                  <Avatar name={player.name} color={socialColor(player.color)} size="sm" src={player.image} className="ring-0!" />
                </span>
              </span>
            </span>
            <span className={`-mt-[2px] h-[7px] w-[10px] [clip-path:polygon(0_0,100%_0,50%_100%)] ${fill}`} />
          </span>
        );
      })}
    </div>
  );
}
