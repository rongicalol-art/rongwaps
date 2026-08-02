import { useState, useEffect, useRef, useCallback } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { shuffleItems } from '../../../utils/sessionOrder';
import { getCurriculumSessionKey } from '../../../utils/lessonPartSelection';
import { retainCurrentCardIndex } from '../../../utils/sessionProgress';
import type { Quality } from '../../../utils/srsEngine';

/**
 * Core hook for the flashcard review session.
 *
 * Loads cards for a given book/lesson selection (or review/library deck),
 * manages flip state, tracks per-card quality ratings in the current session,
 * and persists progress so the user can resume where they left off.
 *
 * Quality scale (matches SRS engine):
 *   1 = Hard    2 = Bad    3 = Good    4 = Easy    5 = Perfect
 *
 * The `handleNext` level maps to quality as:
 *   level 1 → quality 1 (Hard / Again)
 *   level 2 → quality 2 (Bad)
 *   level 3 → quality 4 (Good / Got it)
 *   level 4 → quality 5 (Easy / Perfect)
 */
export function useFlashcards(activeBookId: number, selectedLessons: number[], isReviewDeck: boolean = false, isLibraryDeck: boolean = false) {
  const { markCardReviewed, sessionProgressIndex, setSessionProgressIndex, clearSessionProgressIndex, libraryActiveFolder, selectedLessonParts } = useAppStore();
  const sessionKey = isReviewDeck ? `shared_deck_review_${activeBookId}` : isLibraryDeck ? `shared_deck_library_${libraryActiveFolder}` : getCurriculumSessionKey(activeBookId, selectedLessons, selectedLessonParts);

  const { cards: loadedCards, isLoading, error } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const canonicalOrderRef = useRef<Flashcard[]>([]);
  const sessionStartedRef = useRef(false);
  const currentCardIdRef = useRef<string | null>(null);
  const gradingCardIdRef = useRef<string | null>(null);
  const gradedCardIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setCards(loadedCards);
    setIsShuffled(false);
    canonicalOrderRef.current = loadedCards;
    if (loadedCards.length > 0) {
      audioService.preload(loadedCards.map(c => c.audio));

      // Bounds-check the loaded index (Bug 11) and prevent cloud sync override mid-session (Bug 5)
      if (!sessionStartedRef.current) {
        const saved = useAppStore.getState().sessionProgressIndex[sessionKey] || 0;
        const target = saved >= loadedCards.length ? 0 : saved;
        setCurrentIndex(target);
        sessionStartedRef.current = true;
      } else {
        setCurrentIndex((previousIndex) => (
          retainCurrentCardIndex(loadedCards, currentCardIdRef.current, previousIndex)
        ));
      }
    }
  }, [loadedCards, sessionKey]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    gradingCardIdRef.current = null;
    gradedCardIdsRef.current.clear();
  }, [sessionKey]);

  const [maxVisitedIndex, setMaxVisitedIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  useEffect(() => {
    if (currentIndex > maxVisitedIndex) {
      setMaxVisitedIndex(currentIndex);
    }
  }, [currentIndex, maxVisitedIndex]);

  const resetAll = async () => {
    setCards([...canonicalOrderRef.current]);
    setIsShuffled(false);
    setCurrentIndex(0);
    setMaxVisitedIndex(0);
    setCompleted(false);
    setSessionResults({});
    setIsFlipped(false);
    gradingCardIdRef.current = null;
    gradedCardIdsRef.current.clear();
  };

  useEffect(() => {
    if (cards.length > 0 && currentIndex >= cards.length) {
      setCurrentIndex(0);
    }
  }, [cards.length, currentIndex]);

  // Save progress
  useEffect(() => {
    // Only save progress if the session has actually started/loaded cards to prevent overwriting with 0
    if (sessionStartedRef.current && cards.length > 0) {
      setSessionProgressIndex(sessionKey, currentIndex);
    }
  }, [currentIndex, sessionKey, cards.length, setSessionProgressIndex]);

  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  // Track how cards were rated in this exact session
  // quality: 1-5
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});
  const [activeBreakdown, setActiveBreakdownState] = useState<string | null>(null);
  const [activeBreakdownIndex, setActiveBreakdownIndex] = useState<number>(0);
  const [activeMemoryHook, setActiveMemoryHook] = useState<Flashcard | null>(null);

  const setActiveBreakdown = (text: string | null, index: number = 0) => {
    setActiveBreakdownState(text);
    setActiveBreakdownIndex(index);
  };

  const currentCard = cards[currentIndex];
  if (currentCard) currentCardIdRef.current = currentCard.id;

  useEffect(() => {
    gradingCardIdRef.current = null;
  }, [currentCard?.id]);

  const toggleShuffle = useCallback(() => {
    const nextShuffled = !isShuffled;
    const baseCards = canonicalOrderRef.current;
    setCards(nextShuffled ? shuffleItems(baseCards) : [...baseCards]);
    setCurrentIndex(0);
    setMaxVisitedIndex(0);
    setCompleted(false);
    setIsFlipped(false);
    setIsShuffled(nextShuffled);
  }, [isShuffled]);

  const handleNext = (level: number) => {
    if (!currentCard || gradingCardIdRef.current === currentCard.id) return;
    gradingCardIdRef.current = currentCard.id;

    // Convert UI level (1-4) to SRS quality (1-5).
    // The UI skips quality 3 (difficult) for simplicity — users pick
    // Hard(1), Bad(2), Good(3), Easy(4) which maps to SRS 1, 2, 4, 5.
    let quality = 3;
    if (level === 1) quality = 1;
    if (level === 2) quality = 2;
    if (level === 3) quality = 4;
    if (level === 4) quality = 5;

    // Navigating back to an already-rated card must not apply SRS/XP twice.
    // The second rating still advances so keyboard and swipe navigation remain fluid.
    if (!gradedCardIdsRef.current.has(currentCard.id)) {
      gradedCardIdsRef.current.add(currentCard.id);
      markCardReviewed(currentCard.id, quality as Quality);
      setSessionResults(prev => ({ ...prev, [currentCard.id]: quality }));
    }
    setIsFlipped(false);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      clearSessionProgressIndex(sessionKey);
      setCompleted(true);
    }
  };

  const handleNavigate = (dir: number) => {
    const newDoc = currentIndex + dir;
    if (newDoc >= 0 && newDoc < cards.length) {
      setCurrentIndex(newDoc);
      setIsFlipped(false);
    } else if (newDoc >= cards.length) {
      clearSessionProgressIndex(sessionKey);
      setCompleted(true);
    }
  };

  // Re-build the card list from only the ones the user rated Hard(1) or Bad(2)
  // so they can focus on weak cards before moving on.
  const reviewUnlearned = () => {
    const unlearnedIds = Object.entries(sessionResults)
      .filter(([, q]) => q === 1 || q === 2)
      .map(([id]) => id);
      
    const unlearnedCards = cards.filter(c => unlearnedIds.includes(c.id));
    
    // If somehow empty, just reset all
    if (unlearnedCards.length === 0) {
       resetAll();
       return;
    }

    setCards(unlearnedCards);
    canonicalOrderRef.current = unlearnedCards;
    setIsShuffled(false);
    setCurrentIndex(0);
    setMaxVisitedIndex(0);
    setCompleted(false);
    setSessionResults({});
    setIsFlipped(false);
    gradingCardIdRef.current = null;
    gradedCardIdsRef.current.clear();
  };

  // Helper stats for Recap screen
  const unlearnedCount = Object.values(sessionResults).filter(q => (q as number) === 1 || (q as number) === 2).length;
  const learnedCount = Object.values(sessionResults).filter(q => (q as number) > 2).length;

  return {
    cards,
    currentCard,
    currentIndex,
    maxVisitedIndex,
    isFlipped,
    setIsFlipped,
    completed,
    activeBreakdown,
    activeBreakdownIndex,
    setActiveBreakdown,
    activeMemoryHook,
    setActiveMemoryHook,
    handleNavigate,
    handleNext,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle,
    isLoading,
    error
  };
}
