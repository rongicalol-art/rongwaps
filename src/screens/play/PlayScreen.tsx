import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ActionButton, StickyWorkspaceHeader, type StickyWorkspaceHeaderMenuToggle } from '../../lib/widgets';
import { BETA_LAST_LESSON } from '../../../shared/courseAccess';
import { gameStandings } from '../../../shared/wordBomb';
import { useWordBomb } from './useWordBomb';
import { WordBombMatch } from './WordBombMatch';

export function PlayScreen({ menuToggle }: { menuToggle?: StickyWorkspaceHeaderMenuToggle }) {
  const game = useWordBomb();
  const profileName = useAppStore(state => state.displayName);
  const currentUser = useAppStore(state => state.currentUser);
  const [name, setName] = useState(profileName || '');
  const [code, setCode] = useState(game.roomCode);
  const [lesson, setLesson] = useState(0);
  const [copied, setCopied] = useState(false);
  const state = game.state;
  const me = state?.players.find(player => player.id === game.userId);
  const connecting = game.status === 'connecting' || game.status === 'reconnecting';
  const readyToStart = state && state.players.length >= 2 && state.players.every(player => player.ready && player.connected);
  const roomEntry = <div className="mx-auto w-full max-w-2xl px-5 py-10 lg:py-16">
    <h1 className="text-3xl font-black lg:text-4xl">Same words.<br />One finish line.</h1>
    <p className="mt-4 text-ui-muted-strong">Race your friends through a lesson. Finish, then watch them catch up.</p>
    {!currentUser ? <p className="mt-8">Sign in with your school account to play.</p> : game.baseUrl === undefined ? <p className="mt-8" role="status">Loading multiplayer…</p>
      : !game.baseUrl ? <p className="mt-8" role="status">Multiplayer hosting is being set up. Your lessons are ready to use.</p>
        : <form className="mt-8 grid gap-5" onSubmit={event => { event.preventDefault(); void game.join(name, lesson, code.trim().toUpperCase() || undefined); }}>
          <label className="grid gap-2 text-sm font-bold">Display name<input required maxLength={30} value={name} onChange={event => setName(event.target.value)} className="min-h-12 rounded-control border-2 border-ui-border bg-ui-surface px-4 text-base focus-ring" autoComplete="nickname" /></label>
          <label className="grid gap-2 text-sm font-bold">Room code <span className="font-normal text-ui-muted-strong">Leave empty to create a room.</span><input value={code} onChange={event => setCode(event.target.value.toUpperCase())} maxLength={6} pattern="[A-HJ-NP-Z2-9]{6}" className="min-h-12 rounded-control border-2 border-ui-border bg-ui-surface px-4 text-base uppercase focus-ring" autoCapitalize="characters" autoComplete="off" spellCheck={false} /></label>
          {!code && <label className="grid gap-2 text-sm font-bold">Book 1 lesson<select value={lesson} onChange={event => setLesson(Number(event.target.value))} className="min-h-12 rounded-control border-2 border-ui-border bg-ui-surface px-4 text-base focus-ring">{Array.from({ length: BETA_LAST_LESSON + 1 }, (_, i) => <option key={i} value={i}>{i ? `Lesson ${i}` : 'Introduction'}</option>)}</select></label>}
          {connecting ? <p role="status">Connecting…</p> : <ActionButton type="submit" size="lg">{code ? 'Join room' : 'Create room'}</ActionButton>}
        </form>}
  </div>;
  return <>
    <StickyWorkspaceHeader title="Word Bomb" menuToggle={menuToggle} rightContent={state ? <button type="button" onClick={game.leave} className="min-h-11 rounded-sm px-3 text-sm font-bold text-ui-muted-strong focus-ring">Leave room</button> : undefined} />
    {game.error && <p role="alert" className="mx-5 my-3 text-sm text-feedback-danger">{game.error}</p>}
    {state && game.status !== 'connected' && <p role="status" className="mx-5 my-3 text-sm text-ui-muted-strong">{game.status === 'closed' ? 'Disconnected. Leave and rejoin using your room code.' : 'Reconnecting. Your place is saved.'}</p>}
    {!state ? roomEntry : state.phase === 'lobby' ? <div className="mx-auto w-full max-w-3xl px-5 py-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-sm text-ui-muted-strong">Room code</p><h1 className="text-4xl font-black tracking-widest">{state.code}</h1></div><ActionButton variant="secondary" onClick={() => { void navigator.clipboard.writeText(`${location.origin}/play?room=${state.code}`).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{copied ? 'Link copied' : 'Copy invite link'}</ActionButton></div>
      <p className="mt-5 text-sm text-ui-muted-strong">Book 1 · {state.lesson ? `Lesson ${state.lesson}` : 'Introduction'} · {state.total} words</p>
      <div className="my-8 grid gap-5">{state.players.map(player => <div key={player.id} className="flex items-center justify-between gap-4"><strong>{player.id === game.userId ? `${player.name} (you)` : player.name}</strong><span className="text-sm text-ui-muted-strong">{!player.connected ? 'Offline' : player.ready ? 'Ready ✓' : 'Getting ready'}</span></div>)}</div>
      {game.status === 'connected' && <div className="flex flex-wrap gap-3"><ActionButton variant="secondary" onClick={() => game.send({ type: 'ready', ready: !me?.ready })}>{me?.ready ? 'Not ready' : 'Ready'}</ActionButton>{state.hostId === game.userId && readyToStart && <ActionButton onClick={() => game.send({ type: 'start' })}>Start race →</ActionButton>}</div>}
      <p className="mt-6 text-sm text-ui-muted-strong">At least two players must be ready. Missed words return after a short pause.</p>
    </div> : state.phase === 'race' ? <WordBombMatch state={state} userId={game.userId} now={game.now} connected={game.status === 'connected'} send={game.send} />
      : <div className="mx-auto w-full max-w-xl px-5 py-10"><h1 className="text-3xl font-black">Everyone’s across</h1><p className="mt-3 text-ui-muted-strong">Ready for a rematch?</p><div className="my-8 grid gap-5">{gameStandings(state.players).map((player, index) => <div key={player.id} className={`flex items-center justify-between gap-4 rounded-control p-3 ${player.id === game.userId ? 'bg-brand-primary-soft' : ''}`}><strong>{index + 1}. {player.id === game.userId ? 'You' : player.name}</strong><span className="text-sm text-ui-muted-strong">{player.finishedAt !== null && state.startedAt ? `${((player.finishedAt - state.startedAt) / 1000).toFixed(1)}s` : `Left · ${player.cleared}/${state.total}`}</span></div>)}</div>{state.hostId === game.userId && game.status === 'connected' ? <ActionButton onClick={() => game.send({ type: 'rematch' })}>Rematch →</ActionButton> : <p className="text-sm text-ui-muted-strong">Waiting for the host.</p>}</div>}
  </>;
}
