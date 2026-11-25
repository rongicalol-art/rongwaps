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
 *   2. The rest is split between fresh words (last scheduled 1-3 days ahead:
 *      just learned, or just forgotten and relearned) and older words, about
 *      half each and alternating, so a big old backlog can't push this week's
 *      words back until they fade, while the old pile still shrinks every day.
 *      When one group runs short the other fills its places.
 *   3. Within each group, most overdue first, with the weakest card (lowest
 *      ease factor) winning ties.
 */

export const REVIEW_SESSION_CAP = 20;

/** A review word last scheduled this many days ahead or fewer counts as fresh. */
export const FRESH_INTERVAL_DAYS = 3;

export function buildReviewSession(
  dueCards: Flashcard[],
  srsData: Record<string, SRSData>,
  cap: number = REVIEW_SESSION_CAP,
): Flashcard[] {
  if (cap <= 0) return [];
  if (dueCards.length <= 1) return [...dueCards];

  const learning: Flashcard[] = [];
  const fresh: Flashcard[] = [];
  const older: Flashcard[] = [];
  for (const card of dueCards) {
    const srs = srsData[card.id];
    if (srs && srs.learningStep !== undefined) learning.push(card);
    else if (srs && srs.interval <= FRESH_INTERVAL_DAYS) fresh.push(card);
    else older.push(card);
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
  fresh.sort(byDueThenWeakness);
  older.sort(byDueThenWeakness);

  // Alternate fresh and older words (fresh first), so the split holds even when
  // the five minutes end before the list does; the longer group fills the tail.
  const mixed: Flashcard[] = [];
  for (let index = 0; index < Math.max(fresh.length, older.length); index += 1) {
    if (index < fresh.length) mixed.push(fresh[index]);
    if (index < older.length) mixed.push(older[index]);
  }

  return [...learning, ...mixed].slice(0, cap);
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
  // Only the last day and a bit can be "today": skip the date maths for the rest of a long history.
  const recent = now - 28 * 3_600_000;
  const today = events.filter(e => e.reviewedAt >= recent && e.source === 'daily' && !e.practiceOnly && reviewDay(e.reviewedAt) === day);
  const answers: Record<string, number> = {};
  for (const event of today) if (!(event.cardId in answers)) answers[event.cardId] = event.quality;
  const activeMs = today.reduce((sum, event) => sum + event.durationMs, 0);
  const capacity = today.find(event => event.dailyTarget)?.dailyTarget ?? dailyReviewCapacity(events);
  return { answers, activeMs, capacity, completed: activeMs >= DAILY_REVIEW_MS || Object.keys(answers).length >= capacity };
}

/**
 * "Review more" after today's review is done: the pinned words differ from today's plan. Such a pass is extra practice
 * and doesn't count toward the daily goal; any other review deck does.
 */
export function isExtraDailyReview(plan: DailyReviewPlan | null, pinnedIds: readonly string[] | null): boolean {
  return Boolean(plan?.completed && pinnedIds?.length
    && (pinnedIds.length !== plan.cardIds.length || pinnedIds.some((id, index) => id !== plan.cardIds[index])));
}
