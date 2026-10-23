import { connectLobby, type Identity } from '../../services/socialService';
import { useAppStore } from '../../store/useAppStore';
import type { Activity, LobbyClientMessage, LobbyServerMessage } from '../../../shared/lobby';

/**
 * The single Lobby connection. Presence/subscription frames are deduped here and re-sent after a reconnect,
 * so callers can report freely without extra traffic.
 */
let socket: ReturnType<typeof connectLobby> | null = null;
let identityKey = '';
let generation = 0;
let here: Extract<LobbyClientMessage, { t: 'here' }> = { t: 'here', l: null, a: null, show: true };
let sub: Extract<LobbyClientMessage, { t: 'sub' }> = { t: 'sub', online: false, chat: null };
const CHAT_CAP = 50;

function receive(message: LobbyServerMessage) {
  const store = useAppStore.getState();
  const set = store.setSocial;
  switch (message.t) {
    case 'error': store.showFeedbackToast(message.message); break;
    case 'me': set({ socialMe: message.u }); break;
    case 'counts': {
      // Reuse unchanged lessons so only tiles whose faces changed re-render.
      const prev = store.socialCounts;
      const next: typeof prev = {};
      for (const [key, entry] of Object.entries(message.v)) next[key] = prev[key] && JSON.stringify(prev[key]) === JSON.stringify(entry) ? prev[key] : entry;
      set({ socialCounts: next, socialOnlineTotal: message.n ?? Object.values(next).reduce((sum, entry) => sum + entry.n, 0) });
      break;
    }
    case 'people': if (message.l === here.l) set({ socialPeople: message.v }); break;
    case 'online': set({ socialOnline: message.v }); break;
    case 'rooms': {
      const rooms = new Map(message.v.map(room => [room.code, room]));
      set({ socialRooms: message.v, ...(store.socialChat ? { socialChat: { ...store.socialChat, messages: store.socialChat.messages.map(line => line.r
        ? { ...line, r: rooms.get(line.r.code) ?? { ...line.r, joinable: false } } : line) } } : {}) });
      break;
    }
    case 'history': if (message.l === sub.chat) set({ socialChat: { lesson: message.l, messages: message.v } }); break;
    case 'msg': {
      const chat = store.socialChat;
      if (!chat || chat.lesson !== message.m.l || chat.messages.some(line => line.id === message.m.id)) break;
      const reading = store.socialPanel?.kind === 'people' && store.socialPanel.tab === 'chat';
      const mine = message.m.u === store.socialMe;
      set({
        socialChat: { lesson: chat.lesson, messages: [...chat.messages, message.m].slice(-CHAT_CAP) },
        socialUnread: !store.socialMuted && (store.socialUnread || (!reading && !mine && !store.blockedUsers.includes(message.m.u))),
      });
      break;
    }
    case 'cheer':
      if (!store.socialMuted && !store.blockedUsers.includes(message.from.u)) set({ socialCheer: { from: message.from, phrase: message.p, at: Date.now() } });
      break;
    case 'invite':
      if (!store.socialMuted && !store.blockedUsers.includes(message.from.u) && !store.race && !store.racePending) set({ socialInvite: { from: message.from, room: message.room } });
      break;
  }
}

/** A stand-in for the Lobby socket (the DEV classmate simulator). */
export interface LobbyTransport { send: (message: LobbyClientMessage) => boolean | void; close: () => void }
let transport: LobbyTransport | null = null;
let lastIdentity: Identity | null = null;

function send(message: LobbyClientMessage): boolean {
  const current = transport ?? socket;
  return !!current && current.send(message) !== false;
}

/** Frames from a transport go through the same path as server frames. */
export const deliver = receive;

/** Swaps the real socket for `next` (null restores the real Lobby). The current presence is replayed into it. */
export function setLobbyTransport(next: LobbyTransport | null) {
  transport?.close();
  transport = next;
  if (next) {
    ++generation; socket?.close(); socket = null; identityKey = '';
    useAppStore.getState().setSocial({ socialStatus: 'live' });
    next.send(here); next.send(sub);
  } else if (lastIdentity) {
    useAppStore.getState().setSocial({ socialStatus: 'off', socialCounts: {}, socialPeople: [], socialOnline: [], socialRooms: [], socialChat: null });
    startLobby(lastIdentity);
  }
}

export function startLobby(identity: Identity) {
  lastIdentity = identity;
  if (transport) return;
  const key = `${useAppStore.getState().currentUser?.id}|${identity.name}|${identity.color}`;
  if (socket && key === identityKey) return;
  const version = ++generation;
  socket?.close();
  identityKey = key;
  socket = connectLobby(identity, {
    onMessage: message => { if (version === generation) receive(message); },
    onStatus: status => {
      if (version !== generation) return;
      useAppStore.getState().setSocial({ socialStatus: status, ...(status !== 'live' ? { socialCounts: {}, socialPeople: [], socialOnline: [], socialRooms: [], socialOnlineTotal: 0 } : {}) });
      if (status === 'off') { socket = null; identityKey = ''; }
    },
    onOpen: () => { if (version === generation) { send(here); send(sub); } },
  });
}

export function stopLobby() {
  ++generation;
  socket?.close();
  socket = null;
  identityKey = '';
  const state = useAppStore.getState();
  state.setSocial({ socialStatus: 'off', socialMe: state.race ? state.socialMe : null, socialCounts: {}, socialOnlineTotal: 0, socialPeople: [], socialOnline: [], socialRooms: [], socialChat: null, socialUnread: false, socialInvite: null, socialCheer: null });
}

export const lobby = {
  here(l: number | null, a: Activity | null, show: boolean) {
    if (here.l === l && here.a === a && here.show === show) return;
    if (here.l !== l) useAppStore.getState().setSocial({ socialPeople: [] });
    here = { t: 'here', l, a, show };
    send(here);
  },
  subscribe(online: boolean, chat: number | null) {
    if (sub.online === online && sub.chat === chat) return;
    if (sub.chat !== chat) useAppStore.getState().setSocial({ socialChat: null, socialUnread: false });
    sub = { t: 'sub', online, chat };
    send(sub);
  },
  say: (l: number, text: string) => send({ t: 'say', l, text }),
  cheer: (to: string[], p: number) => { if (to.length) send({ t: 'cheer', to, p }); },
  invite: (to: string[], code: string) => to.length > 0 && send({ t: 'invite', to, code }),
  report: (id: number) => send({ t: 'report', id }),
};
