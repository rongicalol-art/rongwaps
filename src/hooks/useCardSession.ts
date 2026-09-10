import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flashcard } from '../data/flashcards';
import { useAppStore } from '../store/useAppStore';
import { usePracticePreferencesStore } from '../store/usePracticePreferencesStore';
import { shuffleItems } from '../utils/sessionOrder';
import { queueMissedItem } from '../utils/mistakeQueue';
import { getSessionStartIndex, retainCurrentCardIndex } from '../utils/sessionProgress';

/**
 * Generic card-session engine shared by the practice activities.
 *
 * Owns the session mechanics that every activity re-implemented: deck
 * lifecycle across session-key switches, resume-from-progress and
 * retain-current-card behavior, progress-index persistence, shuffle support,
 * per-card grading dedupe, answer recording with missed-card requeue,
 * completion, and the reset/review-unlearned flows.
 *
 * Activities own their answer UX (choices, typing, listening) through two
 * callbacks:
 *  - `onSessionReset` clears activity-local per-card state when a different
 *    session key mounts (selected option, typed input, status).
 *  - `onAnswerStateReset` clears the same state on shuffle/reset/review
 *    flows.
 */

export interface UseCardSessionOptions {
  onSessionReset: () => void;
  onAnswerStateReset: () => void;
}

export type CardSessionQuality = 1 | 2 | 3 | 4 | 5;

