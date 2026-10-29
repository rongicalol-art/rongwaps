import { useEffect, useMemo, useState } from 'react';
import { ActionButton, AppIcon, AvatarStack, Drawer, DropdownMenu, DropdownMenuItem, IconActionButton } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import type { SocialPanel } from '../../../store/slices/socialSlice';
import { GLOBAL_CHAT, type Person } from '../../../../shared/lobby';
import { MAX_PLAYERS, socialColor } from '../../../../shared/quizRace';
import { createRace, getRecentRaceCode, joinRace, leaveRace } from '../raceController';
import { useSocialIdentity } from '../useSocialLifecycle';
import { defaultSelection, describeSelection } from '../socialText';
import { ChatThread } from './ChatThread';
import { EmptyNote, MuteButton, PanelTabs, PanelTitle, PersonRow, lessonHeading } from './SocialBits';
import { VisitProfile } from './VisitProfile';

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
  const race = useAppStore(state => state.race);
  return list.filter((person) => person.u !== me && (!hideRoom || !race?.players.some(player => player.id === person.u && !player.left)));
}

function useClassmates(people: Person[], online: Person[], lesson: number | null) {
  const classmates = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of online) map.set(p.u, p);
    for (const p of people) {
      const existing = map.get(p.u);
      map.set(p.u, existing ? { ...existing, l: existing.l ?? lesson } : { ...p, l: p.l ?? lesson });
    }
    return Array.from(map.values());
  }, [online, people, lesson]);

  return useMemo(() => {
    if (lesson === null) {
      return {
        classmates,
        here: [] as Person[],
        others: [...classmates].sort((a, b) => (a.l ?? 1000) - (b.l ?? 1000) || a.n.localeCompare(b.n)),
      };
    }
    const inLesson: Person[] = [];
    const inOthers: Person[] = [];
    for (const p of classmates) {
      if (p.l === lesson) inLesson.push(p);
      else inOthers.push(p);
    }
    inLesson.sort((a, b) => a.n.localeCompare(b.n));
    inOthers.sort((a, b) => (a.l ?? 1000) - (b.l ?? 1000) || a.n.localeCompare(b.n));
    return { classmates, here: inLesson, others: inOthers };
  }, [classmates, lesson]);
}

const close = () => useAppStore.getState().setSocial({ socialPanel: null, socialMentionTarget: null });
const setPanel = (socialPanel: SocialPanel) => useAppStore.getState().setSocial({ socialPanel });

