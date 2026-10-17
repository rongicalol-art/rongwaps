import type { Quality, SRSData } from './srsEngine';

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
export interface ReviewEvent extends ReviewContext {
  cardId: string;
  quality: Quality;
  reviewedAt: number;
  scheduled: boolean;
  before: SRSData | null;
  after: SRSData | null;
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
