/**
 * Lobby protocol (presence, lesson chat, cheers, invites). Short keys keep frames small.
 * A lesson key is `bookId * 100 + lessonId`.
 */
import { MAX_SOCIAL_IMAGE_LENGTH, stripControl, type RaceRoomSummary, type SocialColor } from './quizRace';

export const CHEER_PHRASES = ['加油！', '好棒！', '一起考試？', '等我一下'] as const;
export const ACTIVITIES = ['lesson', 'cards', 'quiz', 'grammar', 'reading', 'writing', 'race'] as const;
export type Activity = typeof ACTIVITIES[number];
export const CHAT_MAX = 300;
export const GLOBAL_CHAT = 0;
export const CHAT_KEEP = 50;
export const CHAT_TTL_MS = 24 * 3_600_000;
export const SOCIAL_FRAME_BYTES = 4096;

/** Plain text only; cap visible characters and remove control/bidi spoofing characters. */
export function chatText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const clean = stripControl(value.replace(/[\r\n\t]+/g, ' ')).replace(/[\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim();
  return Array.from(clean).slice(0, CHAT_MAX).join('');
}

export interface ChatRate { times: number[]; text: string; at: number }
/** Stored by account so reconnecting cannot reset the chat cooldown. */
export function nextChatRate(previous: ChatRate | null, text: string, now: number): ChatRate | null {
  const times = (previous?.times ?? []).filter(time => now - time < 10_000);
  if (times.length >= 5 || (previous && (now - previous.at < 1000 || (previous.text === text && now - previous.at < 30_000)))) return null;
  return { times: [...times, now], text, at: now };
}

export type PartyChatClientMessage = { type: 'chat'; text: string; mentions?: string[] } | { type: 'chat-report'; id: number };
export type PartyChatServerMessage =
  | { type: 'chat-history'; code: string; messages: ChatMessage[] }
  | { type: 'chat-message'; code: string; message: ChatMessage };

export interface Person { u: string; n: string; c: SocialColor; l: number | null; a: Activity | null; i?: string }
/** `r` turns the line into a room card (an open room announced in this lesson). */
export interface ChatMessage { id: number; l: number; u: string; n: string; c: SocialColor; t: string; ts: number; r?: RaceRoomSummary; i?: string }
export interface MentionNotice { key: string; channel: number; room?: string; message: ChatMessage; read: boolean }
export interface LessonCount { n: number; f: Person[] }

export type LobbyClientMessage =
  | { t: 'here'; l: number | null; a: Activity | null; show: boolean; i?: string }
  | { t: 'sub'; online: boolean; chat: number | null }
  | { t: 'say'; l: number; text: string; mentions?: string[] }
  | { t: 'cheer'; to: string[]; p: number }
  | { t: 'invite'; to: string[]; code: string }
  | { t: 'report'; id: number }
  | { t: 'mention-read'; key: string }
  | { t: 'mention-open'; key: string };

export type LobbyServerMessage =
  | { t: 'error'; message: string }
  | { t: 'me'; u: string }
  | { t: 'counts'; v: Record<string, LessonCount>; n?: number; f?: Person[] }
  | { t: 'people'; l: number | null; v: Person[] }
  | { t: 'online'; v: Person[] }
  | { t: 'history'; l: number; v: ChatMessage[] }
  | { t: 'msg'; m: ChatMessage }
  | { t: 'cheer'; from: Person; p: number }
  | { t: 'invite'; from: Person; room: RaceRoomSummary }
  | { t: 'rooms'; v: RaceRoomSummary[] }
  | { t: 'mentions'; v: MentionNotice[] }
  | { t: 'mention'; v: MentionNotice }
  | { t: 'mention-read'; key: string }
  | { t: 'mention-open'; key: string; v: MentionNotice | null };

const lessonKey = (value: unknown): number | null => (Number.isInteger(value) && Number(value) >= 0 && Number(value) < 1000 ? Number(value) : null);
const ROOM_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/** Bounded account IDs; callers must independently validate channel eligibility. */
export function mentionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64))].slice(0, 8);
}

/** Validates one client frame; throws on anything malformed. */
export function parseLobbyMessage(value: unknown): LobbyClientMessage {
  if (!value || typeof value !== 'object') throw new Error('Invalid message.');
  const data = value as Record<string, unknown>;
  if (data.t === 'here') {
    const a = (ACTIVITIES as readonly unknown[]).includes(data.a) ? data.a as Activity : null;
    const i = typeof data.i === 'string' && data.i.length <= MAX_SOCIAL_IMAGE_LENGTH ? data.i : undefined;
    return { t: 'here', l: lessonKey(data.l), a, show: data.show !== false, ...(i ? { i } : {}) };
  }
  if (data.t === 'sub') return { t: 'sub', online: data.online === true, chat: lessonKey(data.chat) };
  if (data.t === 'say' && lessonKey(data.l) !== null && typeof data.text === 'string') {
    const text = chatText(data.text);
    const mentions = mentionIds(data.mentions);
    if (text) return { t: 'say', l: Number(data.l), text, ...(mentions.length ? { mentions } : {}) };
  }
  if (data.t === 'cheer' && Array.isArray(data.to) && Number.isInteger(data.p) && Number(data.p) >= 0 && Number(data.p) < CHEER_PHRASES.length) {
    const to = data.to.filter((id): id is string => typeof id === 'string' && id.length <= 64).slice(0, 8);
    if (to.length) return { t: 'cheer', to, p: Number(data.p) };
  }
  if (data.t === 'invite' && Array.isArray(data.to) && typeof data.code === 'string' && ROOM_CODE.test(data.code)) {
    const to = data.to.filter((id): id is string => typeof id === 'string' && id.length <= 64).slice(0, 8);
    if (to.length) return { t: 'invite', to, code: data.code };
  }
  if (data.t === 'mention-open' && typeof data.key === 'string' && data.key.length <= 100) return { t: 'mention-open', key: data.key };
  if (data.t === 'mention-read' && typeof data.key === 'string' && data.key.length <= 100) return { t: 'mention-read', key: data.key };
  if (data.t === 'report' && Number.isInteger(data.id) && Number(data.id) > 0) return { t: 'report', id: Number(data.id) };
  throw new Error('Invalid message.');
}
