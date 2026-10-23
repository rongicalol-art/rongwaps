import { useEffect, useState } from 'react';
import { ActionButton, AppIcon, Avatar, AvatarStack, Drawer } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import type { SocialPanel } from '../../../store/slices/socialSlice';
import { GLOBAL_CHAT, type Person } from '../../../../shared/lobby';
import { MAX_PLAYERS, socialColor } from '../../../../shared/quizRace';
import { createRace, getRecentRaceCode, joinRace, leaveRace } from '../raceController';
import { useSocialIdentity } from '../useSocialLifecycle';
import { activityLabel, defaultSelection, describeSelection } from '../socialText';
import { ChatThread } from './ChatThread';
import { EmptyNote, PanelTabs, PanelTitle, PersonRow, lessonHeading } from './SocialBits';

/** The lesson the learner is in, for presence lists and a new room's default words. */
function useCurrentLesson() {
  const viewing = useAppStore((state) => state.socialViewingLesson);
  const people = useAppStore((state) => state.socialPeople);
  return viewing ?? people[0]?.l ?? null;
}

/** Everyone online but me, from the per-lesson counts (the full list arrives only while Online is open). */
function useOnlineTotal() {
  return useAppStore((state) => {
    return Math.max(0, state.socialOnlineTotal - (state.showOnline && state.socialStatus === 'live' ? 1 : 0));
  });
}

function useOthers(list: Person[], hideRoom = false) {
  const me = useAppStore((state) => state.socialMe);
  const blocked = useAppStore((state) => state.blockedUsers);
  const race = useAppStore(state => state.race);
  return list.filter((person) => person.u !== me && !blocked.includes(person.u) && (!hideRoom || !race?.players.some(player => player.id === person.u && !player.left)));
}

const close = () => useAppStore.getState().setSocial({ socialPanel: null });
const setPanel = (socialPanel: SocialPanel) => useAppStore.getState().setSocial({ socialPanel });

