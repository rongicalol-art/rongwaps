/**
 * DEV only: 50 fake classmates for trying study together without the games Worker.
 * They move between lessons, chat, cheer, invite you, open rooms and race you. Frames go through the real
 * Lobby/room code paths (`deliver`, `onState`); nothing reaches a server or your study progress.
 */
import { useAppStore } from '../../../store/useAppStore';
import type { Activity, ChatMessage, LessonCount, LobbyClientMessage, Person } from '../../../../shared/lobby';
import { applyRaceAction, enterRace, newRaceRoom, summarizeRoom, type RaceAction, type RaceRoomState, type RaceRoomSummary, type RaceSnapshot, type SocialColor } from '../../../../shared/quizRace';
import type { connectRace } from '../../../services/socialService';
import { deliver, setLobbyTransport } from '../lobbyController';
import { setRaceTransport } from '../raceController';

const NAMES = ['Mei', 'Jun', 'Ana', 'Kai', 'Lin', 'Wei', 'Sara', 'Leo', 'Yuki', 'Minh', 'Hana', 'Tomas', 'Ines', 'Arjun', 'Nadia', 'Ken', 'Lucas',
  'Emma', 'Hao', 'Ivy', 'Omar', 'Zoe', 'Ryo', 'Ming', 'Priya', 'Daniel', 'Chloe', 'Mateo', 'Sofia', 'Yen', 'Aiko', 'Ben', 'Lily', 'Noah', 'Mia',
  'Ethan', 'Grace', 'Sam', 'Tina', 'Jay', 'Rosa', 'Felix', 'Nina', 'Vic', 'Elle', 'Tao', 'Kim', 'Iris', 'Max', 'Pia'];
const COLORS: SocialColor[] = ['honey', 'jade', 'plum', 'blue', 'ink'];
const FAKE_AVATAR = (index: number): string => `https://i.pravatar.cc/150?img=${(index % 70) + 1}`;
const LESSONS = [100, 101, 101, 101, 102, 102, 103, 103, 104, 105, 106, 107, 108, 201];
const ACTIVITIES: Activity[] = ['lesson', 'cards', 'cards', 'quiz', 'reading', 'grammar', 'writing'];
const LINES = ['第五個字怎麼念？', '老師是 lǎoshī 嗎？', '我也常常念錯 😅', '加油！', '好棒！', '這課好難', '「漂亮」怎麼寫？', '誰要一起考試？',
  'Anyone want to race?', '我剛學完第一部分', '謝謝！', '你好！我是新同學', '這個字是什麼意思？', 'I keep mixing up 他 and 她', '明天有考試嗎？',
  '我喜歡這課的對話', '等我一下', 'Part 2 vocab is hard', '你們都好快！', '學生 is xuéshēng right?', '我們一起加油吧'];
const REPLIES = ['好啊！', '哈哈', '謝謝！你也加油', '對！', '我也是', '走吧，開房間！', '真的嗎？', 'Same 😂'];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => min + Math.random() * (max - min);
const ME = 'me';

let users: Person[] = [];
let me = { l: null as number | null, a: null as Activity | null, show: true };
let sub = { online: false, chat: null as number | null };
const chats = new Map<number, ChatMessage[]>();
let rooms: RaceRoomSummary[] = [];
let nextId = 1;
const timers = new Set<ReturnType<typeof setTimeout>>();
let race: { room: RaceRoomState; onState: (state: RaceSnapshot, userId: string) => void } | null = null;
let running = false;

const myName = () => {
  const state = useAppStore.getState();
  return state.displayName.trim() || (state.currentUser?.fullName ?? '').split(/\s+/)[0] || 'You';
};
const meAsPerson = (): Person => ({
  u: ME,
  n: myName(),
  c: useAppStore.getState().avatarColor,
  l: me.l,
  a: me.a,
  i: useAppStore.getState().currentUser?.avatarUrl,
});
const later = (fn: () => void, ms: number) => { const timer = setTimeout(() => { timers.delete(timer); if (running) fn(); }, ms); timers.add(timer); };
const every = (fn: () => void, min: number, max: number) => { const loop = () => later(() => { fn(); loop(); }, between(min, max)); loop(); };
const othersIn = (lesson: number | null) => users.filter((user) => user.l === lesson);

