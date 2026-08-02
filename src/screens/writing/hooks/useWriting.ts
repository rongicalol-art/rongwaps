import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { shuffleItems } from '../../../utils/sessionOrder';
import { usePracticePreferencesStore } from '../../../store/usePracticePreferencesStore';
import { getCurriculumSessionKey } from '../../../utils/lessonPartSelection';
import { retainCurrentCardIndex } from '../../../utils/sessionProgress';

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
    libraryActiveFolder,
    selectedLessonParts,
  } = useAppStore();
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const autoPlayAudio = usePracticePreferencesStore((state) => state.autoPlayAudio);
  const sessionKey = isReviewDeck ? `shared_deck_review_${activeBookId}` : isLibraryDeck ? `shared_deck_library_${libraryActiveFolder}` : getCurriculumSessionKey(activeBookId, selectedLessons, selectedLessonParts);

  const [screenState, setScreenState] = useState<'playing' | 'complete'>('playing');
  const [currentIndex, setCurrentIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  const { cards: loadedCards, isLoading, error: loadError } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const canonicalOrderRef = useRef<Flashcard[]>([]);
  const currentCardIdRef = useRef<string | null>(null);
  const charCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCharCompletionTimer = useCallback(() => {
    if (charCompletionTimerRef.current !== null) {
      clearTimeout(charCompletionTimerRef.current);
      charCompletionTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setCards(loadedCards);
    setCurrentIndex((previousIndex) => (
      retainCurrentCardIndex(loadedCards, currentCardIdRef.current, previousIndex)
    ));
    setIsShuffled(false);
    canonicalOrderRef.current = loadedCards;
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
  if (currentCard) currentCardIdRef.current = currentCard.id;
  const chars: string[] = currentCard ? Array.from(currentCard.front) : [];

  useEffect(() => {
    clearCharCompletionTimer();
    return () => {
      clearCharCompletionTimer();
      audioService.stop();
    };
  }, [clearCharCompletionTimer, currentCard?.id, screenState]);

  const toggleShuffle = useCallback(() => {
    clearCharCompletionTimer();
    const nextShuffled = !isShuffled;
    setCards(nextShuffled ? shuffleItems(canonicalOrderRef.current) : [...canonicalOrderRef.current]);
    setCurrentIndex(0);
    setScreenState('playing');
    setActiveCharIndex(0);
    setCompletedChars(new Set());
    setStatus('idle');
    setResetCounter((counter) => counter + 1);
    setIsShuffled(nextShuffled);
  }, [clearCharCompletionTimer, isShuffled]);

  // Play audio when the card changes
  useEffect(() => {
    if (autoPlayAudio && currentCard && currentIndex >= 0) {
      audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
    }
  }, [autoPlayAudio, currentIndex, currentCard, pronunciationRate]);

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
    clearCharCompletionTimer();
    setCompletedChars(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    // Wait 600ms so the user sees the character turn green before
    // the next character becomes active. This gives a smooth,
    // satisfying "chain" feeling as you write each character.
    charCompletionTimerRef.current = setTimeout(() => {
      charCompletionTimerRef.current = null;
      setActiveCharIndex(prev => {
        if (prev === index) return prev + 1;
        return prev;
      });
    }, 600);
  }, [clearCharCompletionTimer]);

  const handleRetry = useCallback(() => {
    clearCharCompletionTimer();
    setActiveCharIndex(0);
    setCompletedChars(new Set());
    setStatus('idle');
    setResetCounter(c => c + 1);
  }, [clearCharCompletionTimer]);

  const restartRound = useCallback(() => {
    clearCharCompletionTimer();
    setCards(loadedCards);
    canonicalOrderRef.current = loadedCards;
    setIsShuffled(false);
    setCurrentIndex(0);
    setScreenState('playing');
    setActiveCharIndex(0);
    setCompletedChars(new Set());
    setStatus('idle');
    setResetCounter((counter) => counter + 1);
  }, [clearCharCompletionTimer, loadedCards]);

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
    handleRetry,
    restartRound,
    isShuffled,
    toggleShuffle,
  };
}
