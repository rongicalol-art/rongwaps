import { useState, useEffect, useRef } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';

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
  const { markCardReviewed, sessionProgressIndex, setSessionProgressIndex, clearSessionProgressIndex, libraryActiveFolder } = useAppStore();
  const sessionKey = isReviewDeck ? `shared_deck_review_${activeBookId}` : isLibraryDeck ? `shared_deck_library_${libraryActiveFolder}` : `shared_deck_${activeBookId}_${selectedLessons?.slice().sort().join(',') || 'all'}`;

  const { cards: loadedCards, isLoading, error } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    sessionStartedRef.current = false;
  }, [sessionKey]);

  useEffect(() => {
    setCards(loadedCards);
    if (loadedCards.length > 0) {
      audioService.preload(loadedCards.map(c => c.audio));

      // Bounds-check the loaded index (Bug 11) and prevent cloud sync override mid-session (Bug 5)
      if (!sessionStartedRef.current) {
        const saved = sessionProgressIndex[sessionKey] || 0;
        const target = saved >= loadedCards.length ? 0 : saved;
        setCurrentIndex(target);
        sessionStartedRef.current = true;
      } else {
        setCurrentIndex(prev => (prev >= loadedCards.length ? 0 : prev));
      }
    }
  }, [loadedCards, sessionKey, sessionProgressIndex]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [maxVisitedIndex, setMaxVisitedIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  useEffect(() => {
    if (currentIndex > maxVisitedIndex) {
      setMaxVisitedIndex(currentIndex);
    }
  }, [currentIndex, maxVisitedIndex]);

  const resetAll = async () => {
    // Just reset states, the cards are already loaded in state
    setCurrentIndex(0);
    setMaxVisitedIndex(0);
    setCompleted(false);
    setSessionResults({});
    setIsFlipped(false);
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
  const [activeMemoryHook, setActiveMemoryHook] = useState<any | null>(null);

  const setActiveBreakdown = (text: string | null, index: number = 0) => {
    setActiveBreakdownState(text);
    setActiveBreakdownIndex(index);
  };

  const currentCard = cards[currentIndex];

  const handleNext = (level: number) => {
    if (!currentCard) return;

    // Convert UI level (1-4) to SRS quality (1-5).
    // The UI skips quality 3 (difficult) for simplicity — users pick
    // Hard(1), Bad(2), Good(3), Easy(4) which maps to SRS 1, 2, 4, 5.
    let quality = 3;
    if (level === 1) quality = 1;
    if (level === 2) quality = 2;
    if (level === 3) quality = 4;
    if (level === 4) quality = 5;

    markCardReviewed(currentCard.id, quality as any);
    
    setSessionResults(prev => ({ ...prev, [currentCard.id]: quality }));
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
      .filter(([id, q]) => q === 1 || q === 2)
      .map(([id]) => id);
      
    const unlearnedCards = cards.filter(c => unlearnedIds.includes(c.id));
    
    // If somehow empty, just reset all
    if (unlearnedCards.length === 0) {
       resetAll();
       return;
    }

    setCards(unlearnedCards);
    setCurrentIndex(0);
    setMaxVisitedIndex(0);
    setCompleted(false);
    setSessionResults({});
    setIsFlipped(false);
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
    isLoading,
    error
  };
}
