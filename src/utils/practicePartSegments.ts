import type { Flashcard } from '../data/flashcards';
import type { PartSegment } from '../types/models';

export function buildPracticePartSegments(cards: Flashcard[]): PartSegment[] {
  if (cards.length === 0) return [];

  // If cards span multiple lessons or books (e.g. reviews, library decks, multi-lesson selections),
  // they do not form a single lesson's sequential parts. Return empty so the progress bar
  // remains a single, continuous progress bar.
  const firstBook = cards[0].bookId;
  const firstLesson = cards[0].lessonId;
  const isSingleLesson = cards.every(
    (c) => c.bookId === firstBook && c.lessonId === firstLesson,
  );
  if (!isSingleLesson) {
    return [];
  }

  // Also, if partIds are interleaved/non-contiguous (e.g. Part 1, Part 2, Part 1 again),
  // it means the deck is shuffled or not clean sequential parts.
  const seenPartIds = new Set<number>();
  let currentPartId = cards[0].partId ?? 1;
  seenPartIds.add(currentPartId);

  for (const card of cards) {
    const pId = card.partId ?? 1;
    if (pId !== currentPartId) {
      if (seenPartIds.has(pId)) {
        return [];
      }
      seenPartIds.add(pId);
      currentPartId = pId;
    }
  }

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

  return segments;
}
