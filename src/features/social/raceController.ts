import { connectRace, leaveRaceRoom, type Identity } from '../../services/socialService';
import { useAppStore } from '../../store/useAppStore';
import { MAX_PLAYERS, ROOM_CODE, type RaceAction, type RaceFrame, type RaceSelection, type RaceSnapshot } from '../../../shared/quizRace';
import { lobby } from './lobbyController';

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
let settingsInFlight: Extract<RaceFrame, { type: 'settings' }> | null = null;
const invites = new Set<string>();
let rememberedAccount: string | null = null;
export function setRaceLauncher(next: typeof launcher) { launcher = next; }

function remember(code: string | null) {
  const id = code ? useAppStore.getState().currentUser?.id : rememberedAccount;
  if (!id) return;
  rememberedAccount = code ? id : null;
  try { if (code) sessionStorage.setItem(`race-room:${id}`, code); else sessionStorage.removeItem(`race-room:${id}`); } catch { /* In-memory reconnect still works without storage. */ }
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
  if (!progress || !room || state.raceStatus !== 'live' || state.race?.phase !== 'race' || state.race.round !== progress.round) return;
  const key = JSON.stringify(progress);
  if (sentProgress !== key && room.send(progress) !== false) sentProgress = key;
}
function flushSettings() {
  if (!settings || settingsInFlight || !room || useAppStore.getState().raceStatus !== 'live') return;
  settingsInFlight = settings;
  if (room.send(settings) === false) settingsInFlight = null;
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
  if (!before && state.phase === 'race' && me.finishedAt === null && me.answered > 0) {
    leaveRace();
    store.showFeedbackToast('This race was already in progress on another page. Join a new round.');
    return;
  }
  if (before?.code === state.code && (before.revision ?? 0) > (state.revision ?? 0)) return;
  if (state.phase !== 'lobby' || state.hostId !== userId || (settings && settings.round !== state.round)) { settings = null; settingsInFlight = null; }
  if (settingsInFlight && sameSettings(state, settingsInFlight)) settingsInFlight = null;
  if (settings && sameSettings(state, settings)) settings = null;
  if (settings) state = { ...state, selection: settings.selection, open: settings.open };
  if (before && JSON.stringify(before.selection) === JSON.stringify(state.selection)) state = { ...state, selection: before.selection };
  if (before?.round !== state.round) { progress = null; sentProgress = ''; }
  store.setSocial({ race: state, socialMe: userId, racePending: false, ...(before ? {} : { socialPanel: null, socialInvite: null }) });
  remember(state.code);
  const starting = (state.phase === 'preparing' || state.phase === 'race') && me.finishedAt === null;
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
          if (restoring && state.phase === 'race' && me?.finishedAt === null) {
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
          if (status === 'reconnecting') { sentProgress = ''; settingsInFlight = null; }
          if (status === 'off') clearRace(false);
        },
        onError: message => { if (version === generation) useAppStore.getState().showFeedbackToast(message); },
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
  if (action.type === 'start' && settings) { state.showFeedbackToast('Saving your quiz choices. Try Start again in a moment.'); return; }
  return room?.send({ ...action, round: state.race.round });
}
export function reportRaceProgress(answered: number, total: number, correct: number) {
  const race = useAppStore.getState().race;
  if (!race) return;
  progress = { type: 'progress', round: race.round, answered, total, correct };
  replayProgress();
}
function clearRace(notifyServer: boolean) {
  ++generation; abort?.abort(); abort = null; pending = null;
  const store = useAppStore.getState();
  const previous = room;
  room = null; progress = null; sentProgress = ''; settings = null; settingsInFlight = null; invites.clear(); remember(null);
  if (previous) {
    if (notifyServer) previous.send({ type: 'leave', round: store.race?.round ?? 1 });
    previous.close();
    if (notifyServer && connect === connectRace) leaving = leaveRaceRoom(previous.code).catch(() => {});
  }
  if (store.racePlaying) launcher?.stop();
  store.setSocial({ race: null, racePlaying: false, racePending: false, raceStatus: 'off' });
}
export function leaveRace() { clearRace(true); }
