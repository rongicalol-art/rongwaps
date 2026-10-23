/**
 * Quiz race rules, shared by the games Worker (authority) and the app (types).
 * The room never sends questions: every player builds the same mixed quiz locally from
 * `selection` and `seed`, and reports only progress counts.
 */
import { BETA_LAST_LESSON } from './courseAccess';

export const RACE_TYPES = ['meaning', 'listen', 'hanzi', 'match', 'true-false', 'build'] as const;
export type RaceType = typeof RACE_TYPES[number];
/** Profile avatar palette keys a player may show; anything else becomes the first. */
export const SOCIAL_COLORS = ['blue', 'honey', 'jade', 'plum', 'ink'] as const;
export type SocialColor = typeof SOCIAL_COLORS[number];
export const socialColor = (value: unknown): SocialColor => SOCIAL_COLORS.find(color => color === value) ?? 'blue';
/** Display names are self-chosen profile names, trimmed and capped. */
/** Drops control characters (newlines too unless `keepNewlines`). */
export const stripControl = (text: string, keepNewlines = false) => Array.from(text)
  .filter((char) => { const code = char.charCodeAt(0); return (code >= 32 && code !== 127) || (keepNewlines && code === 10); }).join('');
export const socialName = (value: unknown): string => typeof value === 'string' ? stripControl(value).trim().slice(0, 30) : '';
export const MAX_SOCIAL_IMAGE_LENGTH = 2048;
/** Only provider avatars and signed URLs for the configured profile-media avatar are shared with room members. */
export function socialImage(value: unknown, supabaseUrl?: string): string | undefined {
  if (typeof value !== 'string' || !value || value.length > MAX_SOCIAL_IMAGE_LENGTH) return undefined;
  try {
    const image = new URL(value);
    if (image.protocol !== 'https:' || image.username || image.password || image.hash) return undefined;
    const providerAvatar = image.hostname === 'googleusercontent.com' || image.hostname.endsWith('.googleusercontent.com');
    let profileAvatar = false;
    if (supabaseUrl) {
      const storage = new URL(supabaseUrl);
      profileAvatar = image.origin === storage.origin && /^\/storage\/v1\/object\/sign\/profile-media\/[^/]+\/avatar\.webp$/.test(image.pathname);
    }
    return providerAvatar || profileAvatar ? image.href : undefined;
  } catch { return undefined; }
}
export const MAX_PLAYERS = 4;
export const DISCONNECT_GRACE_MS = 60_000;
export const REVIEW_GRACE_MS = 5 * 60_000;
export const ROOM_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const ROOM_TTL_MS = 30 * 60_000;
const RACE_MS = 10 * 60_000;
export const PREPARATION_TIMEOUT_MS = 60_000;
const MAX_WORDS = 2000;

/** Book 1 lessons (key "0"–"8") to their picked parts (1–3); `types` empty = Mixed. */
export interface RaceSelection { lessons: Record<string, number[]>; types: RaceType[] }
export interface RacePlayer {
  id: string; name: string; color: string; image?: string;
  answered: number; total: number; correct: number;
  finishedAt: number | null; place: number | null; left: boolean;
  preparedAt?: number | null;
  planHash?: string;
  reviewFlow?: number;
  leftReason?: 'left' | 'disconnected' | 'preparation-timeout';
  /** Null while connected; persisted so eviction cannot reset a disconnected seat's grace period. */
  disconnectedAt?: number | null;
}
export interface RaceRoomState {
  code: string; hostId: string; open: boolean; announced: boolean; selection: RaceSelection; seed: string;
  phase: 'lobby' | 'preparing' | 'race' | 'review' | 'results'; players: RacePlayer[]; prepareError?: 'not-ready' | 'content-mismatch' | 'client-mismatch';
  startedAt: number | null; deadline: number; reviewDeadline?: number; prepareDeadline?: number; expiresAt: number; round: number;
  revision?: number;
}
export type RaceSnapshot = RaceRoomState & { serverTime: number; connected: string[] };
export type RaceAction =
  | { type: 'settings'; selection: RaceSelection; open: boolean }
  | { type: 'start' | 'rematch' | 'leave' }
  | { type: 'ready'; planHash: string; reviewFlow: 0 | 1 }
  | { type: 'progress'; answered: number; total: number; correct: number; reviewComplete: boolean };