/** Classmates drawer: who is online (current lesson first, then other lessons) and the chat thread. */
export function PeoplePanel({ panel }: { panel: Extract<SocialPanel, { kind: 'people' }> }) {
  const currentLesson = useCurrentLesson();
  const lesson = panel.chatLesson ?? currentLesson;
  const people = useOthers(useAppStore(state => state.socialPeople));
  const online = useOthers(useAppStore(state => state.socialOnline));
  const onlineTotal = useOnlineTotal();
  const identity = useSocialIdentity();
  const pending = useAppStore(state => state.racePending);
  const hasRoom = useAppStore(state => !!state.race);
  const roomPlayers = useAppStore(state => state.race?.players);
  const inMyRoom = (person: Person) => !!roomPlayers?.some(player => player.id === person.u && !player.left);
  const rooms = useAppStore(state => state.socialRooms);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const { classmates, here, others } = useClassmates(people, online, lesson);
  const crowd = classmates.slice(0, 4).map(person => ({ name: person.n, color: person.c, src: person.i }));
  const visit = panel.tab === 'online' ? panel.visit : undefined;
  const selected = visit ? classmates.find(person => person.u === visit.u) ?? visit : null;
  const setProfile = (person: Person | null) => setPanel({ ...panel, visit: person ?? undefined });
  const mention = (person: Person) => useAppStore.getState().setSocial({ socialMentionDraft: person, socialPanel: { kind: 'people', tab: 'chat', chatScope: 'global' } });
  const scope = lesson === null ? 'global' : panel.chatScope ?? 'lesson';
  const invite = (person: Person) => { void createRace(identity, defaultSelection(person.l ?? lesson), true, [person.u]); };
  const heading = (key: number | null) => {
    if (key === null) return 'Browsing the course';
    const entry = lessonHeading(key);
    const label = entry.eyebrow?.replace(/^Book \d+ · /, '') ?? '';
    return `Book ${Math.floor(key / 100)} · ${label}${entry.title === label ? '' : ` · ${entry.title}`}`;
  };
  return (
    <Drawer isOpen onClose={close}
      title={panel.tab === 'chat'
        ? <div className="mr-1 flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 flex-1">
              <DropdownMenu label="Choose chat" open={roomMenuOpen} onOpenChange={setRoomMenuOpen} align="start" gapClassName="mt-1" widthClassName="w-64"
                renderTrigger={(triggerProps) => (
                  <button {...triggerProps} type="button" className="flex max-w-full items-center gap-1.5 rounded-control py-1 pr-1.5 text-left outline-none transition-colors hover:bg-ui-hover focus-ring">
                    <h2 className="min-w-0 truncate text-xl font-black text-ui-ink-strong">{scope === 'global' ? 'Everyone' : lessonHeading(lesson).eyebrow ?? 'Lesson chat'}</h2>
                    <AppIcon name="dropdown" size={16} className="shrink-0 text-ui-muted-strong" />
                  </button>
                )}>
                {lesson !== null && <>
                  <DropdownMenuItem active={scope === 'lesson'} onClick={() => { setRoomMenuOpen(false); useAppStore.getState().setSocial({ socialMentionTarget: null }); setPanel({ ...panel, chatScope: 'lesson', chatLesson: undefined }); }}>{lessonHeading(lesson).eyebrow}</DropdownMenuItem>
                  <DropdownMenuItem active={scope === 'global'} onClick={() => { setRoomMenuOpen(false); useAppStore.getState().setSocial({ socialMentionTarget: null }); setPanel({ ...panel, chatScope: 'global', chatLesson: undefined }); }}>Everyone</DropdownMenuItem>
                </>}
                <DropdownMenuItem onClick={() => { setRoomMenuOpen(false); setPanel({ kind: 'people', tab: 'online' }); }}>Who’s online</DropdownMenuItem>
              </DropdownMenu>
            </div>
            <MuteButton />
          </div>
        : selected ? <IconActionButton size="md" label="Back to classmates" icon={<AppIcon name="back" size={20} />} onClick={() => setProfile(null)} /> : `Online${onlineTotal || classmates.length ? ` ${onlineTotal || classmates.length}` : ''}`}
      tone="practice" size="md" mdPlacement="side" heightClassName="h-[80vh] md:h-full"
      className="top-auto h-[80dvh] max-h-[80dvh] rounded-t-3xl md:h-full md:max-h-full md:rounded-none"
      contentClassName="flex min-h-0 flex-col !overflow-hidden pb-4">
      {panel.tab === 'chat' ? <>
        <ChatThread key={`${scope}:${lesson}`} lesson={scope === 'global' ? GLOBAL_CHAT : lesson ?? GLOBAL_CHAT} />
      </> : <>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 custom-scrollbar">
          {!selected && (
            <button type="button" onClick={() => setPanel({ ...panel, tab: 'chat', chatScope: 'global', chatLesson: undefined })} className="flex w-full items-center gap-3 border-b-2 border-ui-divider py-3 text-left outline-none hover:bg-ui-hover focus-ring-inline">
              {crowd.length > 0 ? <AvatarStack people={crowd} total={onlineTotal || classmates.length} max={4} size="lg" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-primary text-sm font-black text-brand-on-primary">{onlineTotal || classmates.length}</span>}
              <span className="min-w-0 flex-1"><span className="block text-base font-black text-ui-ink-strong">Everyone</span><span className="block truncate text-sm font-bold text-ui-muted">{onlineTotal || classmates.length} online</span></span>
              <AppIcon name="next" size={18} className="text-ui-muted" />
            </button>
          )}
          {!selected && rooms.map(room => <div key={room.code} className="flex items-center gap-3 border-b-2 border-ui-divider py-4 last:border-b-0">
            <AvatarStack people={room.players.map(player => ({ name: player.name, color: socialColor(player.color), src: player.image }))} size="sm" />
            <span className="min-w-0 flex-1"><span className="block truncate text-base font-black text-ui-ink-strong">{room.host}’s room</span><span className="block truncate text-sm font-bold text-ui-muted">{describeSelection(room.selection)}</span></span>
            <ActionButton size="sm" onClick={() => { void joinRace(identity, room.code); }}>Join</ActionButton>
          </div>)}
          {selected ? <VisitProfile key={selected.u} person={selected} lesson={lesson} online={classmates.some(person => person.u === selected.u)} />
          : classmates.length === 0 ? <EmptyNote>Nobody else is online.</EmptyNote> : <>
            {lesson !== null && (
              here.length > 0 ? (
                <>
                  <h3 className="pb-1 pt-3 text-xs font-black text-ui-muted-strong">In this lesson</h3>
                  {here.map((person) => (
                    <PersonRow key={person.u} person={person} lesson={lesson} onOpen={() => setProfile(person)} action={<ActionButton size="sm" variant="secondary" onClick={() => invite(person)}>Invite</ActionButton>} />
                  ))}
                </>
              ) : (
                <>
                  <h3 className="pb-1 pt-3 text-xs font-black text-ui-muted-strong">In this lesson</h3>
                  <p className="py-2 text-sm font-bold text-ui-muted">Nobody else is in this lesson yet.</p>
                </>
              )
            )}
            {others.map((person, index) => (
              <div key={person.u}>
                {(index === 0 || others[index - 1].l !== person.l) && <h3 className="pb-1 pt-4 text-xs font-black text-ui-muted-strong">{heading(person.l)}</h3>}
                <PersonRow person={person} lesson={lesson} onOpen={() => setProfile(person)} action={<ActionButton size="sm" variant="secondary" onClick={() => invite(person)}>Invite</ActionButton>} />
              </div>
            ))}
          </>}
        </div>
        {(pending || selected || panel.tab === 'online') && <div className="shrink-0 border-t-2 border-ui-divider pt-4">{pending ? <ActionButton fullWidth size="lg" variant="secondary" onClick={leaveRace}>Cancel connecting</ActionButton> : selected ? inMyRoom(selected) ? <ActionButton fullWidth size="lg" variant="secondary" onClick={() => mention(selected)}><AppIcon name="at" size={20} />Mention</ActionButton> : <div className="flex gap-2.5"><ActionButton size="lg" variant="secondary" aria-label="Mention" onClick={() => mention(selected)}><AppIcon name="at" size={20} /><span className="hidden sm:inline">Mention</span></ActionButton><div className="min-w-0 flex-1"><ActionButton fullWidth size="lg" onClick={() => invite(selected)}>Invite to room</ActionButton></div></div> : <ActionButton fullWidth size="lg" onClick={() => { void createRace(identity, defaultSelection(lesson), true, []); }}>{hasRoom ? 'Back to room' : 'Start a room'}</ActionButton>}</div>}
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
  const { classmates, here, others } = useClassmates(people, online, lesson);
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
        </> : classmates.length === 0 ? <EmptyNote>Nobody else is online.</EmptyNote> : <>
          {lesson !== null && (
            here.length > 0 ? (
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
              </>
            ) : (
              <>
                <h3 className="pb-1 pt-3 text-xs font-black text-ui-muted-strong">In this lesson</h3>
                <p className="py-2 text-sm font-bold text-ui-muted">Nobody else is in this lesson right now.</p>
              </>
            )
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
