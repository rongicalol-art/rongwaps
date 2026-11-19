import { useEffect, useMemo, useState } from 'react';
import { ActionButton, AppIcon, Avatar, AvatarStack, Drawer, IconActionButton, SegmentedControl } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import type { SocialPanel } from '../../../store/slices/socialSlice';
import type { Person } from '../../../../shared/lobby';
import { MAX_PLAYERS, socialColor } from '../../../../shared/quizRace';
import { createRace, getRecentRaceCode, joinRace, leaveRace } from '../raceController';
import { useSocialIdentity } from '../useSocialLifecycle';
import { defaultSelection, describeSelection, seenLabel } from '../socialText';
import { ChatThread, DirectThread } from './ChatThread';
import { ChatList } from './ChatList';
import { updateOpen } from '../socialUpdate';
import { loadRecent } from '../friendsController';
import { EmptyNote, MuteButton, PanelTabs, PanelTitle, PersonRow, lessonHeading } from './SocialBits';
import { VisitProfile } from './VisitProfile';
import { ProfileSafetyMenu } from './SafetySheets';
import { useClassmates, useCurrentLesson, useLessonTotal } from '../useClassmates';

/** Everyone online but me, from the per-lesson counts (the full list arrives only while Online is open). */
function useOnlineTotal() {
  return useAppStore((state) => {
    return Math.max(0, state.socialOnlineTotal - (state.showOnline && state.socialStatus === 'live' ? 1 : 0));
  });
}

/** Lists show the first people; one quiet line says how many more there are. */
function MoreNote({ count, where }: { count: number; where: string }) {
  return count > 0 ? <p className="py-2 text-sm font-bold text-ui-muted">{count} more {where}</p> : null;
}

function useOthers(list: Person[], hideRoom = false) {
  const me = useAppStore((state) => state.socialMe);
  const players = useAppStore(state => state.race?.players);
  return useMemo(() => {
    const activeRoomIds = hideRoom && players?.length
      ? new Set(players.filter(player => !player.left).map(player => player.id))
      : null;
    return list.filter((person) => person.u !== me && (!activeRoomIds || !activeRoomIds.has(person.u)));
  }, [list, me, hideRoom, players]);
}

const close = () => useAppStore.getState().setSocial({ socialPanel: null, socialMentionTarget: null });
const setPanel = (socialPanel: SocialPanel) => useAppStore.getState().setSocial({ socialPanel });

