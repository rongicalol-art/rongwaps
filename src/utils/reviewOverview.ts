import type { SRSData } from './srsEngine';

/**
 * Pure derivation helpers for the Profile overview (review hub + words
 * known). Kept framework-free so the same math can back any surface
 * (Profile tab today, Path summary tomorrow) and stay unit-testable.
 *
 * Stage semantics (mirrors the SRS engine in `srsEngine.ts`):
 *   - A word is "known" once the learner passed it (it is in `learnedCards`).
 *   - repetition counts successful reviews: 1–2 → Learning, 3+ → Solid.
 *   - `started` words have an SRS record (they were reviewed, possibly
 *     failed) but have not been passed yet — they are not counted as known.
 */

/** A word is due when its SRS record exists and its review date has passed. */
export function isSrsDue(card: SRSData, now: number): boolean {
  return card.nextReviewDate <= now;
}

/** How many successful reviews move a word from Learning to Solid. */
export const SOLID_REPETITION_THRESHOLD = 3;

export interface WordStageCounts {
  /** Known words with 1–2 successful reviews (including a known word that has no SRS record yet). */
  learning: number;
  /** Known words with 3+ successful reviews. */
  solid: number;
  /** Reviewed-but-not-yet-passed words (SRS record exists, not in learnedCards). */
  started: number;
}

export interface ReviewOverview {
  /** Words due for review right now (any word with an SRS record past its date). */
  dueCount: number;
  /** Total words the learner has passed at least once. */
  knownTotal: number;
  stages: WordStageCounts;
}

export function computeReviewOverview(
  srsData: Record<string, SRSData>,
  learnedCards: string[],
  now: number = Date.now(),
): ReviewOverview {
  const learned = new Set(learnedCards);
  let learning = 0;
  let solid = 0;
  let started = 0;
  let dueCount = 0;

  for (const [cardId, card] of Object.entries(srsData)) {
    if (isSrsDue(card, now)) dueCount += 1;
    if (learned.has(cardId)) {
      if (card.repetition >= SOLID_REPETITION_THRESHOLD) {
        solid += 1;
      } else {
        learning += 1;
      }
    } else {
      started += 1;
    }
  }

  // Known words without an SRS record (legacy data) are still strengthening.
  for (const cardId of learnedCards) {
    if (!(cardId in srsData)) learning += 1;
  }

  return {
    dueCount,
    knownTotal: learnedCards.length,
    stages: { learning, solid, started },
  };
}
