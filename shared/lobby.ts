/**
 * Lobby protocol (presence, lesson chat, cheers, invites). Short keys keep frames small.
 * A lesson key is `bookId * 100 + lessonId`.
 */
import { stripControl, type RaceRoomSummary, type SocialColor } from './quizRace';

export const CHEER_PHRASES = ['加油！', '好棒！', '一起考試？', '等我一下'] as const;
export const ACTIVITIES = ['lesson', 'cards', 'quiz', 'grammar', 'reading', 'writing', 'race'] as const;
export type Activity = typeof ACTIVITIES[number];
export const CHAT_MAX = 300;

export interface Person { u: string; n: string; c: SocialColor; l: number | null; a: Activity | null; i?: string }
/** `r` turns the line into a room card (an open room announced in this lesson). */
export interface ChatMessage { id: number; l: number; u: string; n: string; c: SocialColor; t: string; ts: number; r?: RaceRoomSummary; i?: string }
export interface LessonCount { n: number; f: Person[] }

export type LobbyClientMessage =
  | { t: 'here'; l: number | null; a: Activity | null; show: boolean }
  | { t: 'sub'; online: boolean; chat: number | null }
  | { t: 'say'; l: number; text: string }
  | { t: 'cheer'; to: string[]; p: number }
  | { t: 'invite'; to: string[]; code: string }
  | { t: 'report'; id: number };

export type LobbyServerMessage =
  | { t: 'error'; message: string }
  | { t: 'me'; u: string }
  | { t: 'counts'; v: Record<string, LessonCount>; n?: number }
  | { t: 'people'; l: number | null; v: Person[] }
  | { t: 'online'; v: Person[] }
  | { t: 'history'; l: number; v: ChatMessage[] }
  | { t: 'msg'; m: ChatMessage }
  | { t: 'cheer'; from: Person; p: number }
  | { t: 'invite'; from: Person; room: RaceRoomSummary }
  | { t: 'rooms'; v: RaceRoomSummary[] };

const lessonKey = (value: unknown): number | null => (Number.isInteger(value) && Number(value) >= 0 && Number(value) < 1000 ? Number(value) : null);
const ROOM_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/** Validates one client frame; throws on anything malformed. */
export function parseLobbyMessage(value: unknown): LobbyClientMessage {
  if (!value || typeof value !== 'object') throw new Error('Invalid message.');
  const data = value as Record<string, unknown>;
  if (data.t === 'here') {
    const a = (ACTIVITIES as readonly unknown[]).includes(data.a) ? data.a as Activity : null;
    return { t: 'here', l: lessonKey(data.l), a, show: data.show !== false };
  }
  if (data.t === 'sub') return { t: 'sub', online: data.online === true, chat: lessonKey(data.chat) };
  if (data.t === 'say' && lessonKey(data.l) !== null && typeof data.text === 'string') {
    const text = stripControl(data.text, true).trim().slice(0, CHAT_MAX);
    if (text) return { t: 'say', l: Number(data.l), text };
  }
  if (data.t === 'cheer' && Array.isArray(data.to) && Number.isInteger(data.p) && Number(data.p) >= 0 && Number(data.p) < CHEER_PHRASES.length) {
    const to = data.to.filter((id): id is string => typeof id === 'string' && id.length <= 64).slice(0, 8);
    if (to.length) return { t: 'cheer', to, p: Number(data.p) };
  }
  if (data.t === 'invite' && Array.isArray(data.to) && typeof data.code === 'string' && ROOM_CODE.test(data.code)) {
    const to = data.to.filter((id): id is string => typeof id === 'string' && id.length <= 64).slice(0, 8);
    if (to.length) return { t: 'invite', to, code: data.code };
  }
  if (data.t === 'report' && Number.isInteger(data.id) && Number(data.id) > 0) return { t: 'report', id: Number(data.id) };
  throw new Error('Invalid message.');
}
