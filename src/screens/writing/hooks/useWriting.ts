import { useState, useMemo, useEffect, useCallback } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';

/**
 * Manages the character-writing quiz session.
 *
 * Users trace each character of a vocabulary word on a canvas, one at a time.
 * When all characters in a word are completed, the card is automatically
 * marked as reviewed with quality 5 (perfect recall — writing from memory).
 *
 * The hook handles:
 *   - Character-by-character progression with auto-advance
 *   - Canvas sizing that responds to window resize
 *   - Audio playback on each new card
 *   - Session progress persistence (resume where you left off)
 *   - Retry (reset current card) and navigation between cards
 */
export function useWriting(activeBookId: number, selectedLessons: number[], onClose: () => void, isLibraryDeck: boolean = false, isReviewDeck: boolean = false) {
  const { 
    markCardReviewed,
    sessionProgressIndex,
    setSessionProgressIndex,
    clearSessionProgressIndex,
    libraryActiveFolder
  } = useAppStore();
  const sessionKey = isReviewDeck ? `shared_deck_review_${activeBookId}` : isLibraryDeck ? `shared_deck_library_${libraryActiveFolder}` : `shared_deck_${activeBookId}_${selectedLessons?.slice().sort().join(',') || 'all'}`;

  const [screenState, setScreenState] = useState<'playing' | 'complete'>('playing');
  const [currentIndex, setCurrentIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  const storeIndexWriting = sessionProgressIndex[sessionKey];
  useEffect(() => {
    if (storeIndexWriting !== undefined && storeIndexWriting !== currentIndex) {
      setCurrentIndex(storeIndexWriting);
    }
  }, [storeIndexWriting]);

  const { cards: loadedCards, isLoading, error: loadError } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const [cards, setCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    setCards(loadedCards);
    if (loadedCards.length > 0) {
      audioService.preload(loadedCards.map(c => c.audio));
    }
  }, [loadedCards]);
  
  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct'>('idle');
  const [completedChars, setCompletedChars] = useState<Set<number>>(new Set());
  const [canvasSize, setCanvasSize] = useState(280);
  const [showOutline, setShowOutline] = useState(true);
  const [resetCounter, setResetCounter] = useState(0);

  useEffect(() => {
    if (cards.length > 0 && currentIndex >= cards.length) {
      setCurrentIndex(0);
    }
  }, [cards.length, currentIndex]);

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = window.innerWidth - 64;
      const maxHeight = window.innerHeight - 380;
      setCanvasSize(Math.max(200, Math.min(maxWidth, maxHeight, 340)));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const playlist = useMemo(() => {
    return cards;
  }, [cards]);

  const currentCard = playlist[currentIndex];
  const chars: string[] = currentCard ? Array.from(currentCard.front) : [];

  // Play audio when the card changes
  useEffect(() => {
    if (currentCard && currentIndex >= 0) {
      audioService.play(currentCard.audio, 1.0, currentCard.front);
    }
  }, [currentIndex, currentCard]);

  // Save progress
  useEffect(() => {
    setSessionProgressIndex(sessionKey, currentIndex);
  }, [currentIndex, sessionKey, setSessionProgressIndex]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1);
      setActiveCharIndex(0);
      setCompletedChars(new Set());
      setStatus('idle');
      setResetCounter(0);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(c => c + 1);
      setActiveCharIndex(0);
      setCompletedChars(new Set());
      setStatus('idle');
      setResetCounter(0);
    } else {
      clearSessionProgressIndex(sessionKey);
      setScreenState('complete');
    }
  }, [currentIndex, playlist.length, sessionKey, clearSessionProgressIndex]);

  // When the last character is completed, auto-advance after a short delay
  // so the user sees the "correct" feedback before moving on.
  useEffect(() => {
    if (activeCharIndex >= chars.length && chars.length > 0) {
      if (status !== 'correct') {
        setStatus('correct');
        if (currentCard) {
          markCardReviewed(currentCard.id, 5);
        }
      }
    }
  }, [activeCharIndex, chars.length, currentCard, markCardReviewed, status]);

  const handleCharComplete = useCallback((index: number) => {
    setCompletedChars(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    // Wait 600ms so the user sees the character turn green before
    // the next character becomes active. This gives a smooth,
    // satisfying "chain" feeling as you write each character.
    setTimeout(() => {
      setActiveCharIndex(prev => {
        if (prev === index) return prev + 1;
        return prev;
      });
    }, 600);
  }, []);

  const handleRetry = useCallback(() => {
    setActiveCharIndex(0);
    setCompletedChars(new Set());
    setStatus('idle');
    setResetCounter(c => c + 1);
  }, []);

  return {
    screenState,
    playlist,
    currentCard,
    chars,
    currentIndex,
    activeCharIndex,
    status,
    completedChars,
    canvasSize,
    showOutline,
    setShowOutline,
    resetCounter,
    setResetCounter,
    handlePrev,
    handleNext,
    handleCharComplete,
    isLoading,
    loadError,
    handleRetry
  };
}
