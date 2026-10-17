import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';

/** Old fields remain on the wire while existing installations migrate lazily. */
export interface SRSData {
  cardId: string;
  interval: number;
  repetition: number;
  efactor: number;
  nextReviewDate: number;
  learningStep?: number;
  lastReviewedAt?: number;
  fsrs?: {
    version: 1;
    stability: number;
    difficulty: number;
    state: State;
    reps: number;
    lapses: number;
    learningSteps: number;
    scheduledDays: number;
    elapsedDays: number;
  };
}

export const MAX_INTERVAL_DAYS = 36500;
export const LEARNING_STEPS_MINUTES = [1, 10];
export const REVIEW_DAY_ROLLOVER_HOUR = 4;
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

const scheduler = fsrs({ request_retention: 0.9, maximum_interval: MAX_INTERVAL_DAYS, enable_fuzz: true });

export function fuzzInterval(intervalDays: number): number {
  return Math.max(1, Math.round(intervalDays * (0.9 + Math.random() * 0.2)));
}

export function dayBoundaryDueTimestamp(intervalDays: number, nowMs: number = Date.now()): number {
  const boundary = new Date(nowMs);
  boundary.setHours(REVIEW_DAY_ROLLOVER_HOUR, 0, 0, 0);
  if (boundary.getTime() <= nowMs) boundary.setDate(boundary.getDate() + 1);
  boundary.setDate(boundary.getDate() + intervalDays - 1);
  return boundary.getTime();
}

export function qualityToRating(quality: Quality): Grade {
  return quality < 3 ? Rating.Again : quality === 3 ? Rating.Hard : quality === 4 ? Rating.Good : Rating.Easy;
}

/** Validate persisted/cloud memory state before handing it to the scheduler. */
export function validFsrsState(value: unknown): value is NonNullable<SRSData['fsrs']> {
  if (!value || typeof value !== 'object') return false;
  const s = value as NonNullable<SRSData['fsrs']>;
  return s.version === 1 && [0, 1, 2, 3].includes(s.state)
    && Number.isFinite(s.stability) && s.stability >= 0 && s.stability <= MAX_INTERVAL_DAYS * 10
    && Number.isFinite(s.difficulty) && s.difficulty >= 0 && s.difficulty <= 10
    && [s.reps, s.lapses, s.learningSteps, s.scheduledDays, s.elapsedDays].every(n => Number.isFinite(n) && n >= 0);
}

function toFsrsCard(current: SRSData | undefined, now: number): Card {
  if (!current) return createEmptyCard(new Date(now));
  if (validFsrsState(current.fsrs)) {
    const f = current.fsrs;
    return {
      due: new Date(current.nextReviewDate), stability: f.stability, difficulty: f.difficulty,
      state: f.state, reps: f.reps, lapses: f.lapses, learning_steps: f.learningSteps,
      scheduled_days: f.scheduledDays, elapsed_days: f.elapsedDays,
      last_review: new Date(current.lastReviewedAt ?? now),
    };
  }
  // Conservative legacy seed, not fabricated review history. Existing due dates
  // stay untouched until the learner actually reviews this word.
  const inLearning = current.learningStep !== undefined;
  const days = Math.max(1, Math.min(MAX_INTERVAL_DAYS, current.interval || 1));
  const last = current.lastReviewedAt ?? Math.min(now, current.nextReviewDate - days * 86_400_000);
  return {
    ...createEmptyCard(new Date(now)), due: new Date(current.nextReviewDate),
    state: inLearning ? State.Learning : State.Review,
    stability: inLearning ? 0.5 : days, difficulty: 5,
    reps: Math.max(1, current.repetition), learning_steps: inLearning ? Math.min(1, current.learningStep ?? 0) : 0,
    last_review: new Date(last), scheduled_days: inLearning ? 0 : days,
  };
}

export function calculateNextReview(current: SRSData | undefined, cardId: string, quality: Quality, now = Date.now()): SRSData {
  const { card } = scheduler.next(toFsrsCard(current, now), new Date(now), qualityToRating(quality));
  const learning = card.state === State.Learning || card.state === State.Relearning;
  const due = learning ? card.due.getTime() : dayBoundaryDueTimestamp(Math.max(1, card.scheduled_days), now);
  return {
    cardId, efactor: current?.efactor ?? 2.5,
    interval: learning ? Math.max(0, Math.round((due - now) / 60_000)) : card.scheduled_days,
    repetition: quality < 3 ? 0 : (current?.repetition ?? 0) + 1,
    ...(learning ? { learningStep: card.learning_steps } : {}),
    nextReviewDate: due, lastReviewedAt: now,
    fsrs: { version: 1, stability: card.stability, difficulty: card.difficulty, state: card.state,
      reps: card.reps, lapses: card.lapses, learningSteps: card.learning_steps,
      scheduledDays: card.scheduled_days, elapsedDays: card.elapsed_days },
  };
}
