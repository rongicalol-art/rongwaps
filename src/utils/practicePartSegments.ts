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

  // Count cards per partId in order of partId
  const countByPart = new Map<number, number>();
  for (const card of cards) {
    const pId = card.partId ?? 1;
    countByPart.set(pId, (countByPart.get(pId) ?? 0) + 1);
  }

  // Keep single-part sessions too: the study header needs its live position
  // even while other lesson parts are currently switched off.
  const sortedPartIds = Array.from(countByPart.keys()).sort((a, b) => a - b);
  const segments: PartSegment[] = [];
  let runningStartIndex = 0;

  for (const partId of sortedPartIds) {
    const cardCount = countByPart.get(partId) ?? 0;
    segments.push({
      partId,
      label: `Part ${partId}`,
      cardCount,
      startIndex: runningStartIndex,
    });
    runningStartIndex += cardCount;
  }

  return segments;
}
