import { connectRace, leaveRaceRoom, type Identity } from '../../services/socialService';
import { useAppStore } from '../../store/useAppStore';
import { MAX_PLAYERS, ROOM_CODE, type RaceAction, type RaceFrame, type RaceSelection, type RaceSnapshot } from '../../../shared/quizRace';
import { lobby } from './lobbyController';
import { CHAT_KEEP, chatText, type PartyChatClientMessage } from '../../../shared/lobby';

let room: Awaited<ReturnType<typeof connectRace>> | null = null;
let connect: typeof connectRace = connectRace;
export function setRaceTransport(next: typeof connectRace | null) { leaveRace(); connect = next ?? connectRace; }
let launcher: { start: (race: RaceSnapshot) => void; stop: () => void } | null = null;
let generation = 0;
let pending: Promise<void> | null = null;
let abort: AbortController | null = null;
let leaving: Promise<void> = Promise.resolve();
let progress: Extract<RaceFrame, { type: 'progress' }> | null = null;
let sentProgress = '';
let settings: Extract<RaceFrame, { type: 'settings' }> | null = null;
let sentSettings = '';
/** The room as the server last sent it, before the host's unconfirmed quiz choice is overlaid. */
let serverRace: RaceSnapshot | null = null;
const invites = new Set<string>();
let rememberedAccount: string | null = null;
const RECENT_ROOM_TTL_MS = 60 * 60_000;
let recentRoomMemory: { userId: string; code: string; expiresAt: number } | null = null;
export function setRaceLauncher(next: typeof launcher) { launcher = next; }

function remember(code: string | null) {
  const id = code ? useAppStore.getState().currentUser?.id : rememberedAccount;
  if (!id) return;
  rememberedAccount = code ? id : null;
  try { if (code) sessionStorage.setItem(`race-room:${id}`, code); else sessionStorage.removeItem(`race-room:${id}`); } catch { /* In-memory reconnect still works without storage. */ }
}

function saveRecentRoom(userId: string, code: string) {
  const now = Date.now();
  if (recentRoomMemory?.userId === userId && recentRoomMemory.code === code && recentRoomMemory.expiresAt > now + RECENT_ROOM_TTL_MS / 2) return;
  const recent = { userId, code, expiresAt: now + RECENT_ROOM_TTL_MS };
  recentRoomMemory = recent;
  try { localStorage.setItem(`race-recent:${userId}`, JSON.stringify({ code, expiresAt: recent.expiresAt })); } catch { /* In-memory recovery still works in this tab. */ }
}

export function getRecentRaceCode(userId: string | null): string | null {
  if (!userId) return null;
  try {
    const value = JSON.parse(localStorage.getItem(`race-recent:${userId}`) ?? 'null') as { code?: unknown; expiresAt?: unknown } | null;
    if (value && typeof value.code === 'string' && ROOM_CODE.test(value.code) && typeof value.expiresAt === 'number' && value.expiresAt > Date.now()) return value.code;
    localStorage.removeItem(`race-recent:${userId}`);
  } catch { /* Fall back to the current tab's in-memory value. */ }
  return recentRoomMemory?.userId === userId && recentRoomMemory.expiresAt > Date.now() ? recentRoomMemory.code : null;
}

function forgetRecentRoom(userId: string | null, code: string) {
  if (!userId) return;
  if (recentRoomMemory?.userId === userId && recentRoomMemory.code === code) recentRoomMemory = null;
  try {
    const key = `race-recent:${userId}`;
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as { code?: unknown } | null;
    if (saved?.code === code) localStorage.removeItem(key);
  } catch { /* Storage is optional. */ }
}

function drainInvites() {
  const state = useAppStore.getState();
  if (!invites.size || !state.race || state.race.phase !== 'lobby' || state.socialStatus !== 'live') return;
  const to = [...invites];
  invites.clear();
  if (!lobby.invite(to, state.race.code)) to.forEach(id => invites.add(id));
}
useAppStore.subscribe((state, previous) => { if (state.socialStatus !== previous.socialStatus) drainInvites(); });

