import type { Flashcard } from '../../data/flashcards';

/**
 * Deck exclusions are curation: "which vocab do I want in my deck for this
 * selection?" They are keyed by the deck identity the session uses
 * (`getDeckIdentityKey` in `lessonPartSelection.ts`), so switching part
 * segments in the header naturally creates (and remembers) separate lists.
 */

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