export type RaceFrame = RaceAction & { round: number };

/** Room listing shown in the Rooms tab and in invites. */
export interface RaceRoomSummary {
  code: string; host: string; hostColor: string; hostImage?: string; players: Array<{ name: string; color: string; image?: string }>;
  selection: RaceSelection; open: boolean; joinable: boolean;
  expiresAt?: number; revision?: number;
}

const isCount = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= MAX_WORDS;

export function parseSelection(value: unknown): RaceSelection {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const lessons: Record<string, number[]> = {};
  const input = data.lessons && typeof data.lessons === 'object' ? data.lessons as Record<string, unknown> : {};
  for (const [key, parts] of Object.entries(input)) {
    const lesson = Number(key);
    if (!Number.isInteger(lesson) || lesson < 0 || lesson > BETA_LAST_LESSON || !Array.isArray(parts)) continue;
    const picked = [...new Set(parts.filter((part): part is number => Number.isInteger(part) && part >= 1 && part <= (lesson === 0 ? 1 : 3)))].sort();
    if (picked.length) lessons[String(lesson)] = picked;
  }
  if (!Object.keys(lessons).length) throw new Error('Pick at least one lesson part.');
  const types = Array.isArray(data.types)
    ? [...new Set(data.types.filter((type): type is RaceType => (RACE_TYPES as readonly unknown[]).includes(type)))]
    : [];
  return { lessons, types };
}

export function parseRaceAction(value: unknown): RaceFrame {
  if (!value || typeof value !== 'object') throw new Error('Invalid action.');
  const data = value as Record<string, unknown>;
  if (!Number.isSafeInteger(data.round) || Number(data.round) < 1) throw new Error('Rejoin the room to update your connection.');
  const round = Number(data.round);
  if (data.type === 'start' || data.type === 'rematch' || data.type === 'leave') return { type: data.type, round };
  if (data.type === 'ready' && typeof data.planHash === 'string' && /^[a-f\d]{64}$/i.test(data.planHash)) return { type: 'ready', planHash: data.planHash.toLowerCase(), reviewFlow: data.reviewFlow === 1 ? 1 : 0, round };
  if (data.type === 'settings') return { type: 'settings', selection: parseSelection(data.selection), open: data.open === true, round };
  if (data.type === 'progress' && isCount(data.answered) && isCount(data.total) && isCount(data.correct)) {
    return { type: 'progress', answered: data.answered, total: data.total, correct: Math.min(data.correct, data.answered), reviewComplete: data.reviewComplete === true, round };
  }
  throw new Error('Invalid action.');
}

export function newRaceRoom(code: string, selection: RaceSelection, open: boolean, seed: string, now: number): RaceRoomState {
  return { code, hostId: '', open, announced: false, selection, seed, phase: 'lobby', players: [], prepareError: undefined, startedAt: null, deadline: 0, reviewDeadline: 0, prepareDeadline: 0, expiresAt: now + ROOM_TTL_MS, round: 1 };
}

const fresh = (player: RacePlayer): RacePlayer => ({ ...player, answered: 0, total: 0, correct: 0, finishedAt: null, place: null, preparedAt: null, planHash: undefined, reviewFlow: undefined, leftReason: undefined });

/** The seat colour: the player's profile colour when nobody in the room has it, else the first free one. */
function seatColor(room: RaceRoomState, wanted: string): SocialColor {
  const taken = new Set(room.players.filter(player => !player.left).map(player => player.color));
  const profile = socialColor(wanted);
  return !taken.has(profile) ? profile : SOCIAL_COLORS.find(color => !taken.has(color)) ?? profile;
}

