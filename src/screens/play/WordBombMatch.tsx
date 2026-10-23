import { useEffect, useState } from 'react';
import { ActionButton } from '../../lib/widgets';
import type { GameAction, GameSnapshot } from '../../services/wordBombService';
import { RaceProgress } from './RaceProgress';

export function WordBombMatch({ state, userId, now, connected, send }: {
  state: GameSnapshot; userId: string; now: number; connected: boolean; send: (action: GameAction) => void;
}) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  useEffect(() => setSubmitted(null), [state]);
  const me = state.players.find(player => player.id === userId);
  const spectating = Boolean(me && (me.finishedAt !== null || me.forfeited));
  const remaining = state.players.filter(player => player.id !== userId && player.finishedAt === null && !player.forfeited);
  const feedback = state.feedback && now < state.feedback.until ? state.feedback : null;
  const countdown = state.startedAt && now < state.startedAt ? Math.ceil((state.startedAt - now) / 1000) : 0;
  const question = state.question;
  const coolingDown = now < state.availableAt;
  const choose = (choice: number) => {
    if (!question || spectating || !connected || countdown || coolingDown || feedback || submitted === question.id) return;
    setSubmitted(question.id); send({ type: 'answer', questionId: question.id, choice });
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || !['1', '2', '3'].includes(event.key)) return;
      if (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (!question || spectating || !connected || countdown || coolingDown || feedback || submitted === question.id) return;
      event.preventDefault(); setSubmitted(question.id); send({ type: 'answer', questionId: question.id, choice: Number(event.key) - 1 });
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [question, spectating, connected, countdown, coolingDown, feedback, submitted, send]);
  return <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-8 pt-5 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:px-10 lg:pt-12">
    <div className="min-w-0">
      {spectating && <>
        <h1 className="text-2xl font-black">{state.place ? `You finished ${state.place}${['st', 'nd', 'rd'][state.place - 1] ?? 'th'}!` : 'Watching the race'}</h1>
        <p className="mt-2 text-sm text-ui-muted-strong">{state.place ? 'Your place is locked in. Watch the others finish.' : 'Your friends are still racing.'}</p>
        <div role="group" aria-label="Choose a player to watch" className="mb-5 mt-5 flex flex-wrap gap-2">
          {remaining.map(player => <button type="button" key={player.id} aria-pressed={state.watching === player.id} onClick={() => send({ type: 'watch', playerId: player.id })} className={`min-h-11 rounded-sm border-2 px-4 font-bold focus-ring ${state.watching === player.id ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep' : 'border-ui-border'}`}>{player.name}</button>)}
        </div>
      </>}
      <div className="mb-4 flex justify-between gap-4 text-sm text-ui-muted-strong">
        <strong>{spectating ? `Watching ${state.players.find(player => player.id === state.watching)?.name ?? 'the finish'}` : 'Pick the meaning'}</strong>
        {!spectating && <span>{me?.cleared ?? 0} / {state.total} cleared</span>}
      </div>
      {countdown ? <div role="status" className="flex min-h-56 items-center justify-center text-8xl font-black text-brand-primary">{countdown}</div> : <>
        <div className="flex min-h-44 items-center justify-center rounded-feature border-[3px] border-b-[7px] border-ui-border bg-ui-surface px-5 py-7 font-chinese text-6xl lg:min-h-56 lg:text-7xl">{feedback?.hanzi ?? question?.hanzi ?? '✓'}</div>
        <div className="mt-6 grid gap-3">
          {feedback ? <div aria-live="polite" className="py-4">
            <strong className={feedback.correct ? 'text-feedback-success' : 'text-feedback-danger'}>{feedback.correct ? 'Correct' : 'Missed — this word will return'}</strong>
            <p className="mt-2 text-ui-muted-strong">{feedback.pinyin} · {feedback.meaning}</p>
          </div> : question?.options.map((option, index) => spectating
            ? <div key={option} className="border-b border-ui-divider px-1 py-3">{option}</div>
            : submitted === question.id || !connected || coolingDown
              ? <div key={option} className="rounded-control border-2 border-ui-divider px-5 py-4 text-ui-muted-strong">{option}</div>
              : <ActionButton key={`${question.id}:${index}`} variant="secondary" fullWidth frontClassName="justify-start gap-4" onClick={() => choose(index)}><span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-xs border-2 border-ui-divider text-xs text-ui-muted-strong">{index + 1}</span>{option}</ActionButton>)}
        </div>
      </>}
    </div>
    <RaceProgress state={state} userId={userId} />
  </div>;
}
