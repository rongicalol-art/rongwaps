import type { Flashcard } from '../../data/flashcards';
import { parseVocabularyId } from '../vocabulary/vocabularyId';

export interface CurriculumPosition {
  bookId: number;
  lessonId: number;
  partId: number;
  itemId?: number;
}

export function getCardPosition(card: Pick<Flashcard, 'id' | 'bookId' | 'lessonId' | 'partId'>): CurriculumPosition | null {
  const parsed = parseVocabularyId(card.id);
  const bookId = card.bookId || parsed?.bookId || 0;
  const lessonId = card.lessonId || parsed?.lessonId || 0;
  const partId = card.partId || parsed?.partId || 0;

  if (![bookId, lessonId, partId].every((value) => Number.isSafeInteger(value) && value > 0)) {
    return null;
  }

  return { bookId, lessonId, partId, itemId: parsed?.itemId };
}

export function getIdPosition(id: string): CurriculumPosition | null {
  const parsed = parseVocabularyId(id);
  if (!parsed || parsed.bookId <= 0 || parsed.lessonId <= 0 || parsed.partId <= 0) return null;
  return parsed;
}

/**
 * Whether a source card sits at or before the target's curriculum position.
 * This no longer gates inclusion — later sources still appear — it decides
 * whether the source ranks as "previous" (rank 4) or "other" (rank 5).
 * Examples from later books, lessons, or Parts are never dropped.
 */
export function isExampleSourceAvailable(targetCardId: string, sourceCard: Flashcard): boolean {
  const target = getIdPosition(targetCardId);
  const source = getCardPosition(sourceCard);
  if (!target || !source) return false;

  if (source.bookId !== target.bookId) return source.bookId < target.bookId;
  if (source.lessonId !== target.lessonId) return source.lessonId < target.lessonId;
  return source.partId <= target.partId;
}


