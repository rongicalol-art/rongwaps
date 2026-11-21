import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ActionButton, AppIcon, Avatar, PlayfulNavIcon } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { friendRequests } from '../../../store/slices/socialSlice';
import { GLOBAL_CHAT, type ChatMessage } from '../../../../shared/lobby';
import type { SocialColor } from '../../../../shared/quizRace';
import type { Person } from '../../../../shared/lobby';
import { addFriend, loadFriends, loadInbox, loadSaved, removeFriend } from '../friendsController';
import { listTime, seenLabel, whereLabel } from '../socialText';
import { UnreadBadge } from './Presence';
import { FriendButton } from './VisitProfile';

const NO_LINES: ChatMessage[] = [];
const open = (thread: string) => useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'chat', thread } });

/** One row: a face (with the live dot), a name, one quiet line, and the time and count on the right. */
function Row({ face, name, line, fresh, side, onOpen, action }: { face: ReactNode; name: string; line: ReactNode; fresh?: boolean; side?: ReactNode; onOpen?: () => void; action?: ReactNode }) {
  const body = <>
    {face}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-base font-black text-ui-ink-strong">{name}</span>
      <span className={`block truncate text-sm ${fresh ? 'font-extrabold text-ui-ink-strong' : 'font-bold text-ui-muted'}`}>{line}</span>
    </span>
    {side && <span className="flex shrink-0 flex-col items-end gap-1 text-xs font-bold text-ui-muted">{side}</span>}
  </>;
  return (
    <div className="flex items-center gap-3 border-b-2 border-ui-divider py-3 last:border-b-0">
      {onOpen ? <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 rounded-compact text-left outline-none hover:bg-ui-hover focus-ring-inline">{body}</button> : <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>}
      {action}
    </div>
  );
}

const face = (person: { n: string; c: SocialColor; i?: string }, live: boolean) => <Avatar name={person.n} color={person.c} src={person.i} size="lg" live={live} />;

/**
 * Chats (like LINE): the class chat pinned on top, friend requests, then one row per conversation, newest first,
 * and friends you haven't written to yet. Each opens in the same panel.
 */
export function ChatList() {
  const lines = useAppStore(state => state.socialChat?.lesson === GLOBAL_CHAT ? state.socialChat.messages : NO_LINES);
  const classUnread = useAppStore(state => (state.socialMuted ? 0 : state.socialChatUnread));
  const friends = useAppStore(state => state.socialFriends);
  const inbox = useAppStore(state => state.socialInbox);
  const saved = useAppStore(state => state.socialSaved);
  const requests = useAppStore(useShallow(friendRequests));
  const me = useAppStore(state => state.socialMe);
  const muted = useAppStore(state => state.socialMuted);
  const onlineIds = useAppStore(useShallow(state => [...state.socialOnline, ...state.socialPeople, ...state.socialFaces].map(person => person.u)));
  const livePeople = useAppStore(state => state.socialOnline);
  const online = useMemo(() => new Set(onlineIds), [onlineIds]);
  useEffect(() => { void loadFriends(); void loadInbox(); }, []);
  const mutual = useMemo(() => (friends ?? []).filter(person => person.iAdded && person.addedMe), [friends]);
  const people = useMemo(() => new Map((friends ?? []).map(person => [person.u, person])), [friends]);
  useEffect(() => { if (friends?.length) void loadSaved(friends.map(person => person.u)); }, [friends]);
  const photo = (u: string) => livePeople.find(person => person.u === u)?.i ?? saved[u]?.card?.i;
  const last = [...lines].reverse().find(line => line.t);
  const talked = new Set(inbox.map(row => row.u));
  const quiet = mutual.filter(person => !talked.has(person.u));
  const status = (u: string) => (online.has(u) ? 'Online' : seenLabel(saved[u]?.seen));

  return (
    <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 custom-scrollbar">
      <div className="pb-2 pt-1">
        <ActionButton fullWidth size="sm" variant="secondary" onClick={() => open('add')}><AppIcon name="addFriend" size={18} />Add friends</ActionButton>
      </div>
      <Row onOpen={() => open('class')} fresh={classUnread > 0}
        face={<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-primary-soft"><PlayfulNavIcon name="global" className="h-6 w-6" /></span>}
        name="Class chat"
        line={last ? <><span className="font-black">{last.u === me ? 'You' : last.n}:</span> <span className="font-chinese">{last.t}</span></> : 'Say hi to everyone'}
        side={<>{last && <span>{listTime(last.ts)}</span>}{classUnread > 0 && <UnreadBadge count={classUnread} />}</>} />
      {requests.length > 0 && <h3 className="pb-1 pt-4 text-xs font-black text-ui-muted-strong">Friend requests</h3>}
      {requests.map(person => (
        <Row key={person.u} onOpen={() => useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'online', visit: { u: person.u, n: person.n, c: person.c, l: null, a: null, ...(photo(person.u) ? { i: photo(person.u) } : {}) } } })}
          face={face({ ...person, i: photo(person.u) }, online.has(person.u))} name={person.n} line={status(person.u)}
          action={<span className="flex shrink-0 gap-2">
            <ActionButton size="sm" variant="secondary" onClick={() => { void removeFriend(person.u); }}>Not now</ActionButton>
            <ActionButton size="sm" onClick={() => { void addFriend(person); }}>Accept</ActionButton>
          </span>} />
      ))}
      {(inbox.length > 0 || quiet.length > 0) && <h3 className="pb-1 pt-4 text-xs font-black text-ui-muted-strong">Friends</h3>}
      {inbox.map(row => {
        const person = people.get(row.u);
        if (!person) return null;
        const unread = muted ? 0 : row.unread;
        return <Row key={row.u} onOpen={() => open(row.u)} fresh={unread > 0}
          face={face({ ...person, i: photo(row.u) }, online.has(row.u))} name={person.n}
          line={<span className="font-chinese">{row.lastFrom === row.u ? '' : 'You: '}{row.last}</span>}
          side={<><span>{listTime(row.at)}</span>{unread > 0 && <UnreadBadge count={unread} />}</>} />;
      })}
      {quiet.map(person => <Row key={person.u} onOpen={() => open(person.u)} face={face({ ...person, i: photo(person.u) }, online.has(person.u))} name={person.n} line={status(person.u)} />)}
      {friends !== null && mutual.length === 0 && requests.length === 0 && (
        <p className="py-6 text-center text-sm font-bold text-ui-muted">Add a classmate as a friend to message them.</p>
      )}
    </div>
  );
}

