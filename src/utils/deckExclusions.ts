import type { Flashcard } from '../data/flashcards';
import type { LessonPartSelectionMap } from '../types/models';
import { getCurriculumSessionKey } from './lessonPartSelection';

/**
 * Deck exclusion key derivation.
 *
 * Exclusions are curation: "which vocab do I want in my deck for this
 * selection?" They are keyed by the same deck identity the session uses so
 * that switching part segments in the header naturally creates (and
 * remembers) separate lists.
 *
 * Review is the one exception: the review deck is *all* due cards across
 * every book (the loader fetches all vocabulary and SRS-filters it), so its
 * exclusion list must be global rather than book-scoped — otherwise the
 * same card would come back as soon as the user changes the active book.
 */
export function getDeckExclusionKey(options: {
  activeBookId: number;
  selectedLessons: number[];
  selectedLessonParts: LessonPartSelectionMap;
  libraryActiveFolder: string;
  isReviewDeck: boolean;
  isLibraryDeck: boolean;
}): string {
  if (options.isReviewDeck) return 'shared_deck_review';
  if (options.isLibraryDeck) return `shared_deck_library_${options.libraryActiveFolder}`;
  return getCurriculumSessionKey(
    options.activeBookId,
    options.selectedLessons,
    options.selectedLessonParts,
  );
}

/** Returns cards minus the excluded ids. Keeps the original order. */
export function filterDeckByExclusions(
  cards: Flashcard[],
  excludedIds: ReadonlySet<string>,
): Flashcard[] {
  if (excludedIds.size === 0) return cards;
  return cards.filter((card) => !excludedIds.has(card.id));
}

/**
 * Drops exclusion ids that no longer exist in the deck source. Used when a
 * card is deleted (library folders), removed from the vocabulary, or — for
 * the starred deck — unfavorited and later re-favorited under the same id.
 *
 * BEWARE: for the review deck, `knownIds` must be ALL vocabulary ids (the
 * pre-due-set fetch), never the due-set — a card that is merely not-due
 * today must keep its exclusion for when it becomes due again.
 */
export function pruneExcludedIds(
  excludedIds: string[],
  knownIds: ReadonlySet<string>,
): string[] {
  if (excludedIds.length === 0) return excludedIds;
  return excludedIds.filter((id) => knownIds.has(id));
}

export function isCardIdExcluded(excludedIds: ReadonlySet<string>, cardId: string): boolean {
  return excludedIds.has(cardId);
}