export function useCardSession(
  cards: Flashcard[],
  sessionKey: string,
  options: UseCardSessionOptions,
) {
  const { onSessionReset, onAnswerStateReset } = options;
  const markCardReviewed = useAppStore((state) => state.markCardReviewed);
  const setSessionProgressIndex = useAppStore((state) => state.setSessionProgressIndex);
  const clearSessionProgressIndex = useAppStore((state) => state.clearSessionProgressIndex);
  const repeatMistakes = usePracticePreferencesStore((state) => state.repeatMistakes);

  const [activeCards, setActiveCards] = useState<Flashcard[]>(cards);
  const [isShuffled, setIsShuffled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(() => (
    useAppStore.getState().sessionProgressIndex[sessionKey] || 0
  ));
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  const canonicalOrderRef = useRef<Flashcard[]>(cards);
  const sessionKeyRef = useRef(sessionKey);
  const sessionInitializedRef = useRef(false);
  const pendingSessionCardIdRef = useRef<string | null>(null);
  const currentCardIdRef = useRef<string | null>(null);
  const gradingCardKeyRef = useRef<string | null>(null);

  // Activity callbacks arrive as inline closures; keep latest refs so the
  // engine's effects and stable callbacks never hold stale ones.
  const onSessionResetRef = useRef(onSessionReset);
  const onAnswerStateResetRef = useRef(onAnswerStateReset);
  onSessionResetRef.current = onSessionReset;
  onAnswerStateResetRef.current = onAnswerStateReset;

  useEffect(() => {
    if (sessionKeyRef.current !== sessionKey) {
      pendingSessionCardIdRef.current = currentCardIdRef.current;
      sessionKeyRef.current = sessionKey;
      sessionInitializedRef.current = false;
      currentCardIdRef.current = null;
      canonicalOrderRef.current = [];
      setActiveCards([]);
      setIsShuffled(false);
      setCurrentIndex(0);
      setCompleted(false);
      setSessionResults({});
      gradingCardKeyRef.current = null;
      onSessionResetRef.current();
      return;
    }

    const isSameDeck = sessionInitializedRef.current
      && cards.length === canonicalOrderRef.current.length
      && cards.every((c, idx) => c.id === canonicalOrderRef.current[idx]?.id);

    if (isSameDeck) {
      return;
    }

    setActiveCards(cards);
    if (cards.length > 0) {
      const cardIdToRetain = sessionInitializedRef.current
        ? currentCardIdRef.current
        : pendingSessionCardIdRef.current;
      const retainCurrentCard = sessionInitializedRef.current || Boolean(
        cardIdToRetain && cards.some((card) => card.id === cardIdToRetain),
      );
      const savedIndex = retainCurrentCard ? 0 : getSessionStartIndex(
        useAppStore.getState().sessionProgressIndex,
        sessionKey,
        cards.length,
      );
      setCurrentIndex((previousIndex) => retainCurrentCard
        ? retainCurrentCardIndex(cards, cardIdToRetain, previousIndex)
        : savedIndex);
      sessionInitializedRef.current = true;
      pendingSessionCardIdRef.current = null;
    }
    setIsShuffled(false);
    canonicalOrderRef.current = cards;
  }, [cards, sessionKey]);

  useEffect(() => {
    if (activeCards.length > 0 && currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  // Save progress
  useEffect(() => {
    if (!sessionInitializedRef.current || activeCards.length === 0) return;
    setSessionProgressIndex(sessionKey, currentIndex);
  }, [activeCards.length, currentIndex, sessionKey, setSessionProgressIndex]);

  const currentCard = activeCards[currentIndex];
  if (currentCard) currentCardIdRef.current = currentCard.id;

  /**
   * Claims the per-card grading slot so a double-check (double click, or
   * select + check) never records the same answer twice.
   */
  const beginGrading = useCallback((): boolean => {
    const gradingCardKey = `${currentIndex}:${currentCard?.id}`;
    if (gradingCardKeyRef.current === gradingCardKey) return false;
    gradingCardKeyRef.current = gradingCardKey;
    return true;
  }, [currentCard, currentIndex]);

  const clearGrading = useCallback(() => {
    gradingCardKeyRef.current = null;
  }, []);

  /** Records the result, feeds the mistake queue, and updates session tallies. */
  const recordAnswer = useCallback((card: Flashcard, quality: CardSessionQuality) => {
    markCardReviewed(card.id, quality);
    setSessionResults((previous) => ({ ...previous, [card.id]: quality }));
    if (quality <= 2) {
      setActiveCards((items) => queueMissedItem(items, card, currentIndex, repeatMistakes));
    }
  }, [currentIndex, markCardReviewed, repeatMistakes]);

  const advanceOrComplete = useCallback((): 'advanced' | 'completed' => {
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex((c) => c + 1);
      return 'advanced';
    }
    clearSessionProgressIndex(sessionKey);
    setCompleted(true);
    return 'completed';
  }, [activeCards.length, clearSessionProgressIndex, currentIndex, sessionKey]);

  /** Moves to an exact card, bounded (swipe/keyboard navigation). */
  const moveTo = useCallback((index: number) => {
    if (activeCards.length === 0) return;
    setCurrentIndex(Math.max(0, Math.min(index, activeCards.length - 1)));
  }, [activeCards.length]);

  const toggleShuffle = useCallback(() => {
    const nextShuffled = !isShuffled;
    setActiveCards(nextShuffled ? shuffleItems(canonicalOrderRef.current) : [...canonicalOrderRef.current]);
    setCurrentIndex(0);
    setCompleted(false);
    gradingCardKeyRef.current = null;
    setIsShuffled(nextShuffled);
    onAnswerStateResetRef.current();
  }, [isShuffled]);

  const resetAll = useCallback(() => {
    setActiveCards(cards);
    canonicalOrderRef.current = cards;
    setIsShuffled(false);
    setCurrentIndex(0);
    setCompleted(false);
    setSessionResults({});
    gradingCardKeyRef.current = null;
    onAnswerStateResetRef.current();
  }, [cards]);

  const reviewUnlearned = useCallback(() => {
    const unlearnedIds = Object.entries(sessionResults)
      .filter(([, quality]) => quality === 1 || quality === 2)
      .map(([id]) => id);

    const unlearnedCards = cards.filter((card) => unlearnedIds.includes(card.id));
    if (unlearnedCards.length === 0) {
      resetAll();
      return;
    }
    setActiveCards(unlearnedCards);
    canonicalOrderRef.current = unlearnedCards;
    setIsShuffled(false);
    setCurrentIndex(0);
    setCompleted(false);
    setSessionResults({});
    gradingCardKeyRef.current = null;
    onAnswerStateResetRef.current();
  }, [cards, resetAll, sessionResults]);

  const unlearnedCount = Object.values(sessionResults).filter((quality) => quality === 1 || quality === 2).length;
  const learnedCount = Object.values(sessionResults).filter((quality) => quality > 2).length;

  return {
    activeCards,
    isShuffled,
    currentIndex,
    currentCard,
    sessionResults,
    completed,
    beginGrading,
    clearGrading,
    recordAnswer,
    advanceOrComplete,
    moveTo,
    toggleShuffle,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
  };
}