/** "N here" from the lesson window: who's studying this lesson, everyone online, and the lesson chat. */
export function PeoplePanel({ panel }: { panel: Extract<SocialPanel, { kind: 'people' }> }) {
  const lesson = useCurrentLesson();
  const people = useOthers(useAppStore(state => state.socialPeople));
  const online = useOthers(useAppStore(state => state.socialOnline));
  const onlineTotal = useOnlineTotal();
  const unread = useAppStore(state => state.socialUnread);
  const identity = useSocialIdentity();
  const pending = useAppStore(state => state.racePending);
  const hasRoom = useAppStore(state => !!state.race);
  const rooms = useAppStore(state => state.socialRooms);
  const [profile, setProfile] = useState<Person | null>(null);
  const selected = profile ? online.find(person => person.u === profile.u) ?? people.find(person => person.u === profile.u) ?? profile : null;
  const scope = lesson === null ? 'global' : panel.chatScope ?? 'lesson';
  const list = [...(panel.tab === 'online' ? online : people)].sort((a, b) => (a.l ?? 1000) - (b.l ?? 1000) || a.n.localeCompare(b.n));
  const invite = (person: Person) => { void createRace(identity, defaultSelection(person.l ?? lesson), true, [person.u]); };
  const heading = (key: number | null) => {
    if (key === null) return 'Browsing the course';
    const entry = lessonHeading(key);
    const label = entry.eyebrow?.replace(/^Book \d+ · /, '') ?? '';
    return `Book ${Math.floor(key / 100)} · ${label}${entry.title === label ? '' : ` · ${entry.title}`}`;
  };
  return (
    <Drawer isOpen onClose={close}
      title={<PanelTitle title={selected ? 'Profile' : panel.tab === 'chat' ? 'Chat' : panel.tab === 'party' ? 'Party' : 'Classmates'} />}
      tone="practice" size="md" mdPlacement="side" heightClassName="h-[80vh] md:h-full"
      className="top-auto h-[80dvh] max-h-[80dvh] rounded-t-3xl md:h-full md:max-h-full md:rounded-modal"
      contentClassName="flex min-h-0 flex-col !overflow-hidden pb-4">
      <div className="shrink-0 pb-3">
        <PanelTabs label="Study together" value={panel.tab}
          onChange={tab => { setProfile(null); setPanel({ ...panel, tab }); }}
          tabs={[...(lesson === null ? [] : [{ id: 'lesson' as const, label: 'Lesson' }]), { id: 'online', label: 'Online', count: panel.tab === 'online' ? online.length : onlineTotal }, { id: 'chat', label: 'Chat', dot: unread && panel.tab !== 'chat' }, { id: 'party', label: 'Party' }]} />
      </div>
      {panel.tab === 'chat' ? <>
        <div className="flex shrink-0 gap-3 pb-2">
          {(['global', ...(lesson === null ? [] : ['lesson'])] as const).map(value => <button key={value} type="button" aria-pressed={scope === value}
            onClick={() => setPanel({ ...panel, chatScope: value as 'global' | 'lesson' })}
            className={`rounded-compact px-3 py-1.5 text-sm font-black outline-none focus-ring-inline ${scope === value ? 'bg-brand-primary-soft text-brand-primary-deep' : 'text-ui-muted-strong hover:bg-ui-hover'}`}>
            {value === 'global' ? 'Global' : lessonHeading(lesson).eyebrow ?? 'Lesson'}
          </button>)}
        </div>
        <ChatThread key={scope} lesson={scope === 'global' ? GLOBAL_CHAT : lesson ?? GLOBAL_CHAT} />
      </> : <>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 custom-scrollbar">
          {panel.tab === 'party' ? rooms.length === 0 ? <EmptyNote>No open rooms right now.</EmptyNote> : rooms.map(room => <div key={room.code} className="flex items-center gap-3 border-b-2 border-ui-divider py-4 last:border-b-0">
            <AvatarStack people={room.players.map(player => ({ name: player.name, color: socialColor(player.color), src: player.image }))} size="sm" />
            <span className="min-w-0 flex-1"><span className="block truncate text-base font-black text-ui-ink-strong">{room.host}’s room</span><span className="block truncate text-sm font-bold text-ui-muted">{describeSelection(room.selection)}</span></span>
            <ActionButton size="sm" onClick={() => { void joinRace(identity, room.code); }}>Join</ActionButton>
          </div>) : selected ? <>
            <button type="button" onClick={() => setProfile(null)} className="mb-5 flex items-center gap-2 rounded-compact py-2 text-sm font-black text-ui-muted-strong outline-none focus-ring-inline"><AppIcon name="back" size={16} />Back to classmates</button>
            <div className="flex items-center gap-4 py-3">
              <Avatar name={selected.n} color={selected.c} src={selected.i} size="xl" className="h-16 w-16 text-2xl" />
              <div className="min-w-0"><p className="text-xs font-extrabold text-ui-muted-strong">{online.some(person => person.u === selected.u) || people.some(person => person.u === selected.u) ? 'Online now' : 'Last seen studying'}</p><h3 className="break-words text-2xl font-black text-ui-ink-strong">{selected.n}</h3></div>
            </div>
            <div className="mt-4 border-t-2 border-ui-divider pt-4"><p className="text-xs font-black text-ui-muted">Currently studying</p><p className="mt-1 text-base font-extrabold text-ui-ink-strong">{heading(selected.l)}</p><p className="mt-4 text-xs font-black text-ui-muted">Activity</p><p className="mt-1 text-base font-extrabold text-ui-ink-strong">{activityLabel(selected.a)}</p></div>
            <button type="button" className="mt-6 py-2 text-sm font-black text-ui-muted-strong outline-none focus-ring-inline" onClick={() => { useAppStore.getState().toggleBlockedUser(selected.u); setProfile(null); }}>Block</button>
          </> : list.length === 0 ? <EmptyNote>{panel.tab === 'online' ? 'Nobody else is online.' : 'Nobody else is here yet.'}</EmptyNote> : list.map((person, index) => <div key={person.u}>
            {panel.tab === 'online' && (index === 0 || list[index - 1].l !== person.l) && <h3 className="pb-1 pt-4 text-xs font-black text-ui-muted-strong">{heading(person.l)}</h3>}
            <PersonRow person={person} lesson={panel.tab === 'online' ? null : lesson} onOpen={() => setProfile(person)} action={<ActionButton size="sm" variant="secondary" onClick={() => invite(person)}>Invite</ActionButton>} />
          </div>)}
        </div>
        <div className="shrink-0 border-t-2 border-ui-divider pt-4">{pending ? <ActionButton fullWidth size="lg" variant="secondary" onClick={leaveRace}>Cancel connecting</ActionButton> : selected ? <ActionButton fullWidth size="lg" onClick={() => invite(selected)}>Invite to room</ActionButton> : <ActionButton fullWidth size="lg" onClick={() => { void createRace(identity, defaultSelection(lesson), true, []); }}>{hasRoom ? 'Back to room' : 'Start a room'}</ActionButton>}</div>
      </>}
    </Drawer>
  );
}

