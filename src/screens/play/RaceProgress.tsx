import type { GameSnapshot } from '../../services/wordBombService';
import { gameStandings } from '../../../shared/wordBomb';

const colors = ['bg-brand-primary', 'bg-palette-purple', 'bg-palette-teal', 'bg-brand-secondary'];

export function RaceProgress({ state, userId }: { state: GameSnapshot; userId: string }) {
  const finishers = gameStandings(state.players).filter(player => player.finishedAt !== null);
  return <aside aria-label="Race progress" className="order-first lg:order-last">
    <h2 className="mb-6 hidden text-lg font-black lg:block">The race</h2>
    <div className="grid grid-cols-4 gap-3 lg:grid-cols-1 lg:gap-7">
      {state.players.map((player, index) => {
        const place = finishers.findIndex(finisher => finisher.id === player.id) + 1;
        const progress = player.cleared / state.total * 100;
        return <div key={player.id}>
          <div className="mb-2 flex flex-col justify-between gap-1 text-xs lg:flex-row lg:text-sm">
            <strong className="truncate">{player.id === userId ? 'You' : player.name}</strong>
            <span className="text-ui-muted-strong">{place ? `${place}${['st', 'nd', 'rd'][place - 1] ?? 'th'}` : player.forfeited ? 'Left' : `${player.cleared}/${state.total}`}{!player.connected && !place && !player.forfeited ? ' · offline' : ''}</span>
          </div>
          <div role="progressbar" aria-label={`${player.name} progress`} aria-valuenow={player.cleared} aria-valuemin={0} aria-valuemax={state.total} className="relative h-1.5 rounded-xs bg-ui-divider lg:mt-12">
            <div className={`h-full rounded-xs motion-safe:transition-[width] motion-safe:duration-500 ${colors[index]}`} style={{ width: `${progress}%` }} />
            <span aria-hidden="true" className={`absolute bottom-2 hidden h-9 w-9 items-center justify-center rounded-sm font-black text-ui-surface motion-safe:transition-[left] motion-safe:duration-500 lg:flex ${colors[index]}`} style={{ left: `calc(${progress}% - ${progress / 100 * 36}px)` }}>{player.name[0]?.toUpperCase()}</span>
          </div>
        </div>;
      })}
    </div>
  </aside>;
}
