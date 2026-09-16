import type { Flashcard } from '../data/flashcards';
import type { CourseLessonPartProgress } from '../types/models';

/**
 * Single owner of the "lesson cards -> part rows" rule.
 *
 * Both the cached fast path and the freshly fetched path in the activities
 * screen aggregate the same way, and the rows feed `PracticeHeader`'s
 * part-progress rail plus the study-part toggles, so `wordCount`/`learnedCount`
 * must stay consistent between them. Rows are returned sorted by part id;
 * `isSelected` is a placeholder the caller re-derives from the selection map
 * (`normalizePartSelection` owns that decision).
 */
export function aggregateLessonPartProgress(
  cards: readonly Flashcard[],
  learnedCardIds: readonly string[],
): CourseLessonPartProgress[] {
  const learned = new Set(learnedCardIds);

  return Array.from(
    cards.reduce((map, card) => {
      const partId = card.partId ?? 1;
      const current = map.get(partId) ?? { id: partId, wordCount: 0, learnedCount: 0, isSelected: false };
      current.wordCount += 1;
      if (learned.has(card.id)) current.learnedCount += 1;
      map.set(partId, current);
      return map;
    }, new Map<number, CourseLessonPartProgress>()).values(),
  ).sort((a, b) => a.id - b.id);
}