export function enterRace(room: RaceRoomState, id: string, name: string, color: string, now: number, image?: string): RacePlayer {
  advanceRace(room, now);
  if (now >= room.expiresAt) throw new Error('This room has expired.');
  const existing = room.players.find(player => player.id === id);
  if (existing) {
    let rejoining = false;
    if (existing.left) {
      if (room.phase !== 'results') throw new Error('This round is already underway. Rejoin after the room is ready for another round.');
      existing.left = false;
      existing.leftReason = undefined;
      rejoining = true;
    }
    existing.name = name; existing.image = image;
    if (rejoining) existing.disconnectedAt = null;
    return existing;
  }
  if (room.phase !== 'lobby') throw new Error('This race has already started.');
  if (room.players.length >= MAX_PLAYERS) throw new Error('This room is full.');
  const player: RacePlayer = fresh({ id, name, color: seatColor(room, color), image, answered: 0, total: 0, correct: 0, finishedAt: null, place: null, left: false, disconnectedAt: null });
  room.players.push(player);
  if (!room.hostId) room.hostId = id;
  return player;
}

function finishIfDone(room: RaceRoomState, now: number) {
  if (room.phase !== 'race' && room.phase !== 'review') return;
  const racing = room.players.filter(player => !player.left);
  if (racing.every(player => player.finishedAt !== null)) { room.phase = 'results'; return; }
  if (room.phase === 'race' && now >= room.deadline) {
    room.phase = 'review';
    room.reviewDeadline = room.deadline + REVIEW_GRACE_MS;
    room.expiresAt = Math.max(room.expiresAt, room.reviewDeadline);
  }
  if (room.phase === 'review' && now >= (room.reviewDeadline ?? room.deadline)) room.phase = 'results';
}

function beginRace(room: RaceRoomState, now: number) {
  const players = room.players.filter(player => !player.left);
  if (room.phase !== 'preparing' || players.length < 2 || players.some(player => player.preparedAt == null || player.disconnectedAt != null)) return false;
  if (players.some(player => player.reviewFlow !== 1)) {
    room.phase = 'results'; room.prepareError = 'client-mismatch'; room.prepareDeadline = 0;
    return false;
  }
  room.phase = 'race'; room.startedAt = now; room.deadline = now + RACE_MS; room.reviewDeadline = 0; room.prepareDeadline = 0;
  room.expiresAt = Math.max(room.expiresAt, room.deadline + 5 * 60_000);
  return true;
}

/** Applies one validated action from `userId`; throws a readable error for the client. */
export function applyRaceAction(room: RaceRoomState, userId: string, action: RaceAction & { round?: number }, now: number, newSeed: () => string) {
  advanceRace(room, now);
  if (now >= room.expiresAt) throw new Error('This room has expired.');
  if (action.type !== 'leave' && action.round !== room.round) throw new Error('This round has ended.');
  const player = room.players.find(entry => entry.id === userId);
  if (!player || player.left) throw new Error('Join the room first.');
  const isHost = room.hostId === userId;
  if (action.type === 'settings') {
    if (!isHost || room.phase !== 'lobby') throw new Error('Only the host can change the quiz.');
    room.selection = action.selection; room.open = action.open;
  } else if (action.type === 'start') {
    if (!isHost || room.phase !== 'lobby') throw new Error('Only the host can start.');
    if (room.players.length < 2 || room.players.some(entry => entry.disconnectedAt != null)) throw new Error('Wait for at least two players and everyone to connect.');
    room.phase = 'preparing'; room.prepareError = undefined; room.startedAt = null; room.deadline = 0; room.reviewDeadline = 0; room.prepareDeadline = now + PREPARATION_TIMEOUT_MS;
    for (const entry of room.players) if (!entry.left) { entry.preparedAt = null; entry.planHash = undefined; entry.reviewFlow = undefined; }
  } else if (action.type === 'ready') {
    if (room.phase !== 'preparing') return;
    const otherPlanHash = room.players.find(entry => !entry.left && entry.planHash)?.planHash;
    if (otherPlanHash && otherPlanHash !== action.planHash) {
      room.phase = 'results'; room.prepareError = 'content-mismatch'; room.prepareDeadline = 0;
      return;
    }
    player.planHash = action.planHash;
    player.reviewFlow = action.reviewFlow;
    player.preparedAt ??= now;
    beginRace(room, now);
  } else if (action.type === 'progress') {
    if ((room.phase !== 'race' && room.phase !== 'review') || player.finishedAt !== null) return;
    if (!action.total || (player.total && player.total !== action.total)) throw new Error('The quiz deck changed. Leave and start a new race.');
    const answered = Math.min(action.answered, action.total);
    if (action.reviewComplete && answered < action.total) throw new Error('The review is not complete.');
    if (answered < player.answered) return;
    player.correct = Math.max(player.correct, Math.min(action.correct, player.correct + answered - player.answered));
    player.total = action.total;
    player.answered = answered;
    if (player.total > 0 && player.answered >= player.total && action.reviewComplete) {
      player.finishedAt = now;
      player.place = room.players.filter(entry => entry.place !== null).length + 1;
    }
    finishIfDone(room, now);
  } else if (action.type === 'leave') {
    depart(room, userId, now);
    failPreparationIfUnderstaffed(room);
  } else if (action.type === 'rematch') {
    if (!isHost || room.phase !== 'results') throw new Error('Only the host can start a rematch.');
    room.players = room.players.filter(entry => !entry.left).map(fresh);
    room.phase = 'lobby'; room.prepareError = undefined; room.startedAt = null; room.deadline = 0; room.reviewDeadline = 0; room.prepareDeadline = 0; room.round += 1; room.seed = newSeed();
    room.expiresAt = now + ROOM_TTL_MS;
  }
}

