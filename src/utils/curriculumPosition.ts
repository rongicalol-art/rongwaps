import type { Flashcard } from '../data/flashcards';
import { parseVocabularyId } from './vocabularyId';

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

/**
 * Helper to determine the block anchor for a given target index.
 * A block is defined as a sequence of cards in the same Part, ending with a card that has examples.
 * If the target itself has examples, it is its own anchor.
 * If the target has no examples, it searches forward in the SAME PART for the first card with examples.
 */
function getAnchorCardId(FLASHCARDS_DATA: Flashcard[], targetIndex: number): string | null {
  const targetCard = FLASHCARDS_DATA[targetIndex];
  if (!targetCard) return null;
  
  if (targetCard.examples && targetCard.examples.length > 0) {
    return targetCard.id;
  }

  const parseId = (id: string) => {
    const match = id.match(/b(\d+)l(\d+)-(\d+)-/i);
    if (!match) return null;
    return { book: match[1], lesson: match[2], part: match[3] };
  };

  const targetParsed = parseId(targetCard.id);
  if (!targetParsed) return null;

  for (let i = targetIndex + 1; i < FLASHCARDS_DATA.length; i++) {
    const card = FLASHCARDS_DATA[i];
    const parsed = parseId(card.id);
    // Break if we leave the current part
    if (!parsed || parsed.book !== targetParsed.book || parsed.lesson !== targetParsed.lesson || parsed.part !== targetParsed.part) {
      break;
    }
    // Found the anchor
    if (card.examples && card.examples.length > 0) {
      return card.id;
    }
  }

  return null;
}

/**
 * The example request is usually a filtered source pool, so the target card
 * may not be present in it. In that case, use the first same-Part source card
 * at or after the target's item position as the current block anchor.
 */
export function getAnchorCardIdForTarget(
  cards: Flashcard[],
  targetCardId: string,
  targetContext: CurriculumPosition,
): string | null {
  const targetIndex = cards.findIndex((card) => card.id === targetCardId);
  if (targetIndex >= 0) return getAnchorCardId(cards, targetIndex);
  if (targetContext.itemId === undefined) return null;

  return cards
    .filter((card) => card.examples && card.examples.length > 0)
    .map((card) => ({ card, position: getCardPosition(card) }))
    .filter(({ position }) => (
      position
      && position.bookId === targetContext.bookId
      && position.lessonId === targetContext.lessonId
      && position.partId === targetContext.partId
      && position.itemId !== undefined
      && position.itemId >= targetContext.itemId!
    ))
    .sort((a, b) => a.position!.itemId! - b.position!.itemId!)
    .at(0)?.card.id ?? null;
}
