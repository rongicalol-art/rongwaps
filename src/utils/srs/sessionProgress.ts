import type { Flashcard } from '../../data/flashcards';

/** `sessionCardOrder` key holding the missed-card ids of a flashcard review pass left unfinished. */
export const reviewSessionKey = (sessionKey: string) => `${sessionKey}#review`;

/**
 * The review list a session was left in: the saved missed ids, in order, taken from the deck the loader
 * offers now. Null when nothing was saved or a saved card is gone (the deck changed), so the session
 * opens the full deck instead of a half-matching review.
 */
export function restoreReviewCards<T extends { id: string }>(
  cards: readonly T[],
  savedIds: readonly string[] | undefined,
): T[] | null {
  if (!savedIds || savedIds.length === 0 || savedIds.length >= cards.length) return null;
  const byId = new Map(cards.map((card) => [card.id, card]));
  const ordered: T[] = [];
  for (const id of savedIds) {
    const card = byId.get(id);
    if (!card) return null;
    ordered.push(card);
  }
  return ordered;
}

export function getSessionStartIndex(
  sessionProgressIndex: Record<string, number>,
  sessionKey: string,
  cardCount: number,
) {
  const savedIndex = sessionProgressIndex[sessionKey];
  if (
    cardCount <= 0
    || typeof savedIndex !== 'number'
    || !Number.isSafeInteger(savedIndex)
    || savedIndex < 0
    || savedIndex >= cardCount
  ) {
    return 0;
  }

  return savedIndex;
}

/**
 * Rebuilds a saved shuffled order against the deck the loader offers now.
 * Null when the deck changed since it was saved (a card added or removed), so
 * the session falls back to the natural order instead of a half-matching one.
 */
export function restoreCardOrder<T extends { id: string }>(
  cards: readonly T[],
  savedIds: readonly string[] | undefined,
): T[] | null {
  if (!savedIds || savedIds.length === 0 || cards.length === 0) return null;
  const byId = new Map(cards.map((card) => [card.id, card]));
  const ordered: T[] = [];
  for (const id of savedIds) {
    const card = byId.get(id);
    if (!card) return null;
    ordered.push(card);
  }
  const saved = new Set(savedIds);
  return cards.every((card) => saved.has(card.id)) ? ordered : null;
}

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

export function isSameDeckOrder(current: readonly Flashcard[], next: readonly Flashcard[]): boolean {
  return current.length === next.length
    && next.every((card, index) => card.id === current[index]?.id);
}

export interface DeckAdoptionInput {
  /** Cards the loader currently offers for the active session key. */
  cards: Flashcard[];
  /** True when the session key changed in this effect run. */
  keyChanged: boolean;
  /** True once this session adopted a deck. */
  sessionInitialized: boolean;
  /** Last card shown before a key change (retain candidate across keys). */
  pendingCardId: string | null;
  /** Current card of an initialized session. */
  currentCardId: string | null;
  /** Canonical order the session last adopted. */
  canonicalOrder: readonly Flashcard[];
  /** Persisted resume index for the session key. */
  savedIndex: number;
  /** Current session index (fallback when the card cannot be retained). */
  currentIndex: number;
}

export type DeckAdoption =
  | { action: 'ignore' }
  | { action: 'wait' }
  | { action: 'adopt'; index: number; clearPendingCard: boolean };

/**
 * Decides how a session adopts the loader's cards. A key change must adopt the
 * incoming deck in the same run when it is already available (cached part
 * switches): the loader hands back the same array reference, so waiting for a
 * later effect run would leave the session empty forever.
 */
export function planDeckAdoption(input: DeckAdoptionInput): DeckAdoption {
  const isSameDeck = !input.keyChanged
    && input.sessionInitialized
    && isSameDeckOrder(input.canonicalOrder, input.cards);
  if (isSameDeck) return { action: 'ignore' };
  if (input.cards.length === 0) return { action: 'wait' };

  const cardIdToRetain = input.sessionInitialized ? input.currentCardId : input.pendingCardId;
  const retainCurrentCard = input.sessionInitialized
    || Boolean(cardIdToRetain && input.cards.some((card) => card.id === cardIdToRetain));

  return {
    action: 'adopt',
    index: retainCurrentCard
      ? retainCurrentCardIndex(input.cards, cardIdToRetain, input.currentIndex)
      : input.savedIndex,
    clearPendingCard: true,
  };
}
