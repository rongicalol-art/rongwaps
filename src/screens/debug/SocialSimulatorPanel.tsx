import { useState } from 'react';
import { ActionButton } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';

type Simulator = typeof import('../../features/social/dev/socialSimulator');
let loaded: Simulator | null = null;
const load = async () => (loaded ??= await import('../../features/social/dev/socialSimulator'));

/** DEV: 50 fake classmates (presence, chat, cheers, invites, rooms, races). No server, no study progress. */
export function SocialSimulatorPanel() {
  const [on, setOn] = useState(() => loaded?.isSimulating() ?? false);
  const status = useAppStore((state) => state.socialStatus);
  const toggle = async () => {
    const sim = await load();
    if (sim.isSimulating()) sim.stopSimulator(); else sim.startSimulator();
    setOn(sim.isSimulating());
  };
  const run = (key: 'invite' | 'cheer' | 'chatBurst' | 'mention') => () => { void load().then((sim) => { if (sim.isSimulating()) sim.simulate[key](); }); };
  return (
    <section className="max-w-xl space-y-4 rounded-feature border-2 border-ui-divider p-5">
      <div>
        <h2 className="text-xl font-black text-ui-ink-strong">Study together · 50 fake classmates</h2>
        <p className="mt-1 text-sm font-bold text-ui-muted">
          Replaces the Lobby and rooms with a local simulation: people move between lessons, chat, cheer, invite you, open rooms and race you.
          Close this window and use the app. A race still runs the real quiz, which records answers like any quiz, so race signed out.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton onClick={() => { void toggle(); }}>{on ? 'Stop simulation' : 'Start simulation'}</ActionButton>
        <span className="text-sm font-extrabold text-ui-muted-strong">Status: {on ? 'simulating' : status}</span>
      </div>
      {on && (
        <div className="flex flex-wrap gap-2">
          <ActionButton size="sm" variant="secondary" onClick={run('invite')}>Invite me now</ActionButton>
          <ActionButton size="sm" variant="secondary" onClick={run('cheer')}>Cheer me</ActionButton>
          <ActionButton size="sm" variant="secondary" onClick={run('chatBurst')}>Chat burst</ActionButton>
          <ActionButton size="sm" variant="secondary" onClick={run('mention')}>Mention me</ActionButton>
        </div>
      )}
    </section>
  );
}