/** Practice hub → Challenge: pick people (this lesson or anyone online) or join an open room. */
export function ChallengePanel({ panel }: { panel: Extract<SocialPanel, { kind: 'challenge' }> }) {
  const lesson = useCurrentLesson();
  const people = useOthers(useAppStore((state) => state.socialPeople), true);
  const online = useOthers(useAppStore((state) => state.socialOnline), true);
  const onlineTotal = useOnlineTotal();
  const rooms = useAppStore((state) => state.socialRooms);
  const identity = useSocialIdentity();
  const userId = useAppStore((state) => state.currentUser?.id ?? null);
  const race = useAppStore(state => state.race);
  const pending = useAppStore(state => state.racePending);
  const seats = MAX_PLAYERS - (race?.players.filter(player => !player.left).length ?? 1);
  const [picked, setPicked] = useState<string[]>([]);
  const [recentRoom, setRecentRoom] = useState<string | null>(null);
  useEffect(() => { setRecentRoom(getRecentRaceCode(userId)); }, [userId, panel.tab]);
  const list = panel.tab === 'online' ? online : people;
  const openRooms = rooms.filter((room) => room.code !== recentRoom);
  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : prev.length < seats ? [...prev, id] : prev));
  return (
    <Drawer
      isOpen
      onClose={close}
      title={<PanelTitle eyebrow="Quiz race" title="Challenge" />}
      tone="practice" size="md" mdPlacement="side" heightClassName="h-[80vh] md:h-full"
      contentClassName="flex min-h-0 flex-col !overflow-hidden pb-4"
    >
      <div className="shrink-0 pb-3">
        <PanelTabs
          label="Challenge"
          value={panel.tab}
          onChange={(tab) => setPanel({ kind: 'challenge', tab })}
          tabs={[{ id: 'lesson', label: 'Lesson' }, { id: 'online', label: 'Online', count: panel.tab === 'online' ? online.length : onlineTotal }, ...(race ? [] : [{ id: 'rooms' as const, label: 'Rooms', count: rooms.length }])]}
        />
      </div>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 custom-scrollbar">
        {panel.tab === 'rooms' ? <>
          {recentRoom && <div className="flex items-center gap-3 border-b-2 border-ui-divider py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black text-ui-ink-strong">Rejoin last room</span>
              <span className="block text-sm font-bold text-ui-muted">Room code {recentRoom}</span>
            </span>
            <ActionButton size="sm" disabled={pending} onClick={() => { void joinRace(identity, recentRoom); }}>Rejoin</ActionButton>
          </div>}
          {openRooms.length === 0
            ? <EmptyNote>{recentRoom ? 'No other open rooms right now.' : 'No open rooms right now.'}</EmptyNote>
            : openRooms.map((room) => (
              <div key={room.code} className="flex items-center gap-3 border-b-2 border-ui-divider py-3.5 last:border-b-0">
                <AvatarStack people={room.players.map((player) => ({ name: player.name, color: socialColor(player.color), src: player.image }))} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-black text-ui-ink-strong">{room.host}’s room</span>
                  <span className="block truncate text-sm font-bold text-ui-muted">{describeSelection(room.selection)}</span>
                </span>
                <span className="text-xs font-black tabular-nums text-ui-muted-strong">{room.players.length}/4</span>
                <ActionButton size="sm" onClick={() => { void joinRace(identity, room.code); }}>Join</ActionButton>
              </div>
            ))}
        </> : list.length === 0 ? <EmptyNote>{panel.tab === 'online' ? 'Nobody else is online.' : 'Nobody else is in this lesson.'}</EmptyNote> : list.map((person) => (
          <button key={person.u} type="button" onClick={() => toggle(person.u)} aria-pressed={picked.includes(person.u)} className="block w-full text-left outline-none focus-ring-inline">
            <PersonRow
              person={person}
              lesson={lesson}
              action={(
                <span className={`grid h-6 w-6 place-items-center rounded-xs border-2 ${picked.includes(person.u) ? 'border-brand-primary bg-brand-primary text-brand-on-primary' : 'border-ui-border bg-ui-surface'}`}>
                  {picked.includes(person.u) && <AppIcon name="check" size={14} />}
                </span>
              )}
            />
          </button>
        ))}
      </div>
      <div className="shrink-0 border-t-2 border-ui-divider pt-4">
        {pending ? <ActionButton fullWidth size="lg" variant="secondary" onClick={leaveRace}>Cancel connecting</ActionButton> : <ActionButton fullWidth size="lg" onClick={() => { void createRace(identity, defaultSelection(lesson), true, picked.slice(0, seats)); }}>
          {race ? picked.length ? 'Invite' : 'Back to room' : picked.length ? 'Send challenge' : 'Create room'}
        </ActionButton>}
      </div>
    </Drawer>
  );
}
