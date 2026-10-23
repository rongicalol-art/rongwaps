import { useState } from 'react';
import { ActionButton, AppIcon, AvatarStack, Drawer } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import type { SocialPanel } from '../../../store/slices/socialSlice';
import type { Person } from '../../../../shared/lobby';
import { MAX_PLAYERS, socialColor } from '../../../../shared/quizRace';
import { createRace, joinRace, leaveRace } from '../raceController';
import { useSocialIdentity } from '../useSocialLifecycle';
import { defaultSelection, describeSelection } from '../socialText';
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

function useOthers(list: Person[]) {
  const me = useAppStore((state) => state.socialMe);
  const blocked = useAppStore((state) => state.blockedUsers);
  const race = useAppStore(state => state.race);
  return list.filter((person) => person.u !== me && !blocked.includes(person.u) && !race?.players.some(player => player.id === person.u && !player.left));
}

const close = () => useAppStore.getState().setSocial({ socialPanel: null });
const setPanel = (socialPanel: SocialPanel) => useAppStore.getState().setSocial({ socialPanel });

/** "N here" from the lesson window: who's studying this lesson, everyone online, and the lesson chat. */
export function PeoplePanel({ panel }: { panel: Extract<SocialPanel, { kind: 'people' }> }) {
  const lesson = useCurrentLesson();
  const people = useOthers(useAppStore((state) => state.socialPeople));
  const online = useOthers(useAppStore((state) => state.socialOnline));
  const onlineTotal = useOnlineTotal();
  const unread = useAppStore((state) => state.socialUnread);
  const identity = useSocialIdentity();
  const pending = useAppStore(state => state.racePending);
  const hasRoom = useAppStore(state => !!state.race);
  const invite = (person: Person) => { void createRace(identity, defaultSelection(lesson), true, [person.u]); };
  const list = panel.tab === 'online' ? online : people;
  return (
    <Drawer
      isOpen
      onClose={close}
      title={<PanelTitle {...lessonHeading(lesson)} />}
      tone="practice" size="md" mdPlacement="side" heightClassName="h-[80vh] md:h-full"
      contentClassName="flex min-h-0 flex-col !overflow-hidden pb-4"
    >
      <div className="shrink-0 pb-3">
        <PanelTabs
          label="Study together"
          value={panel.tab}
          onChange={(tab) => setPanel({ kind: 'people', tab })}
          tabs={[{ id: 'lesson', label: 'Lesson' }, { id: 'online', label: 'Online', count: panel.tab === 'online' ? online.length : onlineTotal }, { id: 'chat', label: 'Chat', dot: unread && panel.tab !== 'chat' }]}
        />
      </div>
      {panel.tab === 'chat' ? (lesson !== null ? <ChatThread lesson={lesson} /> : <EmptyNote>Open a lesson to chat.</EmptyNote>) : (
        <>
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 custom-scrollbar">
            {list.length === 0 ? <EmptyNote>{panel.tab === 'online' ? 'Nobody else is online.' : 'Nobody else is here yet.'}</EmptyNote> : list.map((person) => (
              <PersonRow key={person.u} person={person} lesson={lesson} action={<ActionButton size="sm" variant="secondary" onClick={() => invite(person)}>Invite</ActionButton>} />
            ))}
          </div>
          <div className="shrink-0 border-t-2 border-ui-divider pt-4">{pending ? <ActionButton fullWidth size="lg" variant="secondary" onClick={leaveRace}>Cancel connecting</ActionButton> : <ActionButton fullWidth size="lg" onClick={() => { void createRace(identity, defaultSelection(lesson), true, []); }}>{hasRoom ? 'Back to room' : 'Start a room'}</ActionButton>}</div>
        </>
      )}
    </Drawer>
  );
}

/** Practice hub → Challenge: pick people (this lesson or anyone online) or join an open room. */
export function ChallengePanel({ panel }: { panel: Extract<SocialPanel, { kind: 'challenge' }> }) {
  const lesson = useCurrentLesson();
  const people = useOthers(useAppStore((state) => state.socialPeople));
  const online = useOthers(useAppStore((state) => state.socialOnline));
  const onlineTotal = useOnlineTotal();
  const rooms = useAppStore((state) => state.socialRooms);
  const identity = useSocialIdentity();
  const race = useAppStore(state => state.race);
  const pending = useAppStore(state => state.racePending);
  const seats = MAX_PLAYERS - (race?.players.filter(player => !player.left).length ?? 1);
  const [picked, setPicked] = useState<string[]>([]);
  const list = panel.tab === 'online' ? online : people;
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
        {panel.tab === 'rooms' ? (rooms.length === 0 ? <EmptyNote>No open rooms right now.</EmptyNote> : rooms.map((room) => (
          <div key={room.code} className="flex items-center gap-3 border-b-2 border-ui-divider py-3.5 last:border-b-0">
            <AvatarStack people={room.players.map((player) => ({ name: player.name, color: socialColor(player.color), src: player.image }))} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-black text-ui-ink-strong">{room.host}’s room</span>
              <span className="block truncate text-sm font-bold text-ui-muted">{describeSelection(room.selection)}</span>
            </span>
            <span className="text-xs font-black tabular-nums text-ui-muted-strong">{room.players.length}/4</span>
            <ActionButton size="sm" onClick={() => { void joinRace(identity, room.code); }}>Join</ActionButton>
          </div>
        ))) : list.length === 0 ? <EmptyNote>{panel.tab === 'online' ? 'Nobody else is online.' : 'Nobody else is in this lesson.'}</EmptyNote> : list.map((person) => (
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
