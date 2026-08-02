import type { Flashcard } from '../data/flashcards';
import type { PartSegment } from '../types/models';

export function buildPracticePartSegments(cards: Flashcard[]): PartSegment[] {
  const segments: PartSegment[] = [];

  cards.forEach((card, index) => {
    const partId = card.partId ?? 1;
    const previous = segments.at(-1);
    if (previous?.partId === partId) {
      previous.cardCount += 1;
      return;
    }

    segments.push({
      partId,
      label: `Part ${partId}`,
      cardCount: 1,
      startIndex: index,
    });
  });

  // Keep single-part sessions too: the study header needs its live position
  // even while other lesson parts are currently switched off.
  return segments;
}
