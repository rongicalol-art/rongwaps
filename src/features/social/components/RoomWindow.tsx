import { useState } from 'react';
import { ActionButton, AppIcon, Avatar, Drawer, IconActionButton, PlayfulNavIcon, ToggleSwitch, WorkspaceWindow, type PlayfulNavIconName } from '../../../lib/widgets';
import { SAMPLE_LESSONS } from '../../../data/books';
import { useAppStore } from '../../../store/useAppStore';
import { useProfileAvatar } from '../../../hooks/useProfileAvatar';
import { BETA_LAST_LESSON } from '../../../../shared/courseAccess';
import { MAX_PLAYERS, RACE_TYPES, socialColor, type RaceSelection, type RaceSnapshot, type RaceType } from '../../../../shared/quizRace';
import { leaveRace, raceSend } from '../raceController';
import { lessonsSummary, typeLabel } from '../socialText';

const LESSONS = [{ id: 0, title: 'Getting Started' }, ...SAMPLE_LESSONS.filter((lesson) => lesson.id <= BETA_LAST_LESSON)
  .map((lesson) => ({ id: lesson.id, title: lesson.title.split('·')[0].trim() }))];

function Row({ icon, label, value, onClick }: { icon: PlayfulNavIconName; label: string; value: string; onClick?: () => void }) {
  const body = (
    <>
      <PlayfulNavIcon name={icon} className="h-8 w-8" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-base font-black text-ui-ink-strong">{label}</span>
      </span>
      <span className="truncate text-sm font-extrabold text-ui-ink-strong">{value}</span>
    </>
  );
  if (!onClick) return <div className="flex min-h-16 items-center gap-3.5 rounded-control border-2 border-ui-divider px-4 py-2.5">{body}</div>;
  return (
    <ActionButton variant="secondary" size="lg" fullWidth onClick={onClick} className="min-h-16 justify-start gap-3.5 normal-case tracking-normal">
      {body}
      <AppIcon name="next" size={18} className="text-ui-ink-strong" />
    </ActionButton>
  );
}

function WordsSheet({ selection, onChange, onClose }: { selection: RaceSelection; onChange: (next: RaceSelection) => void; onClose: () => void }) {
  const toggleLesson = (id: number) => {
    const lessons = { ...selection.lessons };
    if (lessons[id]) { if (Object.keys(lessons).length > 1) delete lessons[id]; } else lessons[id] = id === 0 ? [1] : [1, 2, 3];
    onChange({ ...selection, lessons });
  };
  const togglePart = (id: number, part: number) => {
    const parts = selection.lessons[id];
    const next = parts.includes(part) ? (parts.length > 1 ? parts.filter((value) => value !== part) : parts) : [...parts, part].sort();
    onChange({ ...selection, lessons: { ...selection.lessons, [id]: next } });
  };
  return (
    <Drawer isOpen onClose={onClose} title={<Drawer.Title>Words</Drawer.Title>} tone="practice" size="md" mdPlacement="side" heightClassName="max-h-[80vh] md:max-h-full">
      {LESSONS.map((lesson) => {
        const parts = selection.lessons[lesson.id];
        return (
          <div key={lesson.id} className="flex items-center gap-3 border-b-2 border-ui-divider py-1.5 last:border-b-0">
            <button type="button" aria-pressed={Boolean(parts)} onClick={() => toggleLesson(lesson.id)} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left outline-none focus-ring-inline">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-xs border-2 ${parts ? 'border-brand-primary bg-brand-primary text-brand-on-primary' : 'border-ui-border bg-ui-surface'}`}>{parts && <AppIcon name="check" size={14} />}</span>
              <span className={`grid h-7 min-w-10 place-items-center rounded-xs px-1.5 text-xs font-black ${parts ? 'bg-brand-primary-soft text-brand-primary-deep' : 'bg-ui-hover text-ui-ink-strong'}`}>{lesson.id === 0 ? 'Intro' : `L${lesson.id}`}</span>
              <span className="truncate text-base font-extrabold text-ui-ink-strong">{lesson.title}</span>
            </button>
            {parts && lesson.id > 0 && (
              <span className="flex gap-1.5">
                {[1, 2, 3].map((part) => (
                  <ActionButton key={part} size="sm" variant="secondary" aria-pressed={parts.includes(part)} onClick={() => togglePart(lesson.id, part)}
                    className={`!px-2.5 ${parts.includes(part) ? '!border-brand-primary !bg-brand-primary-soft !text-brand-primary-deep' : ''}`}>P{part}</ActionButton>
                ))}
              </span>
            )}
          </div>
        );
      })}
      <div className="pt-4"><ActionButton fullWidth size="lg" onClick={onClose}>Done</ActionButton></div>
    </Drawer>
  );
}