function replayProgress() {
  const state = useAppStore.getState();
  if (!progress || !room || state.raceStatus !== 'live' || !['race', 'review'].includes(state.race?.phase ?? '') || state.race?.round !== progress.round) return;
  const key = JSON.stringify(progress);
  if (sentProgress === key) return;
  // Marked before sending: a transport that answers synchronously must not re-send the same frame.
  sentProgress = key;
  if (room.send(progress) === false) sentProgress = '';
}
function flushSettings() {
  if (!settings || !room || useAppStore.getState().raceStatus !== 'live') return;
  // The latest choice is sent once; the socket keeps frame order, so no echo is awaited before the next one or Start.
  const key = JSON.stringify(settings);
  if (sentSettings === key) return;
  sentSettings = key;
  if (room.send(settings) === false) sentSettings = '';
}
/** The server refused something: show its room again instead of a choice it may never confirm. */
function dropSettings() {
  if (!settings) return;
  settings = null; sentSettings = '';
  if (serverRace) useAppStore.getState().setSocial({ race: serverRace });
}
const sameSettings = (state: RaceSnapshot, frame: NonNullable<typeof settings>) => state.round === frame.round && state.open === frame.open && JSON.stringify(state.selection) === JSON.stringify(frame.selection);

function onState(state: RaceSnapshot, userId: string) {
  const store = useAppStore.getState();
  const before = store.race;
  const me = state.players.find(player => player.id === userId);
  if (!me || me.left) {
    if (me?.leftReason === 'preparation-timeout') store.showFeedbackToast('Your first question or audio did not load in time. Join another race when it is ready.');
    clearRace(false);
    return;
  }
  if (!before && (state.phase === 'race' || state.phase === 'review') && me.finishedAt === null && me.answered > 0) {
    leaveRace();
    store.showFeedbackToast('This race was already in progress on another page. Join a new round.');
    return;
  }
  if (before?.code === state.code && (before.revision ?? 0) > (state.revision ?? 0)) return;
  if (state.phase !== 'lobby' || state.hostId !== userId || (settings && settings.round !== state.round)) settings = null;
  if (settings && sameSettings(state, settings)) settings = null;
  serverRace = state;
  if (settings) state = { ...state, selection: settings.selection, open: settings.open };
  if (before && JSON.stringify(before.selection) === JSON.stringify(state.selection)) state = { ...state, selection: before.selection };
  if (before?.round !== state.round) { progress = null; sentProgress = ''; }
  store.setSocial({ race: state, socialMe: userId, racePending: false, ...(before ? {} : { socialPanel: null, socialInvite: null }) });
  saveRecentRoom(userId, state.code);
  remember(state.code);
  const starting = (state.phase === 'preparing' || state.phase === 'race' || state.phase === 'review') && me.finishedAt === null;
  if (starting && !store.racePlaying) {
    store.setSocial({ racePlaying: true });
    launcher?.start(state);
  }
  if (store.racePlaying && (state.phase === 'results' || me.finishedAt !== null)) {
    store.setSocial({ racePlaying: false }); launcher?.stop();
  }
  replayProgress(); drainInvites(); flushSettings();
}

async function open(identity: Identity, target: Parameters<typeof connectRace>[1], restoring = false) {
  const current = useAppStore.getState().race;
  if (current || pending || room) return pending;
  const version = ++generation;
  const controller = new AbortController();
  abort = controller;
  useAppStore.getState().setSocial({ racePending: true, raceStatus: 'connecting' });
  const work = async () => {
    try {
      await leaving;
      if (version !== generation) return;
      const next = await connect(identity, target, {
        onState: (state, id) => {
          if (version !== generation) return;
          const me = state.players.find(player => player.id === id);
          if (restoring && (state.phase === 'race' || state.phase === 'review') && me?.finishedAt === null) {
            leaveRace();
            useAppStore.getState().showFeedbackToast('Reloading ends your race. Join a new round when you are ready.');
            return;
          }
          restoring = false;
          onState(state, id);
        },
        onStatus: status => {
          if (version !== generation) return;
          useAppStore.getState().setSocial({ raceStatus: status });
          if (status === 'reconnecting') { sentProgress = ''; sentSettings = ''; }
          if (status === 'off') clearRace(false);
        },
        onError: message => { if (version !== generation) return; dropSettings(); useAppStore.getState().showFeedbackToast(message); },
        onChat: message => {
          if (version !== generation) return;
          const store = useAppStore.getState();
          if (store.race?.code !== message.code) return;
          const previous = store.socialPartyChat?.code === message.code ? store.socialPartyChat.messages : [];
          const messages = message.type === 'chat-history' ? message.messages : previous.some(line => line.id === message.message.id) ? previous : [...previous, message.message];
          store.setSocial({ socialPartyChat: { code: message.code, messages: messages.slice(-CHAT_KEEP) } });
        },
      }, controller.signal);
      if (version !== generation) {
        next.close();
        // A cancelled HTTP join may share the new tab's room code. Never evict that newer connection;
        // an unused ticket's reserved seat is reclaimed by the server's reconnect deadline.
        return;
      }
      room = next; remember(next.code); drainInvites(); replayProgress();
    } catch (error) {
      if (version !== generation) return;
      useAppStore.getState().setSocial({ racePending: false, raceStatus: 'off' });
      remember(null);
      if ('code' in target && error instanceof Error && /expired|not found|no longer accepting/i.test(error.message)) {
        forgetRecentRoom(useAppStore.getState().currentUser?.id ?? null, target.code);
      }
      invites.clear();
      useAppStore.getState().showFeedbackToast(error instanceof Error ? error.message : 'Could not open the room.');
    } finally { if (version === generation) { pending = null; abort = null; } }
  };
  pending = work();
  return pending;
}