function emit() {
  const everyone = me.show ? [...users, meAsPerson()] : users;
  const counts: Record<string, LessonCount> = {};
  for (const person of everyone) {
    if (person.l === null) continue;
    const entry = counts[person.l] ??= { n: 0, f: [] };
    entry.n += 1;
    if (entry.f.length < 3) entry.f.push(person);
  }
  deliver({ t: 'counts', v: counts, n: everyone.length, f: everyone.slice(0, 4) });
  deliver({ t: 'people', l: me.l, v: me.l === null ? [] : everyone.filter((person) => person.l === me.l) });
  if (sub.online) deliver({ t: 'online', v: everyone.slice(0, 100) });
  deliver({ t: 'rooms', v: rooms });
}

function post(from: Person, lesson: number, text: string, room?: RaceRoomSummary) {
  const message: ChatMessage = {
    id: nextId++,
    l: lesson,
    u: from.u,
    n: from.n,
    c: from.c,
    t: text,
    ts: Date.now(),
    ...(room ? { r: room } : {}),
    ...(from.i ? { i: from.i } : {}),
  };
  const list = [...(chats.get(lesson) ?? []), message].slice(-50);
  chats.set(lesson, list);
  if (sub.chat === lesson) deliver({ t: 'msg', m: message });
}

/** Gives a lesson some earlier conversation the first time you open it. */
const seeded = new Set<number>();
function seedHistory(lesson: number) {
  if (seeded.has(lesson)) return;
  seeded.add(lesson);
  const people = othersIn(lesson).length ? othersIn(lesson) : users.slice(0, 4);
  const earlier = Array.from({ length: 12 }, (_, index) => {
    const from = pick(people);
    return {
      id: index - 12,
      l: lesson,
      u: from.u,
      n: from.n,
      c: from.c,
      t: pick(LINES),
      ts: Date.now() - (12 - index) * 60_000,
      ...(from.i ? { i: from.i } : {}),
    };
  });
  chats.set(lesson, [...earlier, ...(chats.get(lesson) ?? [])].slice(-50));
}

/** A fake player in a lesson near mine; moves someone in when the lesson is empty. */
function someoneIn(lesson: number): Person {
  const here = othersIn(lesson);
  if (here.length) return pick(here);
  const user = pick(users);
  user.l = lesson;
  return user;
}

