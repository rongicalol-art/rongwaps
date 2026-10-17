import type { Flashcard } from '../../data/flashcards';
import type { SRSData } from './srsEngine';

/**
 * Review session assembly.
 *
 * The due set can grow into the hundreds for a returning learner, so a
 * review session is capped: the learner works a bounded, prioritized slice,
 * finishes it, and the next session picks up the rest (the pinned due-set
 * snapshot is cleared on completion, so each entry re-selects from the live
 * due pool).
 *
 * Smart priority within the cap:
 *   1. Learning-phase cards (intraday steps in minutes) first — deferring
 *      them lets the intraday schedule lapse, so clear that backlog before
 *      anything else.
 *   2. Review-phase cards by due date ascending (most overdue first), with
 *      the weakest cards (lowest ease factor) winning ties — a lapsed,
 *      struggling card is worth more than an easy one that is a few days
 *      newer.
 */

export const REVIEW_SESSION_CAP = 20;

export function buildReviewSession(
  dueCards: Flashcard[],
  srsData: Record<string, SRSData>,
  cap: number = REVIEW_SESSION_CAP,
): Flashcard[] {
  if (cap <= 0) return [];
  if (dueCards.length <= 1) return [...dueCards];

  const learning: Flashcard[] = [];
  const review: Flashcard[] = [];
  for (const card of dueCards) {
    const srs = srsData[card.id];
    if (srs && srs.learningStep !== undefined) learning.push(card);
    else review.push(card);
  }

  const byDueThenWeakness = (a: Flashcard, b: Flashcard): number => {
    const aSrs = srsData[a.id];
    const bSrs = srsData[b.id];
    const aDue = aSrs?.nextReviewDate ?? Number.MAX_SAFE_INTEGER;
    const bDue = bSrs?.nextReviewDate ?? Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return (aSrs?.efactor ?? 2.5) - (bSrs?.efactor ?? 2.5);
  };

  learning.sort(byDueThenWeakness);
  review.sort(byDueThenWeakness);

  return [...learning, ...review].slice(0, cap);
}

export const DAILY_REVIEW_MS = 5 * 60_000;

export interface DailyReviewPlan {
  day: string;
  cardIds: string[];
  /** First attempts survive closing the window and page reloads. */
  answers: Record<string, number>;
  activeMs: number;
  completed: boolean;
}

export function reviewDay(now = Date.now()): string {
  const date = new Date(now);
  date.setHours(date.getHours() - 4);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dailyReviewCapacity(events: readonly import('./reviewEvents').ReviewEvent[]): number {
  const durations = events.filter(e => e.source === 'daily' && e.durationMs >= 2_000 && e.durationMs <= 120_000)
    .slice(-50).map(e => e.durationMs).sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : 20_000;
  // Leave a little space for feedback and a natural finish, rather than promising
  // that a fixed word count always takes exactly five minutes.
  return Math.max(1, Math.min(REVIEW_SESSION_CAP, Math.floor(DAILY_REVIEW_MS * 0.9 / Math.max(10_000, median))));
}

export function createDailyReviewPlan(
  cards: Flashcard[], srs: Record<string, SRSData>, events: readonly import('./reviewEvents').ReviewEvent[],
  previous: DailyReviewPlan | null, now = Date.now(),
): DailyReviewPlan {
  const day = reviewDay(now);
  if (previous?.day === day) return previous;
  const { answers, activeMs, capacity, completed } = dailyReviewGoal(events, now);
  const remaining = cards.filter(card => !(card.id in answers));
  const cardIds = buildReviewSession(remaining, srs, Math.max(0, capacity - Object.keys(answers).length)).map(card => card.id);
  return { day, cardIds, answers, activeMs, completed };
}

/** Shared daily completion rule for the planner and Library, including synced attempts. */
export function dailyReviewGoal(events: readonly import('./reviewEvents').ReviewEvent[], now = Date.now()) {
  const day = reviewDay(now);
  const today = events.filter(e => e.source === 'daily' && !e.practiceOnly && reviewDay(e.reviewedAt) === day);
  const answers: Record<string, number> = {};
  for (const event of today) if (!(event.cardId in answers)) answers[event.cardId] = event.quality;
  const activeMs = today.reduce((sum, event) => sum + event.durationMs, 0);
  const capacity = today.find(event => event.dailyTarget)?.dailyTarget ?? dailyReviewCapacity(events);
  return { answers, activeMs, capacity, completed: activeMs >= DAILY_REVIEW_MS || Object.keys(answers).length >= capacity };
}
