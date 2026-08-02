import type { Flashcard } from '../data/flashcards';

export function retainCurrentCardIndex(
  nextCards: Flashcard[],
  currentCardId: string | null,
  currentIndex: number,
) {
  if (nextCards.length === 0) return 0;

  if (currentCardId) {
    const retainedIndex = nextCards.findIndex((card) => card.id === currentCardId);
    if (retainedIndex >= 0) return retainedIndex;
  }

  return Math.min(Math.max(0, currentIndex), nextCards.length - 1);
}
