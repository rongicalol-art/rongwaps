import { useStudyClock } from './useStudyClock';
import { DAILY_REVIEW_MS } from '../utils/srs/reviewSession';
import type { ReviewSource } from '../utils/srs/reviewEvents';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flashcard } from '../data/flashcards';
import { useAppStore } from '../store/useAppStore';
import { shuffleItems } from '../utils/srs/sessionOrder';
import { queueMissedItem, computeCardSessionProgress, type CardSessionProgressInfo } from '../utils/srs/mistakeQueue';
import { getSessionStartIndex, planDeckAdoption, restoreCardOrder, restoreReviewCards, retainCurrentCardIndex, reviewSessionKey } from '../utils/srs/sessionProgress';
import { SHARED_REVIEW_SESSION_KEY } from '../utils/lesson/lessonPartSelection';
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
  /** Re-queue a missed card inside the pass per the "repeat mistakes" setting (default). The quiz turns it off: its misses come back as a review round. */
  requeueMissed?: boolean;
  source?: ReviewSource;
  paused?: boolean;
  daily?: boolean;
}

export type CardSessionQuality = 1 | 2 | 3 | 4 | 5;

export function useCardSession(
  cards: Flashcard[],
  sessionKey: string,
  options: UseCardSessionOptions,
) {
  const { onSessionReset, onAnswerStateReset, requeueMissed = true, daily = false } = options;
  const markCardReviewed = useAppStore((state) => state.markCardReviewed);
  const clearSessionProgressIndex = useAppStore((state) => state.clearSessionProgressIndex);
  const repeatMistakesSetting = useAppStore((state) => state.repeatMistakes);
  const repeatMistakes = requeueMissed && !daily ? repeatMistakesSetting : 'off';

  const [activeCards, setActiveCards] = useState<Flashcard[]>(cards);
  const [isShuffled, setIsShuffled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(() => (
    useAppStore.getState().sessionProgressIndex[sessionKey] || 0
  ));
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});
  /** A manual replay of missed cards is practice only; it must not rewrite SRS history. */
  const practiceOnlyRef = useRef(false);
  const [completed, setCompleted] = useState(false);
  const sessionIdRef = useRef(crypto.randomUUID());
  const clock = useStudyClock(Boolean(completed || options.paused || activeCards.length === 0), daily ? ms => {
    if (!practiceOnlyRef.current) useAppStore.getState().addDailyReviewTime(ms);
  } : undefined);
  const previousAnswerTime = useRef(0);
  /** The session reopened inside an unfinished flashcard review pass (activeCards is the missed list). */
  const [resumedReview, setResumedReview] = useState(false);
  /** activeCards is a review subset of the deck: saved so quitting mid-review can resume it. */
  const reviewSubsetRef = useRef(false);
  // A finished session must reopen at card 1: the unmount/debounced saves skip it.
  const completedRef = useRef(false);
  completedRef.current = completed;

  const activeCardsRef = useRef<Flashcard[]>(cards);
  const canonicalOrderRef = useRef<Flashcard[]>(cards);
  /** The whole deck the loader last offered; during a review pass canonicalOrderRef holds only the missed subset. */
  const fullDeckRef = useRef<Flashcard[]>(cards);
  const isShuffledRef = useRef(isShuffled);
  isShuffledRef.current = isShuffled;
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

  // Where the session stopped, plus the card order when it was shuffled, so leaving and
  // coming back resumes on the same card in the same order.
  const persistProgress = useCallback((key: string) => {
    useAppStore.getState().setSessionProgressIndex(
      key,
      currentIndexRef.current,
      isShuffledRef.current ? activeCardsRef.current.map((card) => card.id) : null,
      reviewSubsetRef.current ? canonicalOrderRef.current.map((card) => card.id) : null,
    );
  }, []);

  useEffect(() => {
    const keyChanged = sessionKeyRef.current !== sessionKey;
    if (keyChanged) {
      if (sessionInitializedRef.current && !completedRef.current && canonicalOrderRef.current.length > 0) {
        persistProgress(sessionKeyRef.current);
      }
      firstAttemptMissedRef.current.clear();
      sessionIdRef.current = crypto.randomUUID();
      practiceOnlyRef.current = false;
      pendingSessionCardIdRef.current = currentCardIdRef.current;
      sessionKeyRef.current = sessionKey;
      sessionInitializedRef.current = false;
      currentCardIdRef.current = null;
      canonicalOrderRef.current = [];
      fullDeckRef.current = [];
      activeCardsRef.current = [];
      setActiveCards([]);
      setIsShuffled(false);
      setCurrentIndex(0);
      setCompleted(false);
      setResumedReview(false);
      reviewSubsetRef.current = false;
      setSessionResults({});
      gradingCardKeyRef.current = null;
      onSessionResetRef.current();
    }

    const wasInitialized = sessionInitializedRef.current;
    const plan = planDeckAdoption({
      cards,
      keyChanged,
      sessionInitialized: sessionInitializedRef.current,
      pendingCardId: pendingSessionCardIdRef.current,
      currentCardId: currentCardIdRef.current,
      canonicalOrder: fullDeckRef.current,
      savedIndex: getSessionStartIndex(
        useAppStore.getState().sessionProgressIndex,
        sessionKey,
        cards.length,
      ),
      currentIndex: currentIndexRef.current,
    });
    if (plan.action !== 'adopt') return;

    // A fresh open (not a carried-over card) resumes the shuffled order it was left in.
    const pendingId = pendingSessionCardIdRef.current;
    const carriesCard = Boolean(pendingId && cards.some((card) => card.id === pendingId));
    const restored = !wasInitialized && !carriesCard
      ? restoreCardOrder(cards, useAppStore.getState().sessionCardOrder[sessionKey])
      : null;
    // Quit mid-review: reopen the missed list at the card it was left on, not the whole deck.
    const reviewCards = !wasInitialized && !carriesCard
      ? restoreReviewCards(cards, useAppStore.getState().sessionCardOrder[reviewSessionKey(sessionKey)])
      : null;
    // A deck reload (cached then fresh cards) mid-review keeps the review subset instead of widening to the whole deck.
    const keptReview = wasInitialized && reviewSubsetRef.current && !reviewCards
      ? (() => {
        const ids = new Set(canonicalOrderRef.current.map((card) => card.id));
        const subset = cards.filter((card) => ids.has(card.id));
        return subset.length > 0 ? subset : null;
      })()
      : null;
    const nextCards = reviewCards ?? keptReview ?? restored ?? cards;

    activeCardsRef.current = nextCards;
    setActiveCards(nextCards);
    if (keyChanged || restored) {
      setIsShuffled(Boolean(restored));
    }
    if (reviewCards) {
      reviewSubsetRef.current = true;
      setResumedReview(true);
    }
    if (wasInitialized && reviewSubsetRef.current && !keptReview) reviewSubsetRef.current = false;
    canonicalOrderRef.current = reviewCards ?? keptReview ?? cards;
    fullDeckRef.current = cards;
    sessionInitializedRef.current = true;
    if (plan.clearPendingCard) pendingSessionCardIdRef.current = null;
    if (daily) {
      const plan = useAppStore.getState().dailyReviewPlan;
      setSessionResults(plan?.answers ?? {});
      const firstUnanswered = nextCards.findIndex(card => !(card.id in (plan?.answers ?? {})));
      setCurrentIndex(Math.max(0, firstUnanswered));
    } else setCurrentIndex(restored || reviewCards
      ? getSessionStartIndex(useAppStore.getState().sessionProgressIndex, sessionKey, nextCards.length)
      : keptReview
      ? retainCurrentCardIndex(keptReview, currentCardIdRef.current, currentIndexRef.current)
      : plan.index);
  }, [cards, daily, sessionKey, persistProgress]);

  useEffect(() => {
    if (activeCards.length > 0 && currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  // Save progress (debounced to avoid massive re-renders)
  useEffect(() => {
    if (!sessionInitializedRef.current || activeCards.length === 0 || completed) return;
    // Save the first question/review immediately, including a quick exit before the debounce fires.
    if (currentIndex === 0) { persistProgress(sessionKey); return; }
    const timeoutId = setTimeout(() => persistProgress(sessionKey), 3000);
    return () => clearTimeout(timeoutId);
  }, [activeCards, completed, currentIndex, isShuffled, sessionKey, persistProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (sessionInitializedRef.current && !completedRef.current && canonicalOrderRef.current.length > 0) {
        persistProgress(sessionKeyRef.current);
      }
    };
  }, [persistProgress]);

  // Prepare the current recording first; look ahead only after it is ready.
  useEffect(() => {
    if (!activeCards || activeCards.length === 0) return;
    const upcomingAudios = activeCards
      .slice(currentIndex + 1, currentIndex + 3)
      .map((c) => c.audio)
      .filter((a): a is string => Boolean(a));
    const currentAudio = activeCards[currentIndex]?.audio;
    if (!currentAudio && upcomingAudios.length === 0) return;

    const controller = new AbortController();
    let timeoutId: number | undefined;
    void audioService.preload([currentAudio], controller.signal).then(() => {
      if (controller.signal.aborted) return;
      timeoutId = window.setTimeout(() => {
        void audioService.preload(upcomingAudios, controller.signal);
      }, 500);
    });
    return () => { window.clearTimeout(timeoutId); controller.abort(); };
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
    const activeActivity = useAppStore.getState().activeActivity;
    const source: ReviewSource = practiceOnlyRef.current ? 'practice' : options.source
      ?? (activeActivity === 'quiz' ? 'quiz' : activeActivity === 'listening' ? 'listening'
        : activeActivity === 'writing' ? 'writing' : activeActivity === 'tones' ? 'tones' : 'flashcards');
    const durationMs = Math.max(0, clock.current - previousAnswerTime.current);
    previousAnswerTime.current = clock.current;
    markCardReviewed(card.id, quality, {
      id: crypto.randomUUID(), sessionId: sessionIdRef.current, source, durationMs,
      practiceOnly: practiceOnlyRef.current || wasMissed,
      ...(source === 'daily' ? { dailyTarget: useAppStore.getState().dailyReviewPlan?.cardIds.length } : {}),
    });
    if (practiceOnlyRef.current) {
      setSessionResults(previous => ({ ...previous, [card.id]: quality }));
      return;
    }
    if (!wasMissed) setSessionResults(previous => ({ ...previous, [card.id]: quality }));
    if (quality <= 2) {
      firstAttemptMissedRef.current.add(card.id);
      if (repeatMistakes !== 'off') {
        const next = queueMissedItem(activeCardsRef.current, card, currentIndexRef.current, repeatMistakes);
        activeCardsRef.current = next;
        setActiveCards(next);
      }
    }
  }, [clock, markCardReviewed, options.source, repeatMistakes]);

  const advanceOrComplete = useCallback((): 'advanced' | 'completed' => {
    const current = currentIndexRef.current;
    const cardsList = activeCardsRef.current;
    const plan = daily && !practiceOnlyRef.current ? useAppStore.getState().dailyReviewPlan : null;
    const timeUp = Boolean(plan && plan.activeMs >= DAILY_REVIEW_MS);
    const nextDailyIndex = plan ? cardsList.findIndex((card, index) => index > current && !(card.id in plan.answers)) : current + 1;
    if (!timeUp && nextDailyIndex >= 0 && nextDailyIndex < cardsList.length) {
      const nextIndex = nextDailyIndex;
      currentIndexRef.current = nextIndex;
      currentCardIdRef.current = cardsList[nextIndex]?.id ?? null;
      setCurrentIndex(nextIndex);
      persistProgress(sessionKey);
      return 'advanced';
    }
    clearSessionProgressIndex(sessionKey);
    // The pinned due-set snapshot is a per-session pin: once the review
    // session completes, drop it so the next review entry recomputes from
    // the live SRS due set instead of replaying already-reviewed cards.
    if (daily && !practiceOnlyRef.current) {
      const plan = useAppStore.getState().dailyReviewPlan;
      if (plan) useAppStore.getState().setDailyReviewPlan({ ...plan, completed: true });
    }
    if (sessionKey === SHARED_REVIEW_SESSION_KEY) {
      useAppStore.getState().setActiveReviewSessionCards(null);
    }
    setCompleted(true);
    return 'completed';
  }, [clearSessionProgressIndex, daily, persistProgress, sessionKey]);

  /** Moves to an exact card, bounded (swipe/keyboard navigation). */
  const moveTo = useCallback((index: number) => {
    const cardsList = activeCardsRef.current;
    if (cardsList.length === 0) return;
    const target = Math.max(0, Math.min(index, cardsList.length - 1));
    currentIndexRef.current = target;
    currentCardIdRef.current = cardsList[target]?.id ?? null;
    setCurrentIndex(target);
  }, []);

  /** Shuffling (or unshuffling) deals the whole deck again, so the round starts over from card 1. */
  const toggleShuffle = useCallback(() => {
    const nextShuffled = !isShuffled;
    const nextCards = nextShuffled ? shuffleItems(canonicalOrderRef.current) : [...canonicalOrderRef.current];

    firstAttemptMissedRef.current.clear();
    activeCardsRef.current = nextCards;
    setActiveCards(nextCards);
    setIsShuffled(nextShuffled);
    isShuffledRef.current = nextShuffled;
    currentIndexRef.current = 0;
    currentCardIdRef.current = nextCards[0]?.id ?? null;
    setCurrentIndex(0);
    setCompleted(false);
    setSessionResults({});
    gradingCardKeyRef.current = null;
    useAppStore.getState().showFeedbackToast(nextShuffled ? 'Shuffled' : 'Unshuffled');
    onAnswerStateResetRef.current();
  }, [isShuffled]);

  const resetAll = useCallback(() => {
    practiceOnlyRef.current = false;
    firstAttemptMissedRef.current.clear();
    activeCardsRef.current = cards;
    setActiveCards(cards);
    canonicalOrderRef.current = cards;
    reviewSubsetRef.current = false;
    setIsShuffled(false);
    setCurrentIndex(0);
    setCompleted(false);
    setSessionResults({});
    gradingCardKeyRef.current = null;
    onAnswerStateResetRef.current();
  }, [cards]);

  /** Starts a focused practice run without clearing progress or recording another SRS grade. */
  const practiceCards = useCallback((subset: Flashcard[]) => {
    const uniqueCards = Array.from(new Map(subset.map((card) => [card.id, card])).values());
    if (uniqueCards.length === 0) return;
    practiceOnlyRef.current = true;
    firstAttemptMissedRef.current.clear();
    activeCardsRef.current = uniqueCards;
    setActiveCards(uniqueCards);
    canonicalOrderRef.current = uniqueCards;
    reviewSubsetRef.current = false;
    setIsShuffled(false);
    setCurrentIndex(0);
    setCompleted(false);
    setSessionResults({});
    gradingCardKeyRef.current = null;
    clearSessionProgressIndex(sessionKey);
    onAnswerStateResetRef.current();
  }, [clearSessionProgressIndex, sessionKey]);

  const reviewUnlearned = useCallback(() => {
    practiceOnlyRef.current = true;
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
    reviewSubsetRef.current = true;
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
    isShuffled,
  );

  return {
    activeCards,
    isShuffled,
    currentIndex,
    currentCard,
    sessionResults,
    completed,
    practiceOnly: practiceOnlyRef.current,
    resumedReview,
    beginGrading,
    clearGrading,
    recordAnswer,
    advanceOrComplete,
    moveTo,
    toggleShuffle,
    resetAll,
    practiceCards,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    progressInfo,
    initialTotalCount: canonicalOrderRef.current.length || cards.length,
  };
}

export type { CardSessionProgressInfo };
