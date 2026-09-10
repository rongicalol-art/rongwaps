import type { Flashcard } from '../data/flashcards';
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

export interface ReviewSessionInput {
  dueCards: Flashcard[];
  srsData: Record<string, SRSData>;
  cap?: number;
}

export function buildReviewSession(
  dueCards: Flashcard[],
  srsData: Record<string, SRSData>,
  cap: number = REVIEW_SESSION_CAP,
): Flashcard[] {
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
