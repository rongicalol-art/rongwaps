import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { useCardSession, type CardSessionQuality } from '../../../hooks/useCardSession';
import { getDeckIdentityKey } from '../../../utils/lesson/lessonPartSelection';

/**
 * UI rating level (1-3) → SRS quality (1-5). The UI skips quality 3
 * (difficult) — Hard and Unsure map to SRS 1 and 2; Got it maps to 4.
 */
function levelToQuality(level: number): CardSessionQuality {
  if (level === 1) return 1;
  if (level === 2) return 2;
  if (level === 3) return 4;
  return 5;
}

/**
 * Flashcard review session: deck loading plus the flip/breakdown UI state
 * the flashcards screen owns. Session mechanics (deck lifecycle across
 * session-key switches, resume, shuffle, grading dedupe, mistake requeue,
 * completion, reset/review-unlearned) live in `useCardSession`.
 */
export function useFlashcards(activeBookId: number, selectedLessons: number[], isReviewDeck: boolean = false, isLibraryDeck: boolean = false) {
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const sessionKey = getDeckIdentityKey({
    activeBookId,
    selectedLessons,
    selectedLessonParts,
    libraryActiveFolder,
    isReviewDeck,
    isLibraryDeck,
  });

  const { cards: loadedCards, isLoading, error, deckExclusionKey } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

  const [isFlipped, setIsFlipped] = useState(false);
  const [activeBreakdown, setActiveBreakdownState] = useState<string | null>(null);
  const [activeBreakdownIndex, setActiveBreakdownIndex] = useState<number>(0);
  // Furthest card reached this session; review decks gate forward navigation
  // on it so a fresh review run cannot skip ahead of what was shown.
  const [maxVisitedIndex, setMaxVisitedIndex] = useState(0);

  const session = useCardSession(loadedCards, sessionKey, {
    onSessionReset: () => {
      setIsFlipped(false);
      setActiveBreakdownState(null);
      setActiveBreakdownIndex(0);
      setMaxVisitedIndex(0);
    },
    onAnswerStateReset: () => {
      setIsFlipped(false);
      setMaxVisitedIndex(0);
    },
  });
  const { activeCards, currentCard, currentIndex, completed } = session;

  useEffect(() => {
    setMaxVisitedIndex((previous) => Math.max(previous, currentIndex));
  }, [currentIndex]);

  const setActiveBreakdown = useCallback((text: string | null, index: number = 0) => {
    setActiveBreakdownState(text);
    setActiveBreakdownIndex(index);
  }, []);

  const handleNavigate = useCallback((dir: number) => {
    setIsFlipped(false);
    if (dir < 0) {
      session.moveTo(currentIndex - 1);
      return;
    }
    session.advanceOrComplete();
  }, [currentIndex, session]);

  const handleNext = useCallback((level: number) => {
    const cardToRate = activeCards[currentIndex] ?? currentCard;
    if (!cardToRate) return;
    // Re-rating an already-graded card still advances so keyboard and swipe
    // navigation stay fluid, but must not apply SRS or tallies twice.
    if (session.beginGrading()) {
      session.recordAnswer(cardToRate, levelToQuality(level));
    }
    setIsFlipped(false);
    session.advanceOrComplete();
  }, [activeCards, currentCard, currentIndex, session]);

  const resetAll = useCallback(() => {
    useAppStore.getState().clearDeckExclusions(deckExclusionKey);
    session.resetAll();
  }, [deckExclusionKey, session]);

  const reviewUnlearned = useCallback(() => {
    session.reviewUnlearned();
  }, [session]);

  // Cards rated Again this round (SRS quality 1-2), for the round-done chips.
  const missedCards = Array.from(new Map(activeCards.filter((card) => {
    const quality = session.sessionResults[card.id];
    return quality === 1 || quality === 2;
  }).map((card) => [card.id, card])).values());

  return {
    cards: activeCards,
    missedCards,
    currentCard,
    currentIndex,
    maxVisitedIndex,
    isFlipped,
    setIsFlipped,
    completed,
    resumedReview: session.resumedReview,
    activeBreakdown,
    activeBreakdownIndex,
    setActiveBreakdown,
    handleNavigate,
    handleNext,
    resetAll,
    restartSession: session.resetAll,
    practiceCards: session.practiceCards,
    reviewUnlearned,
    unlearnedCount: session.unlearnedCount,
    learnedCount: session.learnedCount,
    isShuffled: session.isShuffled,
    toggleShuffle: session.toggleShuffle,
    progressInfo: session.progressInfo,
    isLoading,
    error,
  };
}