/** Classmates drawer: the class chat, and who is online (current lesson first, then other lessons). */
export function PeoplePanel({ panel }: { panel: Extract<SocialPanel, { kind: 'people' }> }) {
  const lesson = useCurrentLesson();
  const people = useOthers(useAppStore(state => state.socialPeople));
  const online = useOthers(useAppStore(state => state.socialOnline));
  const onlineTotal = useOnlineTotal();
  const identity = useSocialIdentity();
  const pending = useAppStore(state => state.racePending);
  const hasRoom = useAppStore(state => !!state.race);
  const roomPlayers = useAppStore(state => state.race?.players);
  const inMyRoom = (person: Person) => !!roomPlayers?.some(player => player.id === person.u && !player.left);
  const rooms = useAppStore(state => state.socialRooms);
  const lessonTotal = useLessonTotal(lesson);
  const { classmates, here, others } = useClassmates(people, online, lesson, lessonTotal);
  const moreHere = Math.max(0, lessonTotal - here.length);
  const moreOnline = Math.max(0, onlineTotal - classmates.length - moreHere);
  const visit = panel.tab === 'online' ? panel.visit : undefined;
  const selected = visit ? classmates.find(person => person.u === visit.u) ?? visit : null;
  // Mention and Invite only reach people online now.
  const selectedOnline = !!selected && classmates.some(person => person.u === selected.u);
  const setProfile = (person: Person | null) => setPanel({ ...panel, visit: person ?? undefined });
  const mention = (person: Person) => useAppStore.getState().setSocial({ socialMentionDraft: person, socialPanel: { kind: 'people', tab: 'chat', thread: 'class' } });
  // After the privacy update: Chats (class chat, requests, conversations), friends, offline profiles.
  const inbox = updateOpen();
  const friends = useAppStore(state => state.socialFriends);
  const saved = useAppStore(state => state.socialSaved);
  const recentRows = useAppStore(state => state.socialRecent);
  const me = useAppStore(state => state.socialMe);
  const thread = inbox && panel.tab === 'chat' ? panel.thread : undefined;
  const friendOf = (u: string) => friends?.find(person => person.u === u && person.iAdded && person.addedMe);
  const photoOf = (u: string) => classmates.find(person => person.u === u)?.i ?? saved[u]?.card?.i;
  const threadFriend = thread && thread !== 'class' ? friendOf(thread) : undefined;
  const threadPerson: Person | null = threadFriend ? { u: threadFriend.u, n: threadFriend.n, c: threadFriend.c, l: null, a: null, ...(photoOf(threadFriend.u) ? { i: photoOf(threadFriend.u) } : {}) } : null;
  const onlineNow = new Set(classmates.map(person => person.u));
  const recent = recentRows.filter(row => row.card?.n && row.u !== me && !onlineNow.has(row.u))
    .map(row => ({ person: { u: row.u, n: row.card!.n!, c: socialColor(row.card!.c ?? 'blue'), l: null, a: null, ...(row.card?.i ? { i: row.card.i } : {}) } as Person, seen: row.seen }));
  useEffect(() => { if (inbox && panel.tab === 'online' && !selected) void loadRecent(); }, [inbox, panel.tab, selected]);
  const openThread = (u: string) => setPanel({ kind: 'people', tab: 'chat', thread: u });
  const footer = () => {
    if (pending) return <ActionButton fullWidth size="lg" variant="secondary" onClick={leaveRace}>Cancel connecting</ActionButton>;
    if (!selected) return panel.tab === 'online' ? <ActionButton fullWidth size="lg" onClick={() => { void createRace(identity, defaultSelection(lesson), true, []); }}>{hasRoom ? 'Back to room' : 'Start a room'}</ActionButton> : null;
    const friend = inbox && friendOf(selected.u);
    if (!selectedOnline) return friend ? <ActionButton fullWidth size="lg" onClick={() => openThread(selected.u)}><AppIcon name="chat" size={20} />Message</ActionButton> : null;
    const talk = friend
      ? <ActionButton size="lg" variant="secondary" aria-label="Message" onClick={() => openThread(selected.u)}><AppIcon name="chat" size={20} /><span className="hidden sm:inline">Message</span></ActionButton>
      : <ActionButton size="lg" variant="secondary" aria-label="Mention" onClick={() => mention(selected)}><AppIcon name="at" size={20} /><span className="hidden sm:inline">Mention</span></ActionButton>;
    if (inMyRoom(selected)) return <div className="flex">{talk}</div>;
    return <div className="flex gap-2.5">{talk}<div className="min-w-0 flex-1"><ActionButton fullWidth size="lg" onClick={() => invite(selected)}>Invite to room</ActionButton></div></div>;
  };
  const footerContent = footer();
  const invite = (person: Person) => { void createRace(identity, defaultSelection(person.l ?? lesson), true, [person.u]); };
  const heading = (key: number | null) => {
    if (key === null) return 'Browsing the course';
    const entry = lessonHeading(key);
    const label = entry.eyebrow?.replace(/^Book \d+ · /, '') ?? '';
    return `Book ${Math.floor(key / 100)} · ${label}${entry.title === label ? '' : ` · ${entry.title}`}`;
  };
  return (
    <Drawer isOpen onClose={close}
      title={thread && !selected
        ? <div className="mr-1 flex min-w-0 flex-1 items-center gap-2">
            <IconActionButton size="md" label="Back to chats" icon={<AppIcon name="back" size={20} />} onClick={() => setPanel({ kind: 'people', tab: 'chat' })} />
            {thread === 'class' || !threadPerson
              ? <h2 className="min-w-0 flex-1 truncate text-xl font-black text-ui-ink-strong">Class chat</h2>
              : <button type="button" onClick={() => setPanel({ kind: 'people', tab: 'online', visit: threadPerson })} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-control py-1 pr-2 text-left outline-none hover:bg-ui-hover focus-ring">
                  <Avatar name={threadPerson.n} color={threadPerson.c} src={threadPerson.i} size="md" live={onlineNow.has(threadPerson.u)} />
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-black leading-tight text-ui-ink-strong">{threadPerson.n}</span>
                    <span className="block truncate text-xs font-bold text-ui-muted">{onlineNow.has(threadPerson.u) ? 'Online' : seenLabel(saved[threadPerson.u]?.seen)}</span>
                  </span>
                </button>}
          </div>
        : !selected
        ? <div className="mr-1 flex min-w-0 flex-1 items-center gap-2">
            <SegmentedControl ariaLabel="Chats or who’s online" value={panel.tab} onChange={tab => setPanel({ kind: 'people', tab })}
              options={[{ value: 'chat', label: inbox ? 'Chats' : 'Chat' }, { value: 'online', label: 'Online' }]} className="min-w-0 flex-1" />
            <MuteButton />
          </div>
        : <div className="flex flex-1 items-center justify-between gap-2">
            <IconActionButton size="md" label="Back to everyone online" icon={<AppIcon name="back" size={20} />} onClick={() => setProfile(null)} />
            <ProfileSafetyMenu person={selected} />
          </div>}
      tone="practice" size="md" mdPlacement="side" heightClassName="h-[80vh] md:h-full"
      className="top-auto h-[80dvh] max-h-[80dvh] rounded-t-3xl md:h-full md:max-h-full md:rounded-none"
      contentClassName="flex min-h-0 flex-col !overflow-hidden pb-4">
      {panel.tab === 'chat' ? (!inbox || thread === 'class' ? <ChatThread /> : threadPerson ? <DirectThread key={threadPerson.u} friend={threadPerson} /> : <ChatList />) : <>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 custom-scrollbar">
          {!selected && rooms.map(room => <div key={room.code} className="flex items-center gap-3 border-b-2 border-ui-divider py-4 last:border-b-0">
            <AvatarStack people={room.players.map(player => ({ name: player.name, color: socialColor(player.color), src: player.image }))} size="sm" />
            <span className="min-w-0 flex-1"><span className="block truncate text-base font-black text-ui-ink-strong">{room.host}’s room</span><span className="block truncate text-sm font-bold text-ui-muted">{describeSelection(room.selection)}</span></span>
            <ActionButton size="sm" loading={pending} loadingLabel="Join" onClick={() => { void joinRace(identity, room.code); }}>Join</ActionButton>
          </div>)}
          {selected ? <VisitProfile key={selected.u} person={selected} lesson={lesson} online={selectedOnline} />
          : classmates.length === 0 ? <>
            <EmptyNote>Nobody else is online.</EmptyNote>
            {recent.length > 0 && <RecentlyHere rows={recent} open={setProfile} />}
          </> : <>
            {lesson !== null && here.length > 0 && (
                <>
                  <h3 className="pb-1 pt-3 text-xs font-black text-ui-muted-strong">In this lesson</h3>
                  {here.map((person) => (
                    <PersonRow key={person.u} person={person} lesson={lesson} onOpen={() => setProfile(person)} action={<ActionButton size="sm" variant="secondary" onClick={() => invite(person)}>Invite</ActionButton>} />
                  ))}
                  <MoreNote count={moreHere} where="in this lesson" />
                </>
            )}
            {others.map((person, index) => (
              <div key={person.u}>
                {(index === 0 || others[index - 1].l !== person.l) && <h3 className="pb-1 pt-4 text-xs font-black text-ui-muted-strong">{heading(person.l)}</h3>}
                <PersonRow person={person} lesson={lesson} onOpen={() => setProfile(person)} action={<ActionButton size="sm" variant="secondary" onClick={() => invite(person)}>Invite</ActionButton>} />
              </div>
            ))}
            <MoreNote count={moreOnline} where="online" />
            {recent.length > 0 && <RecentlyHere rows={recent} open={setProfile} />}
          </>}
        </div>
        {footerContent && <div className="shrink-0 border-t-2 border-ui-divider pt-4">{footerContent}</div>}
      </>}
    </Drawer>
  );
}

