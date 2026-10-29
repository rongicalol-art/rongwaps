import { useEffect, useState } from 'react';
import { ActionButton, AppIcon, Avatar, Drawer, IconActionButton, PlayfulNavIcon, SegmentedControl, ToggleSwitch, WorkspaceWindow, type PlayfulNavIconName } from '../../../lib/widgets';
import { INTRODUCTION_ART } from '../../../data/lessonLandscapeArt';
import { lessonThumbnail } from '../../../data/lessonThumbnails';
import { useAppStore } from '../../../store/useAppStore';
import { useProfileAvatar } from '../../../hooks/useProfileAvatar';
import { RACE_BOOKS } from '../../../../shared/courseAccess';
import { MAX_PLAYERS, RACE_TYPES, socialColor, type RacePlayer, type RaceSelection, type RaceSnapshot, type RaceType } from '../../../../shared/quizRace';
import { leaveRace, raceSend } from '../raceController';
import { lessonsSummary, typeLabel } from '../socialText';
import { PanelTabs } from './SocialBits';
import { PartyChatThread } from './ChatThread';

const BOOKS = Object.keys(RACE_BOOKS).map(Number);
const lessonIds = (book: number) => {
  const range = RACE_BOOKS[book] ?? RACE_BOOKS[1];
  return Array.from({ length: range.last - range.first + 1 }, (_, index) => range.first + index);
};
const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

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

