import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { useCardSession, type CardSessionQuality } from '../../../hooks/useCardSession';
import { getDeckIdentityKey } from '../../../utils/lesson/lessonPartSelection';

// How many upcoming cards to pre-warm neural TTS for, so flip-triggered
// playback is instant instead of waiting a server synthesis round-trip.
const WARM_AHEAD_COUNT = 1;

/**
 * UI rating level (1-4) → SRS quality (1-5). The UI skips quality 3
 * (difficult) for simplicity — users pick Hard(1), Bad(2), Good(3), Easy(4)
 * which maps to SRS 1, 2, 4, 5.
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

  const { cards: loadedCards, deckCards, isLoading, error, deckExclusionKey, excludedIds } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

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

  // Rolling lookahead: preload recorded audio for the next stretch and
  // pre-warm neural TTS for cards without recorded audio. Debounced so rapid
  // card navigation never contends with card transitions or the main thread.
  useEffect(() => {
    if (activeCards.length === 0) return;
    const timer = window.setTimeout(() => {
      const upcomingAudio = activeCards
        .slice(currentIndex + 1, currentIndex + 5)
        .map((card) => card.audio)
        .filter((audio): audio is string => Boolean(audio));
      if (upcomingAudio.length > 0) {
        void audioService.preload(upcomingAudio).catch(() => {});
      }

      const warm = activeCards
        .slice(currentIndex + 1, currentIndex + 1 + WARM_AHEAD_COUNT)
        .filter((card) => !audioService.isAudioFileName(card.audio))
        .map((card) => card.front.trim())
        .filter(Boolean);
      if (warm.length > 0) {
        void audioService.preloadNeural(warm).catch(() => {});
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [currentIndex, activeCards]);

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

  return {
    cards: activeCards,
    deckCards,
    currentCard,
    currentIndex,
    maxVisitedIndex,
    isFlipped,
    setIsFlipped,
    completed,
    activeBreakdown,
    activeBreakdownIndex,
    setActiveBreakdown,
    handleNavigate,
    handleNext,
    resetAll,
    reviewUnlearned,
    unlearnedCount: session.unlearnedCount,
    learnedCount: session.learnedCount,
    isShuffled: session.isShuffled,
    toggleShuffle: session.toggleShuffle,
    progressInfo: session.progressInfo,
    deckExclusionKey,
    excludedIds,
    isLoading,
    error,
  };
}