/** Waiting rooms/results survive a page reload. A live quiz reload withdraws instead of replaying SRS answers. */
export function restoreRace(identity: Identity, userId: string) {
  try {
    const code = sessionStorage.getItem(`race-room:${userId}`);
    if (code && ROOM_CODE.test(code)) { rememberedAccount = userId; void open(identity, { code }, true); }
  } catch { /* Session storage is optional. */ }
}

/** All Invite/Create entry points converge here: an existing waiting room is always reused. */
export function createRace(identity: Identity, selection: RaceSelection, openRoom: boolean, to: string[]) {
  to.forEach(id => invites.add(id));
  const race = useAppStore.getState().race;
  if (race) {
    if (race.phase !== 'lobby') { invites.clear(); useAppStore.getState().showFeedbackToast('Leave this race before creating another room.'); return Promise.resolve(); }
    if (to.length && race.players.filter(player => !player.left).length >= MAX_PLAYERS) { invites.clear(); useAppStore.getState().showFeedbackToast('Your room is full.'); return Promise.resolve(); }
    useAppStore.getState().setSocial({ socialPanel: null }); drainInvites(); return Promise.resolve();
  }
  return open(identity, { selection, open: openRoom });
}
export function joinRace(identity: Identity, code: string) {
  const current = useAppStore.getState().race;
  if (!ROOM_CODE.test(code)) { useAppStore.getState().showFeedbackToast('Invalid room code.'); return Promise.resolve(); }
  if (current) {
    if (current.code !== code) useAppStore.getState().showFeedbackToast('Leave your current room before joining another.');
    return Promise.resolve();
  }
  return open(identity, { code });
}
export const inviteToRace = (to: string[]) => { to.forEach(id => invites.add(id)); drainInvites(); };
export function raceSend(action: RaceAction) {
  const state = useAppStore.getState();
  if (!state.race || state.raceStatus !== 'live') return;
  if (action.type === 'settings') {
    settings = { ...action, round: state.race.round };
    state.setSocial({ race: { ...state.race, selection: action.selection, open: action.open } });
    flushSettings(); return;
  }
  if (action.type === 'start') flushSettings();
  return room?.send({ ...action, round: state.race.round });
}
export function partySend(message: PartyChatClientMessage): boolean {
  const state = useAppStore.getState();
  if (!state.race || state.raceStatus !== 'live') return false;
  const frame = message.type === 'chat' ? { ...message, text: chatText(message.text) } : message;
  return !!room && room.send(frame) !== false;
}
export function reportRaceProgress(answered: number, total: number, correct: number, reviewComplete = false) {
  const race = useAppStore.getState().race;
  if (!race) return;
  progress = { type: 'progress', round: race.round, answered, total, correct, reviewComplete };
  replayProgress();
}
function clearRace(notifyServer: boolean) {
  ++generation; abort?.abort(); abort = null; pending = null;
  const store = useAppStore.getState();
  const previous = room;
  const recentCode = previous?.code ?? store.race?.code;
  const recentUser = store.currentUser?.id ?? rememberedAccount;
  if (recentCode && recentUser) saveRecentRoom(recentUser, recentCode);
  room = null; progress = null; sentProgress = ''; settings = null; sentSettings = ''; serverRace = null; invites.clear(); remember(null);
  if (previous) {
    if (notifyServer) previous.send({ type: 'leave', round: store.race?.round ?? 1 });
    previous.close();
    if (notifyServer && connect === connectRace) leaving = leaveRaceRoom(previous.code).catch(() => {});
  }
  if (store.racePlaying) launcher?.stop();
  store.setSocial({ race: null, racePlaying: false, racePending: false, raceStatus: 'off', socialPartyChat: null, ...(store.socialPanel?.kind === 'partyChat' ? { socialPanel: null } : {}) });
}
export function leaveRace() { clearRace(true); }