/** One book per race; each lesson is its picture and number. A picked lesson can narrow to some of its parts. */
function WordsSheet({ selection, onChange, onClose }: { selection: RaceSelection; onChange: (next: RaceSelection) => void; onClose: () => void }) {
  const book = selection.book ?? 1;
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
  const pickBook = (next: string) => {
    const id = Number(next);
    if (id !== book) onChange({ ...selection, book: id, lessons: { [Math.max(1, RACE_BOOKS[id].first)]: [1, 2, 3] } });
  };
  return (
    <Drawer isOpen onClose={onClose} title={<Drawer.Title>Words</Drawer.Title>} tone="practice" size="md" mdPlacement="side" heightClassName="max-h-[85vh] md:max-h-full">
      <SegmentedControl ariaLabel="Book" value={String(book)} onChange={pickBook} options={BOOKS.map((id) => ({ value: String(id), label: `Book ${id}` }))} className="mb-4" />
      <div className="grid grid-cols-3 gap-2.5">
        {lessonIds(book).map((id) => {
          const parts = selection.lessons[id];
          const art = id === 0 ? INTRODUCTION_ART : lessonThumbnail(book, id);
          return (
            <div key={id} className={`flex min-w-0 flex-col gap-2 rounded-control border-2 p-2 transition-colors ${parts ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-divider bg-ui-surface'}`}>
              <button type="button" aria-pressed={Boolean(parts)} aria-label={id === 0 ? 'Introduction' : `Lesson ${id}`} onClick={() => toggleLesson(id)} className="flex flex-col items-center gap-1.5 rounded-compact outline-none focus-ring">
                <span className="relative block aspect-square w-full overflow-hidden rounded-compact bg-ui-hover">
                  {art && <img src={art} alt="" loading="lazy" className={`h-full w-full ${id === 0 ? 'object-contain p-4' : 'object-cover'} ${parts ? '' : 'opacity-80'}`} />}
                </span>
                <span className={`flex items-center gap-1 text-sm font-black ${parts ? 'text-brand-primary-text' : 'text-ui-ink-strong'}`}>
                  {parts && <AppIcon name="check" size={14} />}{id === 0 ? 'Intro' : `L${id}`}
                </span>
              </button>
              {parts && id > 0 && (
                <span className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((part) => (
                    <button key={part} type="button" aria-pressed={parts.includes(part)} aria-label={`Part ${part}`} onClick={() => togglePart(id, part)}
                      className={`h-7 rounded-xs border-2 text-xs font-black outline-none focus-ring ${parts.includes(part) ? 'border-brand-primary-edge bg-brand-primary text-brand-on-primary' : 'border-brand-primary-soft-edge text-ui-muted-strong'}`}>P{part}</button>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="sticky -bottom-4 bg-ui-practice-canvas pb-4 pt-4"><ActionButton fullWidth size="lg" onClick={onClose}>Done</ActionButton></div>
    </Drawer>
  );
}

/** A seat's options: a classmate's profile, and Remove for the host before a round. */
function SeatSheet({ player, canRemove, onClose }: { player: RacePlayer; canRemove: boolean; onClose: () => void }) {
  const online = useAppStore((state) => state.race?.connected.includes(player.id) ?? false);
  const visit = () => {
    onClose();
    useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'online', visit: { u: player.id, n: player.name, c: socialColor(player.color), l: null, a: 'race', ...(player.image ? { i: player.image } : {}) } } });
  };
  const remove = () => {
    raceSend({ type: 'remove', id: player.id });
    useAppStore.getState().showFeedbackToast(`${player.name} was removed from the room`);
    onClose();
  };
  return (
    <Drawer isOpen onClose={onClose} title={<Drawer.Title>{player.name}</Drawer.Title>} tone="practice" size="sm" mdPlacement="side" heightClassName="max-h-[60vh] md:max-h-full"
      className="top-auto h-auto rounded-t-3xl md:h-full md:rounded-none" contentClassName="pb-8">
      <div className="flex items-center gap-3.5">
        <Avatar name={player.name} color={socialColor(player.color)} src={player.image} size="xl" live={online} className="h-16 w-16 text-2xl" />
        <span className="text-sm font-extrabold text-ui-muted-strong">{online ? 'In this room' : 'Offline'}</span>
      </div>
      <div className="mt-5 grid gap-2.5">
        <ActionButton fullWidth size="lg" variant="secondary" onClick={visit}>View profile</ActionButton>
        {canRemove && <ActionButton fullWidth size="lg" variant="secondary" onClick={remove}>Remove from room</ActionButton>}
      </div>
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
  const waiting = race.phase === 'race' || race.phase === 'review';
  const headline = race.prepareError ? 'Race didn’t start' : waiting ? 'Waiting for the others' : mine?.place === 1 ? 'You came first' : mine?.place ? `You came ${ORDINAL[mine.place] ?? `#${mine.place}`}` : 'Race over';
  return (
    <>
      <div className="text-center">
        <PlayfulNavIcon name="reward" className="mx-auto h-16 w-16" />
        <h2 className="mt-2 text-3xl font-black text-ui-ink-strong">{headline}</h2>
        {race.prepareError && <p role="status" className="mt-2 text-sm font-bold text-ui-muted-strong">{race.prepareError === 'content-mismatch' ? 'Players have different quiz data. Update the app and start another room.' : race.prepareError === 'client-mismatch' ? 'Someone is using an older app version. Refresh everyone’s app and try again.' : 'Fewer than two players loaded the first question in time. Try again after it’s ready.'}</p>}
      </div>
      <ol className="mt-6 grid min-w-0 gap-2.5">
        {ranked.map((player) => (
          <li key={player.id} className={`flex min-w-0 items-center gap-3.5 rounded-control border-2 px-4 py-3 ${player.id === me ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-divider bg-ui-surface'}`}>
            <span className="w-6 shrink-0 text-lg font-black tabular-nums text-ui-ink-strong">{player.place ?? (waiting ? '' : '–')}</span>
            <Avatar name={player.name} color={socialColor(player.color)} size="md" src={player.id === me ? myPhoto : player.image} />
            <span className="min-w-0 flex-1 truncate text-base font-black text-ui-ink-strong">{player.id === me ? 'You' : player.name}</span>
            <span className="shrink-0 text-sm font-extrabold tabular-nums text-ui-ink-strong">{player.left ? 'Left' : player.finishedAt !== null ? `${player.correct}/${player.total || '–'}` : player.total > 0 && player.answered >= player.total ? 'Reviewing' : !waiting ? 'Not finished' : `${player.correct}/${player.total || '–'}`}</span>
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
  const [seat, setSeat] = useState<string | null>(null);
  const [tab, setTab] = useState<'party' | 'chat'>('party');
  useEffect(() => {
    if (tab !== 'chat') return;
    useAppStore.getState().setSocial({ socialReadingParty: race.code });
    return () => { if (useAppStore.getState().socialReadingParty === race.code) useAppStore.getState().setSocial({ socialReadingParty: null }); };
  }, [race.code, tab]);
  const status = useAppStore(state => state.raceStatus);
  const live = status === 'live';
  const isHost = race.hostId === me;
  const host = race.players.find((player) => player.id === race.hostId);
  const present = race.players.filter((player) => !player.left);
  const seatPlayer = present.find((player) => player.id === seat && player.id !== me);
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
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-[35rem] flex-1 flex-col px-4 pb-6 pt-6 md:pt-14">
          <div className="flex items-center gap-3">
            <IconActionButton size="lg" label="Leave room" onClick={leaveRace} icon={<AppIcon name="close" size={22} />} />
            <h1 className="min-w-0 flex-1 truncate text-2xl font-black text-ui-ink-strong">{isHost ? 'Your room' : `${host?.name ?? 'Quiz'}’s room`}</h1>
            <ActionButton size="sm" variant="secondary" onClick={copy} aria-label="Copy invite link" className="gap-1.5 tracking-widest"><AppIcon name="link" size={16} />{race.code}</ActionButton>
          </div>
          <div className="mt-4 shrink-0"><PanelTabs label="Party" value={tab} onChange={setTab} tabs={[{ id: 'party', label: 'Party' }, { id: 'chat', label: 'Chat' }]} /></div>
          {tab === 'chat' ? <PartyChatThread /> : <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          {race.phase === 'lobby' ? (
            <>
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {Array.from({ length: MAX_PLAYERS }, (_, index) => present[index]).map((player, index) => {
                  if (!player) return isHost ? (
                    <button key={`open-${index}`} type="button" onClick={() => useAppStore.getState().setSocial({ socialPanel: { kind: 'challenge', tab: 'online' } })}
                      className="flex min-h-[8.5rem] flex-col items-center justify-center gap-1.5 rounded-control border-2 border-dashed border-ui-border text-sm font-extrabold text-ui-muted outline-none focus-ring">
                      <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-ui-border"><AppIcon name="plus" size={18} /></span>
                      Invite
                    </button>
                  ) : (
                    <div key={`open-${index}`} className="flex min-h-[8.5rem] flex-col items-center justify-center gap-1.5 rounded-control border-2 border-dashed border-ui-border text-sm font-extrabold text-ui-muted">
                      <span className="h-11 w-11 rounded-full border-2 border-dashed border-ui-border" />
                      Open
                    </div>
                  );
                  const mine = player.id === me;
                  const online = race.connected.includes(player.id);
                  const hosting = player.id === race.hostId;
                  const body = <>
                    <Avatar name={player.name} color={socialColor(player.color)} size="xl" src={mine ? myPhoto : player.image} live={online} className="h-16 w-16 text-2xl" />
                    <span className="max-w-full truncate px-1 text-[15px] font-black text-ui-ink-strong">{mine ? 'You' : player.name}</span>
                    <span className={`flex max-w-full items-center gap-1 truncate px-1 text-xs font-black ${hosting ? 'text-brand-primary-text' : 'text-ui-muted'}`}>
                      {hosting && <AppIcon name="crown" size={13} />}{!online ? 'Offline' : hosting ? 'Host' : 'Ready'}
                    </span>
                  </>;
                  return mine ? (
                    <div key={player.id} className="flex min-h-[8.5rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-control border-2 border-b-[5px] border-ui-border bg-ui-surface">{body}</div>
                  ) : (
                    <ActionButton key={player.id} variant="secondary" fullWidth onClick={() => setSeat(player.id)} aria-label={`${player.name}: options`}
                      className="min-h-[8.5rem] min-w-0 flex-col gap-1.5 !px-1 normal-case tracking-normal">{body}</ActionButton>
                  );
                })}
              </div>
              <div className="mt-6 grid gap-3">
                <Row icon="curriculum" label="Words" value={lessonsSummary(race.selection)} onClick={isHost && live ? () => setSheet('words') : undefined} />
                <Row icon="quiz" label="Quiz type" value={typeLabel(race.selection.types)} onClick={isHost && live ? () => setSheet('types') : undefined} />
                {isHost && live && (
                  <button type="button" role="switch" aria-checked={race.open} onClick={() => settings(race.selection, !race.open)}
                    className="flex min-h-16 items-center gap-3.5 rounded-control border-2 border-ui-divider px-4 py-2.5 text-left outline-none focus-ring">
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
          </div>}
        </div>
      </div>
      {isHost && live && race.phase === 'lobby' && sheet === 'words' && <WordsSheet selection={race.selection} onChange={(next) => settings(next)} onClose={() => setSheet(null)} />}
      {seatPlayer && <SeatSheet player={seatPlayer} canRemove={isHost && live && (race.phase === 'lobby' || race.phase === 'results')} onClose={() => setSeat(null)} />}
      {isHost && live && race.phase === 'lobby' && sheet === 'types' && <TypesSheet types={race.selection.types} onChange={(types) => settings({ ...race.selection, types })} onClose={() => setSheet(null)} />}
    </WorkspaceWindow>
  );
}