function TypesSheet({ types, onChange, onClose }: { types: RaceType[]; onChange: (next: RaceType[]) => void; onClose: () => void }) {
  const toggle = (type: RaceType) => onChange(types.includes(type) ? types.filter((value) => value !== type) : [...types, type]);
  const option = (label: string, on: boolean, onClick: () => void) => (
    <ActionButton key={label} variant="secondary" size="lg" fullWidth aria-pressed={on} onClick={onClick}
      className={`justify-start gap-3 normal-case tracking-normal ${on ? '!border-brand-primary !bg-brand-primary-soft' : ''}`}>
      <span className={`grid h-5 w-5 place-items-center rounded-xs border-2 ${on ? 'border-brand-primary bg-brand-primary text-brand-on-primary' : 'border-ui-border'}`}>{on && <AppIcon name="check" size={12} />}</span>
      {label}
    </ActionButton>
  );
  return (
    <Drawer isOpen onClose={onClose} title={<Drawer.Title>Quiz type</Drawer.Title>} tone="practice" size="md" mdPlacement="side" heightClassName="max-h-[80vh] md:max-h-full">
      <div className="grid gap-2.5">
        {option('Mixed', types.length === 0, () => onChange([]))}
        {RACE_TYPES.map((type) => option(typeLabel([type]), types.includes(type), () => toggle(type)))}
      </div>
      <div className="pt-4"><ActionButton fullWidth size="lg" onClick={onClose}>Done</ActionButton></div>
    </Drawer>
  );
}