/**
 * Chats → Add friends: everyone online now, then classmates who were here lately, each with Add (or Accept, Sent).
 * Friends already made are left out; a tap on the row opens the profile.
 */
export function AddFriends({ online, recent, lesson }: { online: Person[]; recent: Array<{ person: Person; seen: number | null }>; lesson: number | null }) {
  const friends = useAppStore(state => state.socialFriends);
  const mutual = useMemo(() => new Set((friends ?? []).filter(person => person.iAdded && person.addedMe).map(person => person.u)), [friends]);
  useEffect(() => { void loadFriends(); }, []);
  const visit = (person: Person) => useAppStore.getState().setSocial({ socialPanel: { kind: 'people', tab: 'online', visit: person } });
  const here = online.filter(person => !mutual.has(person.u));
  const lately = recent.filter(row => !mutual.has(row.person.u));
  const row = (person: Person, line: string, live: boolean) => (
    <Row key={person.u} onOpen={() => visit(person)} face={face(person, live)} name={person.n} line={line} action={<FriendButton person={person} compact />} />
  );
  return (
    <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 custom-scrollbar">
      {here.length > 0 && <h3 className="pb-1 pt-1 text-xs font-black text-ui-muted-strong">Online now</h3>}
      {here.map(person => row(person, whereLabel(person.l, person.a, person.l === lesson), true))}
      {lately.length > 0 && <h3 className="pb-1 pt-4 text-xs font-black text-ui-muted-strong">Recently here</h3>}
      {lately.map(({ person, seen }) => row(person, seenLabel(seen), false))}
      {!here.length && !lately.length && <p className="py-6 text-center text-sm font-bold text-ui-muted">Nobody to add right now. Classmates show up here when they’re online.</p>}
    </div>
  );
}