/** Online → Recently here: classmates who were online lately (their saved profile), newest first. */
function RecentlyHere({ rows, open }: { rows: Array<{ person: Person; seen: number | null }>; open: (person: Person) => void }) {
  return <>
    <h3 className="pb-1 pt-4 text-xs font-black text-ui-muted-strong">Recently here</h3>
    {rows.map(({ person, seen }) => (
      <button key={person.u} type="button" onClick={() => open(person)} className="flex w-full items-center gap-3 border-b-2 border-ui-divider py-3 text-left outline-none last:border-b-0 hover:bg-ui-hover focus-ring-inline">
        <Avatar name={person.n} color={person.c} size="lg" src={person.i} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-black text-ui-ink-strong">{person.n}</span>
          <span className="block truncate text-sm font-bold text-ui-muted">{seenLabel(seen)}</span>
        </span>
      </button>
    ))}
  </>;
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
  const lessonTotal = useLessonTotal(lesson);
  const { classmates, here, others } = useClassmates(people, online, lesson, lessonTotal);
  // Your own party is hidden from these lists but still counted online; the "more" lines must not count it.
  const withParty = useClassmates(useOthers(useAppStore((state) => state.socialPeople)), useOthers(useAppStore((state) => state.socialOnline)), lesson, lessonTotal);
  const moreHere = Math.max(0, lessonTotal - withParty.here.length);
  const moreOnline = Math.max(0, onlineTotal - withParty.classmates.length - moreHere);
  const openRooms = rooms.filter((room) => room.code !== recentRoom);
  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : prev.length < seats ? [...prev, id] : prev));
  const heading = (key: number | null) => {
    if (key === null) return 'Browsing the course';
    const entry = lessonHeading(key);
    const label = entry.eyebrow?.replace(/^Book \d+ · /, '') ?? '';
    return `Book ${Math.floor(key / 100)} · ${label}${entry.title === label ? '' : ` · ${entry.title}`}`;
  };
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
          tabs={[
            { id: 'online', label: 'Online', count: onlineTotal || (classmates.length ? classmates.length : undefined) },
            ...(race ? [] : [{ id: 'rooms' as const, label: 'Rooms', count: rooms.length }]),
          ]}
        />
      </div>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 custom-scrollbar">
        {panel.tab === 'rooms' ? <>
          {recentRoom && <div className="flex items-center gap-3 border-b-2 border-ui-divider py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black text-ui-ink-strong">Rejoin last room</span>
              <span className="block text-sm font-bold text-ui-muted">Room code {recentRoom}</span>
            </span>
            <ActionButton size="sm" loading={pending} loadingLabel="Rejoin" onClick={() => { void joinRace(identity, recentRoom); }}>Rejoin</ActionButton>
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
                <ActionButton size="sm" loading={pending} loadingLabel="Join" onClick={() => { void joinRace(identity, room.code); }}>Join</ActionButton>
              </div>
            ))}
        </> : classmates.length === 0 ? <EmptyNote>Nobody else is online.</EmptyNote> : <>
          {lesson !== null && here.length > 0 && (
              <>
                <h3 className="pb-1 pt-3 text-xs font-black text-ui-muted-strong">In this lesson</h3>
                {here.map((person) => (
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
                <MoreNote count={moreHere} where="in this lesson" />
              </>
          )}
          {others.map((person, index) => (
            <div key={person.u}>
              {(index === 0 || others[index - 1].l !== person.l) && (
                <h3 className="pb-1 pt-4 text-xs font-black text-ui-muted-strong">{heading(person.l)}</h3>
              )}
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
            </div>
          ))}
          <MoreNote count={moreOnline} where="online" />
        </>}
      </div>
      <div className="shrink-0 border-t-2 border-ui-divider pt-4">
        {pending ? <ActionButton fullWidth size="lg" variant="secondary" onClick={leaveRace}>Cancel connecting</ActionButton> : <ActionButton fullWidth size="lg" onClick={() => { void createRace(identity, defaultSelection(lesson), true, picked.slice(0, seats)); }}>
          {race ? picked.length ? 'Invite' : 'Back to room' : picked.length ? 'Send challenge' : 'Create room'}
        </ActionButton>}
      </div>
    </Drawer>
  );
}
