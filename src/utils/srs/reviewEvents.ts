import type { Quality } from './srsEngine';
import { localDay } from './profileStats';

export type ReviewSource = 'flashcards' | 'quiz' | 'listening' | 'writing' | 'tones' | 'daily' | 'practice';
export interface ReviewContext {
  id: string;
  sessionId: string;
  source: ReviewSource;
  durationMs: number;
  practiceOnly?: boolean;
  /** Original daily goal, so another device can recognize a finished short session. */
  dailyTarget?: number;
}
/** One answer. The card's scheduling state itself lives in srsData / user_card_progress, not in its history. */
export interface ReviewEvent extends ReviewContext {
  cardId: string;
  quality: Quality;
  reviewedAt: number;
  scheduled: boolean;
}

/** Immutable identities make retried uploads and overlapping pulls idempotent. */
export function mergeReviewEvents(local: ReviewEvent[], incoming: ReviewEvent[], after = 0): ReviewEvent[] {
  return Array.from(new Map([...local, ...incoming].filter(e => validReviewEvent(e) && e.reviewedAt > after).map(e => [e.id, e])).values())
    .sort((a, b) => a.reviewedAt - b.reviewedAt || a.id.localeCompare(b.id));
}

export function validReviewEvent(value: unknown): value is ReviewEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as ReviewEvent;
  return typeof e.id === 'string' && /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(e.id)
    && typeof e.sessionId === 'string' && e.sessionId.length <= 200
    && typeof e.cardId === 'string' && e.cardId.length > 0 && e.cardId.length <= 500
    && ['flashcards', 'quiz', 'listening', 'writing', 'tones', 'daily', 'practice'].includes(e.source)
    && [0, 1, 2, 3, 4, 5].includes(e.quality) && typeof e.scheduled === 'boolean'
    && Number.isFinite(e.reviewedAt) && e.reviewedAt > 0
    && Number.isFinite(e.durationMs) && e.durationMs >= 0 && e.durationMs <= 300_000
    && (e.dailyTarget === undefined || Number.isInteger(e.dailyTarget) && e.dailyTarget >= 1 && e.dailyTarget <= 20);
}

/** How long single answers stay on this device. Older ones are folded into `ReviewArchive` (the server keeps them all). */
export const REVIEW_KEEP_MS = 120 * 86_400_000;

/**
 * What the app still needs from answers older than `REVIEW_KEEP_MS`: how many there were, when the first one was,
 * and one time for each day studied (for the streak). A year of study is a few kB here; as single answers it was
 * megabytes inside the one object that is saved whole on every change.
 */
export interface ReviewArchive { count: number; firstAt: number | null; days: number[] }
export const EMPTY_REVIEW_ARCHIVE: ReviewArchive = { count: 0, firstAt: null, days: [] };

export function validReviewArchive(value: unknown): value is ReviewArchive {
  if (!value || typeof value !== 'object') return false;
  const a = value as ReviewArchive;
  return Number.isInteger(a.count) && a.count >= 0 && (a.firstAt === null || Number.isFinite(a.firstAt))
    && Array.isArray(a.days) && a.days.every(Number.isFinite);
}

/** Moves answers older than the keep window out of `events` (in time order) into the archive. Same objects back when nothing is old. */
export function archiveOldReviews(events: ReviewEvent[], archive: ReviewArchive, now = Date.now()): { events: ReviewEvent[]; archive: ReviewArchive } {
  const cutoff = now - REVIEW_KEEP_MS;
  if (!events.length || events[0].reviewedAt >= cutoff) return { events, archive };
  const keepFrom = events.findIndex(e => e.reviewedAt >= cutoff);
  const old = keepFrom === -1 ? events : events.slice(0, keepFrom);
  const known = new Set(archive.days.map(time => localDay(new Date(time))));
  const days = [...archive.days];
  for (const event of old) {
    const day = localDay(new Date(event.reviewedAt));
    if (!known.has(day)) { known.add(day); days.push(event.reviewedAt); }
  }
  return {
    events: keepFrom === -1 ? [] : events.slice(keepFrom),
    archive: { count: archive.count + old.length, firstAt: Math.min(archive.firstAt ?? Infinity, old[0].reviewedAt), days: days.sort((a, b) => a - b) },
  };
}

/** Every time the learner studied, for day-based stats (streak, first review): archived days, then the kept answers. */
export function studyTimes(events: readonly Pick<ReviewEvent, 'reviewedAt'>[], archive: ReviewArchive): Pick<ReviewEvent, 'reviewedAt'>[] {
  return archive.days.length ? [...archive.days.map(reviewedAt => ({ reviewedAt })), ...events] : events as Pick<ReviewEvent, 'reviewedAt'>[];
}
