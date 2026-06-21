/**
 * Spaced Repetition System (SRS) Engine
 *
 * Based on the SM-2 algorithm (SuperMemo 2) with custom modifications:
 *
 *  • Binary quality scale optimized for "Again" vs "Got it" + quiz modes:
 *      - Fail (quality 0-2): resets interval to 1 day, decays ease factor gently
 *      - Pass (quality 3-5): advances interval using ease factor
 *
 *  • Modified interval progression (gentler than standard SM-2):
 *      - 1st review: 1 day → 2nd review: 3 days (vs SM-2's 6 days)
 *      - Subsequent: interval × ease factor
 *
 *  • Ease factor adjustments:
 *      - Failure: -0.15 (vs SM-2's harsher -0.54 which causes "ease hell")
 *      - Perfect recall (5): +0.15, Standard pass (4): +0.05, Difficult (3): no change
 *      - Clamped to [1.3, 3.0] to keep intervals productive
 *
 * Quality scale:
 *   0 = Complete blackout        3 = Correct with difficulty
 *   1 = Wrong, remembered answer  4 = Correct (standard "Got it")
 *   2 = Wrong, easy to recall     5 = Perfect recall (e.g. writing input)
 */
export interface SRSData {
  cardId: string;
  interval: number;
  repetition: number;
  efactor: number;
  nextReviewDate: number;
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

// Quality mapping optimized for binary "Again" & "Got it" + quizzes:
// Pass (Got it / Correct): quality >= 3 (normally 3, 4, 5)
// Fail (Again / Incorrect): quality < 3 (normally 0, 1, 2)

export function calculateNextReview(current: SRSData | undefined, cardId: string, quality: Quality): SRSData {
  let { interval, repetition, efactor } = current || { interval: 0, repetition: 0, efactor: 2.5 };
  
  // FAIL (Again/Incorrect): quality < 3 (0, 1, 2)
  if (quality < 3) {
    // Reset repetition count and return to 1-day study cycles
    repetition = 0;
    interval = 1;
    
    // Moderate E-factor decay to avoid the notorious SM-2 "ease hell".
    // Standard SM-2 drops efactor by 0.54 instantly, stalling cards.
    // We decay by 0.15 per failure, keeping it safe and encouraging.
    efactor = Math.max(1.3, efactor - 0.15);
  } 
  // PASS (Got it/Correct): quality >= 3 (3, 4, 5)
  else {
    if (repetition === 0) {
      interval = 1; // 1 day
    } else if (repetition === 1) {
      interval = 3; // 3 days (much smoother, natural step than standard SM-2's 6 days)
    } else {
      interval = Math.round(interval * efactor);
    }
    repetition += 1;
    
    // Adjust ease factor based on performance
    if (quality === 5) {
      // Perfect recall (e.g. correct writing screen input) - boost ease
      efactor = Math.min(3.0, efactor + 0.15);
    } else if (quality === 4) {
      // Standard binary "Got it" - gradual ease increase to support consistent learning
      efactor = Math.min(3.0, efactor + 0.05);
    } else {
      // quality === 3: correct but difficult memory recall - keep efactor stable
      // no change to efactor
    }
  }

  // Safety boundaries for the E-factor to keep intervals productive and healthy
  if (efactor < 1.3) efactor = 1.3;
  if (efactor > 3.0) efactor = 3.0;

  // Calculate the next review date in milliseconds
  const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    cardId,
    interval,
    repetition,
    efactor,
    nextReviewDate
  };
}
