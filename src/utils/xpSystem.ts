// XP and progress calculation utilities

// XP values per quality rating (matching the SRS quality scale 0-5)
export const XP_PER_QUALITY: Record<number, number> = {
  0: 0,   // Complete blackout
  1: 0,   // Wrong, but remembered upon seeing answer
  2: 0,   // Wrong, but easy to recall
  3: 5,   // Correct with difficulty
  4: 10,  // Correct
  5: 15,  // Perfect recall
};

// Bonus XP for learning a new card (first time quality >= 3)
export const NEW_CARD_BONUS_XP = 5;

// Streak bonus multiplier thresholds
export const STREAK_BONUSES = [
  { days: 7, multiplier: 1.1 },
  { days: 30, multiplier: 1.25 },
  { days: 100, multiplier: 1.5 },
  { days: 365, multiplier: 2.0 },
];

export function calculateXpForReview(quality: number, isNewCard: boolean, currentStreak: number): number {
  const baseXp = XP_PER_QUALITY[quality] || 0;

  // Streak bonus
  let multiplier = 1.0;
  for (const bonus of STREAK_BONUSES) {
    if (currentStreak >= bonus.days) {
      multiplier = bonus.multiplier;
    }
  }

  const streakBonus = Math.round(baseXp * (multiplier - 1));
  const newCardXp = isNewCard ? NEW_CARD_BONUS_XP : 0;

  return baseXp + streakBonus + newCardXp;
}

export function getXpForQuality(quality: number): number {
  return XP_PER_QUALITY[quality] || 0;
}

export function formatXp(xp: number): string {
  if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
  return String(xp);
}