function Results({ race, me }: { race: RaceSnapshot; me: string | null }) {
  const myPhoto = useProfileAvatar();
  const ranked = [...race.players].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || b.answered - a.answered);
  const mine = race.players.find((player) => player.id === me);
  const waiting = race.phase === 'race';
  const headline = race.prepareError ? 'Race didn’t start' : waiting ? 'Waiting for the others' : mine?.place === 1 ? 'You came first' : mine?.place ? `You came ${['', 'first', 'second', 'third', 'fourth'][mine.place]}` : 'Race over';
  return (
    <>
      <div className="text-center">
        <PlayfulNavIcon name="reward" className="mx-auto h-16 w-16" />
        <h2 className="mt-2 text-3xl font-black text-ui-ink-strong">{headline}</h2>
        {race.prepareError && <p role="status" className="mt-2 text-sm font-bold text-ui-muted-strong">{race.prepareError === 'content-mismatch' ? 'Players have different quiz data. Update the app and start another room.' : 'Fewer than two players loaded the first question in time. Try again after it’s ready.'}</p>}
      </div>
      <ol className="mt-6 grid min-w-0 gap-2.5">
        {ranked.map((player) => (
          <li key={player.id} className={`flex min-w-0 items-center gap-3.5 rounded-control border-2 px-4 py-3 ${player.id === me ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-divider bg-ui-surface'}`}>
            <span className="w-6 shrink-0 text-lg font-black tabular-nums text-ui-ink-strong">{player.place ?? (waiting ? '' : '–')}</span>
            <Avatar name={player.name} color={socialColor(player.color)} size="md" src={player.id === me ? myPhoto : player.image} />
            <span className="min-w-0 flex-1 truncate text-base font-black text-ui-ink-strong">{player.id === me ? 'You' : player.name}</span>
            <span className="shrink-0 text-sm font-extrabold tabular-nums text-ui-ink-strong">{player.left ? 'Left' : !waiting && player.finishedAt === null ? 'Not finished' : `${player.correct}/${player.total || '–'}`}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** The quiz room: seats, then Words, Quiz type and Open room, then Start. Guests see it read-only. */
export function RoomWindow({ race }: { race: RaceSnapshot }) {
  const me = useAppStore((state) => state.socialMe);
  const myPhoto = useProfileAvatar();
  const [sheet, setSheet] = useState<'words' | 'types' | null>(null);
  const status = useAppStore(state => state.raceStatus);
  const live = status === 'live';
  const isHost = race.hostId === me;
  const host = race.players.find((player) => player.id === race.hostId);
  const present = race.players.filter((player) => !player.left);
  const settings = (selection: RaceSelection, open = race.open) => raceSend({ type: 'settings', selection, open });
  const ready = present.length >= 2 && present.every(player => race.connected.includes(player.id));
  const copy = () => {
    const link = `${location.origin}/?room=${race.code}`;
    const fallback = () => useAppStore.getState().showFeedbackToast(`Share room code ${race.code}`);
    if (!navigator.clipboard) { fallback(); return; }
    void navigator.clipboard.writeText(link).then(() => useAppStore.getState().showFeedbackToast('Invite link copied')).catch(fallback);
  };
  const foot = !live ? <p role="status" className="py-4 text-center text-base font-extrabold text-ui-muted-strong">Reconnecting to your room…</p> : race.phase === 'lobby'
    ? (isHost ? ready ? <ActionButton fullWidth size="lg" onClick={() => raceSend({ type: 'start' })}>Start</ActionButton> : <p role="status" className="py-4 text-center text-base font-extrabold text-ui-muted-strong">{present.length < 2 ? 'Invite someone to start' : 'Waiting for everyone to reconnect'}</p>
      : <p className="py-4 text-center text-base font-extrabold text-ui-ink-strong">Waiting for {host?.name ?? 'the host'} to start</p>)
    : race.phase === 'results'
      ? <div className="grid gap-2.5">{isHost && race.prepareError !== 'content-mismatch' && <ActionButton fullWidth size="lg" onClick={() => raceSend({ type: 'rematch' })}>Play again</ActionButton>}<ActionButton fullWidth size="lg" variant="secondary" onClick={leaveRace}>Back to lesson</ActionButton></div>
      : null;
  return (
    <WorkspaceWindow role="dialog" aria-modal="true" aria-label="Quiz room" layer="window" tone="practice">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
        <div className="mx-auto flex w-full max-w-[35rem] flex-1 flex-col px-4 pb-6 pt-6 md:pt-14">
          <div className="flex items-center gap-3">
            <IconActionButton size="lg" label="Leave room" onClick={leaveRace} icon={<AppIcon name="close" size={22} />} />
            <h1 className="min-w-0 flex-1 truncate text-2xl font-black text-ui-ink-strong">{isHost ? 'Your room' : `${host?.name ?? 'Quiz'}’s room`}</h1>
            <ActionButton size="sm" variant="secondary" onClick={copy} aria-label="Copy invite link" className="gap-1.5 tracking-widest"><AppIcon name="link" size={16} />{race.code}</ActionButton>
          </div>
          {race.phase === 'lobby' ? (
            <>
              <div className="mt-5 grid grid-cols-4 gap-2.5">
                {Array.from({ length: MAX_PLAYERS }, (_, index) => present[index]).map((player, index) => player ? (
                  <div key={player.id} className="flex aspect-[1/1.12] flex-col items-center justify-center gap-1 rounded-control border-2 border-b-[5px] border-ui-border bg-ui-surface">
                    <Avatar name={player.name} color={socialColor(player.color)} size="xl" src={player.id === me ? myPhoto : player.image} />
                    <span className="max-w-full truncate px-1 text-sm font-black text-ui-ink-strong">{player.id === me ? 'You' : player.name}</span>
                    <span className="max-w-full truncate px-1 text-xs font-extrabold text-ui-muted">{!race.connected.includes(player.id) ? 'Offline' : player.id === race.hostId ? 'Host' : 'Ready'}</span>
                  </div>
                ) : isHost ? (
                  <button key={`open-${index}`} type="button" onClick={() => useAppStore.getState().setSocial({ socialPanel: { kind: 'challenge', tab: 'lesson' } })}
                    className="flex aspect-[1/1.12] flex-col items-center justify-center gap-1.5 rounded-control border-2 border-dashed border-ui-border text-sm font-extrabold text-ui-muted outline-none focus-ring">
                    <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-dashed border-ui-border"><AppIcon name="plus" size={18} /></span>
                    Invite
                  </button>
                ) : (
                  <div key={`open-${index}`} className="flex aspect-[1/1.12] flex-col items-center justify-center gap-1.5 rounded-control border-2 border-dashed border-ui-border text-sm font-extrabold text-ui-muted">
                    <span className="h-10 w-10 rounded-full border-2 border-dashed border-ui-border" />
                    Open
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-3">
                <Row icon="books" label="Words" value={lessonsSummary(race.selection.lessons)} onClick={isHost && live ? () => setSheet('words') : undefined} />
                <Row icon="quiz" label="Quiz type" value={typeLabel(race.selection.types)} onClick={isHost && live ? () => setSheet('types') : undefined} />
                {isHost && live && (
                  <button type="button" role="switch" aria-checked={race.open} onClick={() => settings(race.selection, !race.open)}
                    className="flex min-h-16 items-center gap-3.5 rounded-control border-2 border-ui-divider px-4 py-2.5 text-left outline-none focus-ring">
                    <PlayfulNavIcon name="global" className="h-8 w-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-ui-ink-strong">Open room</span>
                      <span className="block text-xs font-bold text-ui-muted">{race.open ? 'Shows in Rooms and this lesson’s chat' : 'Join with your room code or invite link'}</span>
                    </span>
                    <ToggleSwitch checked={race.open} />
                  </button>
                )}
              </div>
            </>
          ) : <div className="mt-8"><Results race={race} me={me} /></div>}
          <div className="mt-auto pt-6 md:mt-7">{foot}</div>
        </div>
      </div>
      {isHost && live && race.phase === 'lobby' && sheet === 'words' && <WordsSheet selection={race.selection} onChange={(next) => settings(next)} onClose={() => setSheet(null)} />}
      {isHost && live && race.phase === 'lobby' && sheet === 'types' && <TypesSheet types={race.selection.types} onChange={(types) => settings({ ...race.selection, types })} onClose={() => setSheet(null)} />}
    </WorkspaceWindow>
  );
}
