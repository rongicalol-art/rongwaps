export function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  if (shuffled.length > 1 && shuffled.every((item, index) => item === items[index])) {
    return [...shuffled.slice(1), shuffled[0]];
  }
  return shuffled;
}

export interface ReorderSessionOptions<T extends { id: string }> {
  currentCards: T[];
  canonicalCards: T[];
  currentIndex: number;
  nextShuffled: boolean;
  hasAnsweredCards: boolean;
}

/**
 * Reorders an active card session when shuffle is toggled.
 *
 * If the session is at index 0 and no cards have been answered yet,
 * the entire canonical deck is shuffled so the opening card is randomized.
 *
 * If mid-session (currentIndex > 0 or cards answered), completed cards and the
 * active card are preserved so current progress and focus are uninterrupted,
 * while upcoming cards are shuffled (or restored to canonical order).
 */
export function reorderSessionOnShuffle<T extends { id: string }>({
  currentCards,
  canonicalCards,
  currentIndex,
  nextShuffled,
  hasAnsweredCards,
}: ReorderSessionOptions<T>): T[] {
  if (currentCards.length <= 1) return [...currentCards];

  if (!nextShuffled) {
    return [...canonicalCards];
  }

  if (currentIndex === 0 && !hasAnsweredCards) {
    return shuffleItems(canonicalCards);
  }

  const completedAndCurrent = currentCards.slice(0, currentIndex + 1);
  const upcoming = currentCards.slice(currentIndex + 1);

  if (upcoming.length <= 1) {
    return [...currentCards];
  }

  const nextUpcoming = shuffleItems(upcoming);
  return [...completedAndCurrent, ...nextUpcoming];
}