function simRoom(host: Person, lesson: number | null): RaceRoomSummary {
  const id = lesson !== null && Math.floor(lesson / 100) === 1 ? lesson % 100 : 1;
  const players = [host, ...users.filter((user) => user !== host).slice(0, Math.floor(between(0, 2.99)))];
  return {
    code: Array.from({ length: 6 }, () => pick('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split(''))).join(''),
    host: host.n,
    hostColor: host.c,
    hostImage: host.i,
    players: players.map((player) => ({ name: player.n, color: player.c, image: player.i })),
    selection: { lessons: { [id]: id === 0 ? [1] : [1, 2, 3] }, types: [] },
    open: true,
    joinable: true,
  };
}

function handle(message: LobbyClientMessage) {
  if (message.t === 'here') { me = { l: message.l, a: message.a, show: message.show }; emit(); return; }
  if (message.t === 'sub') {
    const changed = message.chat !== sub.chat;
    sub = { online: message.online, chat: message.chat };
    if (changed && sub.chat !== null) { seedHistory(sub.chat); deliver({ t: 'history', l: sub.chat, v: chats.get(sub.chat) ?? [] }); }
    if (sub.online) emit();
    return;
  }
  if (message.t === 'say') {
    post(meAsPerson(), message.l, message.text);
    later(() => post(someoneIn(message.l), message.l, pick(REPLIES)), between(1500, 3500));
    return;
  }
  if (message.t === 'cheer') {
    const target = users.find((user) => message.to.includes(user.u));
    if (target) later(() => deliver({ t: 'cheer', from: target, p: pick([0, 1]) }), between(1500, 3000));
    return;
  }
  if (message.t === 'invite' && race) {
    for (const id of message.to) {
      const user = users.find((entry) => entry.u === id);
      if (user && Math.random() < 0.85) later(() => { if (race?.room.code === message.code) joinMyRoom(user); }, between(1200, 4000));
    }
  }
}

// ---- races ---------------------------------------------------------------------------------------------------------

function broadcast() {
  if (!race) return;
  race.onState({ ...race.room, serverTime: Date.now(), connected: race.room.players.map((player) => player.id) }, ME);
}

function act(userId: string, action: RaceAction) {
  if (!race) return;
  try { applyRaceAction(race.room, userId, { ...action, round: race.room.round }, Date.now(), () => Math.random().toString(36).slice(2, 10)); } catch { return; }
  if (action.type === 'ready' && userId === ME && race.room.phase === 'preparing') {
    for (const player of race.room.players.filter(entry => entry.id !== ME && !entry.left)) {
      try { applyRaceAction(race.room, player.id, { type: 'ready', planHash: action.planHash, reviewFlow: 1, round: race.room.round }, Date.now(), () => Math.random().toString(36).slice(2, 10)); } catch { /* A simulated player can leave during preparation. */ }
    }
  }
  broadcast();
  if (race.room.phase === 'race' && (action.type === 'start' || action.type === 'ready')) racePlayers();
}

function joinMyRoom(user: Person) {
  if (!race || race.room.phase !== 'lobby') return;
  try { enterRace(race.room, user.u, user.n, user.c, Date.now(), user.i); } catch { return; }
  broadcast();
}

/** Each fake player answers every 2.5–5.5 s, about 80% right, on the same number of words as you. */
function racePlayers() {
  if (!race) return;
  const round = race.room.round;
  const code = race.room.code;
  for (const player of race.room.players.filter((entry) => entry.id !== ME)) {
    let answered = 0; let correct = 0;
    const step = () => later(() => {
      if (!race || race.room.code !== code || race.room.round !== round || race.room.phase !== 'race') return;
      const total = race.room.players.find((entry) => entry.id === ME)?.total || 12;
      answered += 1; if (Math.random() < 0.8) correct += 1;
      act(player.id, { type: 'progress', answered: Math.min(answered, total), total, correct: Math.min(correct, total), reviewComplete: answered >= total });
      if (answered < total) step();
    }, between(2500, 5500));
    step();
  }
}

const connectSim: typeof connectRace = async (_identity, target, handlers) => {
  if (useAppStore.getState().currentUser) throw new Error('Sign out before simulating a race: quizzes record real study progress.');
  handlers.onStatus('live');
  const now = Date.now();
  const listed = 'code' in target ? rooms.find((room) => room.code === target.code) : undefined;
  const selection = 'code' in target ? listed?.selection ?? { lessons: { 1: [1, 2, 3] }, types: [] } : target.selection;
  const code = 'code' in target ? target.code : Array.from({ length: 6 }, () => pick('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.split(''))).join('');
  const room = newRaceRoom(code, selection, 'code' in target ? true : target.open, Math.random().toString(36).slice(2, 10), now);
  race = { room, onState: handlers.onState };
  if ('code' in target) {
    // Their room: the host and friends are in, you join, the host starts a few seconds later.
    const host = users.find((user) => user.n === listed?.host) ?? pick(users);
    enterRace(room, host.u, host.n, host.c, now, host.i);
    for (const user of users.filter((entry) => entry !== host).slice(0, (listed?.players.length ?? 2) - 1)) enterRace(room, user.u, user.n, user.c, now, user.i);
    enterRace(room, ME, myName(), useAppStore.getState().avatarColor, now, useAppStore.getState().currentUser?.avatarUrl);
    later(() => { if (race?.room.code === code) act(host.u, { type: 'start' }); }, between(5000, 8000));
  } else {
    enterRace(room, ME, myName(), useAppStore.getState().avatarColor, now, useAppStore.getState().currentUser?.avatarUrl);
    if (room.open) {
      rooms = [summarizeRoom(room), ...rooms];
      if (me.l !== null) post(meAsPerson(), me.l, '', summarizeRoom(room));
      later(() => { if (race?.room.code === code) joinMyRoom(someoneIn(me.l ?? 101)); }, between(3000, 7000));
    }
  }
  later(broadcast, 50);
  later(() => handlers.onChat?.({ type: 'chat-history', code, messages: [] }), 100);
  return {
    code,
    send: (action) => {
      if (action.type === 'chat-report') return true;
      if (action.type === 'chat') {
        const line: ChatMessage = { id: nextId++, l: 0, u: ME, n: myName(), c: useAppStore.getState().avatarColor, t: action.text, ts: Date.now() };
        handlers.onChat?.({ type: 'chat-message', code, message: line });
        const friend = room.players.find(player => player.id !== ME);
        if (friend) later(() => handlers.onChat?.({ type: 'chat-message', code, message: { ...line, id: nextId++, u: friend.id, n: friend.name, c: friend.color as SocialColor, i: friend.image, t: pick(REPLIES) } }), 1500);
        return true;
      }
      act(ME, action);
      if (action.type === 'leave') race = null;
    },
    close: () => { race = null; },
  };
};

// ---- lifecycle -----------------------------------------------------------------------------------------------------

export function startSimulator() {
  if (running) return;
  running = true;
  users = NAMES.map((name, index) => ({ u: `sim-${index}`, n: name, c: COLORS[index % COLORS.length], l: pick(LESSONS), a: pick(ACTIVITIES), i: FAKE_AVATAR(index) }));
  rooms = [simRoom(users[3], 104), simRoom(users[7], 102), simRoom(users[12], 101)];
  setRaceTransport(connectSim);
  setLobbyTransport({ send: handle, close: () => {} });
  deliver({ t: 'me', u: ME });
  emit();
  // People wander between lessons and activities.
  every(() => {
    for (let index = 0; index < 3; index++) {
      const user = pick(users);
      if (Math.random() < 0.3) user.l = pick(LESSONS);
      user.a = pick(ACTIVITIES);
    }
    emit();
  }, 1800, 3200);
  // Chat in the lesson you're in (and elsewhere, kept for when you arrive).
  every(() => {
    const lesson = sub.chat !== null && Math.random() < 0.75 ? sub.chat : pick(LESSONS);
    post(someoneIn(lesson), lesson, pick(LINES));
  }, 2500, 6500);
  every(() => { if (me.l !== null && othersIn(me.l).length) deliver({ t: 'cheer', from: pick(othersIn(me.l)), p: pick([0, 1]) }); }, 30_000, 50_000);
  every(() => {
    if (useAppStore.getState().race) return;
    const host = me.l !== null && othersIn(me.l).length ? pick(othersIn(me.l)) : pick(users);
    const room = simRoom(host, me.l);
    rooms = [room, ...rooms].slice(0, 6);
    deliver({ t: 'invite', from: host, room });
  }, 45_000, 75_000);
  every(() => {
    if (me.l === null) return;
    const host = someoneIn(me.l);
    const room = simRoom(host, me.l);
    rooms = [room, ...rooms].slice(0, 6);
    post(host, me.l, '', room);
  }, 40_000, 70_000);
}

export function stopSimulator() {
  running = false;
  timers.forEach(clearTimeout);
  timers.clear();
  race = null;
  setRaceTransport(null);
  setLobbyTransport(null);
}

export const isSimulating = () => running;

/** Debug buttons: make something happen now. */
export const simulate = {
  invite() {
    const host = me.l !== null && othersIn(me.l).length ? pick(othersIn(me.l)) : pick(users);
    const room = simRoom(host, me.l);
    rooms = [room, ...rooms].slice(0, 6);
    deliver({ t: 'invite', from: host, room });
  },
  cheer() { deliver({ t: 'cheer', from: me.l !== null && othersIn(me.l).length ? pick(othersIn(me.l)) : pick(users), p: pick([0, 1, 3]) }); },
  chatBurst() { const lesson = sub.chat ?? 101; for (let index = 0; index < 8; index++) later(() => post(someoneIn(lesson), lesson, pick(LINES)), index * 350); },
};