function depart(room: RaceRoomState, userId: string, now: number, reason: RacePlayer['leftReason'] = 'left') {
  if (room.phase === 'lobby') room.players = room.players.filter(entry => entry.id !== userId);
  else { const player = room.players.find(entry => entry.id === userId); if (player) { player.left = true; player.leftReason = reason; } }
  if (room.hostId === userId) room.hostId = room.players.find(entry => !entry.left && entry.disconnectedAt == null)?.id
    ?? room.players.find(entry => !entry.left)?.id ?? '';
  if (!room.players.some(entry => !entry.left)) { room.expiresAt = now; room.open = false; room.hostId = ''; }
  finishIfDone(room, now);
}

function failPreparationIfUnderstaffed(room: RaceRoomState) {
  if (room.phase !== 'preparing' || room.players.filter(player => !player.left).length >= 2) return;
  room.phase = 'results'; room.prepareError = 'not-ready'; room.prepareDeadline = 0;
}

/** Deadlines and lost connections progress even when every browser has gone away. */
export function advanceRace(room: RaceRoomState, now: number) {
  for (const player of [...room.players]) {
    if (!player.left && player.disconnectedAt != null && now - player.disconnectedAt >= DISCONNECT_GRACE_MS) depart(room, player.id, now, 'disconnected');
  }
  failPreparationIfUnderstaffed(room);
  if (room.phase === 'preparing' && now >= (room.prepareDeadline ?? 0)) {
    for (const player of [...room.players]) if (!player.left && (player.preparedAt == null || player.disconnectedAt != null)) depart(room, player.id, now, 'preparation-timeout');
    if (!beginRace(room, now) && room.players.some(player => !player.left)) {
      room.phase = 'results'; room.prepareError = 'not-ready'; room.prepareDeadline = 0;
    } else if (room.phase === 'preparing') {
      room.phase = 'results'; room.prepareError = 'not-ready'; room.prepareDeadline = 0;
    }
  } else beginRace(room, now);
  finishIfDone(room, now);
}

export function summarizeRoom(room: RaceRoomState): RaceRoomSummary {
  const host = room.players.find(player => player.id === room.hostId);
  const present = room.players.filter(player => !player.left);
  return {
    code: room.code, host: host?.name ?? '', hostColor: host?.color ?? '', hostImage: host?.image,
    players: present.map(player => ({ name: player.name, color: player.color, image: player.image })),
    selection: room.selection, open: room.open,
    joinable: room.phase === 'lobby' && present.length > 0 && present.length < MAX_PLAYERS,
    expiresAt: room.expiresAt, revision: room.revision ?? 0,
  };
}
