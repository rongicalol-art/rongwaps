import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flashcard } from '../data/flashcards';
import { useAppStore } from '../store/useAppStore';
import { shuffleItems } from '../utils/sessionOrder';
import { queueMissedItem, computeCardSessionProgress, type CardSessionProgressInfo } from '../utils/mistakeQueue';
import { getSessionStartIndex, planDeckAdoption } from '../utils/sessionProgress';
import { SHARED_REVIEW_SESSION_KEY } from '../utils/lessonPartSelection';
import { audioService } from '../services/audioService';

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
  const repeatMistakes = useAppStore((state) => state.repeatMistakes);

  const [activeCards, setActiveCards] = useState<Flashcard[]>(cards);
  const [isShuffled, setIsShuffled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(() => (
    useAppStore.getState().sessionProgressIndex[sessionKey] || 0
  ));
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  const activeCardsRef = useRef<Flashcard[]>(cards);
  const canonicalOrderRef = useRef<Flashcard[]>(cards);
  const sessionKeyRef = useRef(sessionKey);
  const sessionInitializedRef = useRef(false);
  const pendingSessionCardIdRef = useRef<string | null>(null);
  const currentCardIdRef = useRef<string | null>(null);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const gradingCardKeyRef = useRef<string | null>(null);
  const firstAttemptMissedRef = useRef<Set<string>>(new Set());

  // Activity callbacks arrive as inline closures; keep latest refs so the
  // engine's effects and stable callbacks never hold stale ones.
  const onSessionResetRef = useRef(onSessionReset);
  const onAnswerStateResetRef = useRef(onAnswerStateReset);
  onSessionResetRef.current = onSessionReset;
  onAnswerStateResetRef.current = onAnswerStateReset;

  useEffect(() => {
    const keyChanged = sessionKeyRef.current !== sessionKey;
    if (keyChanged) {
      if (sessionInitializedRef.current && canonicalOrderRef.current.length > 0) {
        useAppStore.getState().setSessionProgressIndex(sessionKeyRef.current, currentIndexRef.current);
      }
      firstAttemptMissedRef.current.clear();
      pendingSessionCardIdRef.current = currentCardIdRef.current;
      sessionKeyRef.current = sessionKey;
      sessionInitializedRef.current = false;
      currentCardIdRef.current = null;
      canonicalOrderRef.current = [];
      activeCardsRef.current = [];
      setActiveCards([]);
      setIsShuffled(false);
      setCurrentIndex(0);
      setCompleted(false);
      setSessionResults({});
      gradingCardKeyRef.current = null;
      onSessionResetRef.current();
    }

    const plan = planDeckAdoption({
      cards,
      keyChanged,
      sessionInitialized: sessionInitializedRef.current,
      pendingCardId: pendingSessionCardIdRef.current,
      currentCardId: currentCardIdRef.current,
      canonicalOrder: canonicalOrderRef.current,
      savedIndex: getSessionStartIndex(
        useAppStore.getState().sessionProgressIndex,
        sessionKey,
        cards.length,
      ),
      currentIndex: currentIndexRef.current,
    });
    if (plan.action !== 'adopt') return;

    activeCardsRef.current = cards;
    setActiveCards(cards);
    setIsShuffled(false);
    canonicalOrderRef.current = cards;
    sessionInitializedRef.current = true;
    if (plan.clearPendingCard) pendingSessionCardIdRef.current = null;
    setCurrentIndex(plan.index);
  }, [cards, sessionKey]);

  useEffect(() => {
    if (activeCards.length > 0 && currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  // Save progress (debounced to avoid massive re-renders)
  useEffect(() => {
    if (!sessionInitializedRef.current || activeCards.length === 0) return;
    const timeoutId = setTimeout(() => {
      setSessionProgressIndex(sessionKey, currentIndex);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [activeCards.length, currentIndex, sessionKey, setSessionProgressIndex]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (sessionInitializedRef.current && canonicalOrderRef.current.length > 0) {
        useAppStore.getState().setSessionProgressIndex(sessionKeyRef.current, currentIndexRef.current);
      }
    };
  }, []);

  // Preload upcoming audio for next 3 cards during idle time
  useEffect(() => {
    if (!activeCards || activeCards.length === 0) return;
    const upcomingAudios = activeCards
      .slice(currentIndex + 1, currentIndex + 4)
      .map((c) => c.audio)
      .filter((a): a is string => Boolean(a));
    if (upcomingAudios.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      void audioService.preload(upcomingAudios);
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [activeCards, currentIndex]);

  const currentCard = activeCards[currentIndex];
  if (currentCard) currentCardIdRef.current = currentCard.id;

  const beginGrading = useCallback((): boolean => {
    const gradingCardKey = `${currentIndexRef.current}:${currentCardIdRef.current}`;
    if (gradingCardKeyRef.current === gradingCardKey) return false;
    gradingCardKeyRef.current = gradingCardKey;
    return true;
  }, []);

  const clearGrading = useCallback(() => {
    gradingCardKeyRef.current = null;
  }, []);

  /** Records the result, feeds the mistake queue, and updates session tallies. */
  const recordAnswer = useCallback((card: Flashcard, quality: CardSessionQuality) => {
    const wasMissed = firstAttemptMissedRef.current.has(card.id);

    if (quality <= 2) {
      if (!wasMissed) {
        firstAttemptMissedRef.current.add(card.id);
        markCardReviewed(card.id, quality);
        setSessionResults((previous) => ({ ...previous, [card.id]: quality }));
      }
      if (repeatMistakes !== 'off') {
        const nextItems = queueMissedItem(activeCardsRef.current, card, currentIndexRef.current, repeatMistakes);
        if (nextItems !== activeCardsRef.current) {
          activeCardsRef.current = nextItems;
          setActiveCards(nextItems);
        }
      }
    } else {
      // For cards answered correctly on initial attempt, record success.
      // If wasMissed is true, this is an immediate retry: allow the UI to advance,
      // but do not grant SRS success or clear the mistake from sessionResults / reviewUnlearned.
      if (!wasMissed) {
        markCardReviewed(card.id, quality);
        setSessionResults((previous) => ({ ...previous, [card.id]: quality }));
      }
    }
  }, [markCardReviewed, repeatMistakes]);

  const advanceOrComplete = useCallback((): 'advanced' | 'completed' => {
    const current = currentIndexRef.current;
    const cardsList = activeCardsRef.current;
    if (current < cardsList.length - 1) {
      const nextIndex = current + 1;
      currentIndexRef.current = nextIndex;
      currentCardIdRef.current = cardsList[nextIndex]?.id ?? null;
      setCurrentIndex(nextIndex);
      return 'advanced';
    }
    clearSessionProgressIndex(sessionKey);
    // The pinned due-set snapshot is a per-session pin: once the review
    // session completes, drop it so the next review entry recomputes from
    // the live SRS due set instead of replaying already-reviewed cards.
    if (sessionKey === SHARED_REVIEW_SESSION_KEY) {
      useAppStore.getState().setActiveReviewSessionCards(null);
    }
    setCompleted(true);
    return 'completed';
  }, [clearSessionProgressIndex, sessionKey]);

  /** Moves to an exact card, bounded (swipe/keyboard navigation). */
  const moveTo = useCallback((index: number) => {
    const cardsList = activeCardsRef.current;
    if (cardsList.length === 0) return;
    const target = Math.max(0, Math.min(index, cardsList.length - 1));
    currentIndexRef.current = target;
    currentCardIdRef.current = cardsList[target]?.id ?? null;
    setCurrentIndex(target);
  }, []);

  const toggleShuffle = useCallback(() => {
    firstAttemptMissedRef.current.clear();
    const nextShuffled = !isShuffled;
    const nextCards = nextShuffled ? shuffleItems(canonicalOrderRef.current) : [...canonicalOrderRef.current];
    activeCardsRef.current = nextCards;
    setActiveCards(nextCards);
    setCurrentIndex(0);
    setCompleted(false);
    gradingCardKeyRef.current = null;
    setIsShuffled(nextShuffled);
    onAnswerStateResetRef.current();
  }, [isShuffled]);

  const resetAll = useCallback(() => {
    firstAttemptMissedRef.current.clear();
    activeCardsRef.current = cards;
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
    firstAttemptMissedRef.current.clear();
    const unlearnedIds = Object.entries(sessionResults)
      .filter(([, quality]) => quality === 1 || quality === 2)
      .map(([id]) => id);

    const unlearnedCards = cards.filter((card) => unlearnedIds.includes(card.id));
    if (unlearnedCards.length === 0) {
      resetAll();
      return;
    }
    activeCardsRef.current = unlearnedCards;
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

  const progressInfo = computeCardSessionProgress(
    currentIndex,
    currentCard?.id,
    canonicalOrderRef.current,
    activeCards,
    repeatMistakes,
    firstAttemptMissedRef.current,
  );

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
    progressInfo,
    initialTotalCount: canonicalOrderRef.current.length || cards.length,
  };
}

export type { CardSessionProgressInfo };
