import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { usePracticePreferencesStore } from '../../../store/usePracticePreferencesStore';
import { getCurriculumSessionKey, SHARED_REVIEW_SESSION_KEY } from '../../../utils/lessonPartSelection';
import { useCardSession } from '../../../hooks/useCardSession';

// How many upcoming cards (without recorded audio) get neural TTS pre-warmed
// so their first play uses the good voice instead of browser speech.
const NEURAL_PRELOAD_AHEAD = 2;

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
  const markCardReviewed = useAppStore((state) => state.markCardReviewed);
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const autoPlayAudio = usePracticePreferencesStore((state) => state.autoPlayAudio);
  const sessionKey = isReviewDeck ? SHARED_REVIEW_SESSION_KEY : isLibraryDeck ? `shared_deck_library_${libraryActiveFolder}` : getCurriculumSessionKey(activeBookId, selectedLessons, selectedLessonParts);

  const { cards: loadedCards, isLoading, error: loadError } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

  const [activeCharIndex, setActiveCharIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct'>('idle');
  const [completedChars, setCompletedChars] = useState<Set<number>>(new Set());
  const [canvasSize, setCanvasSize] = useState(280);
  const [showOutline, setShowOutline] = useState(true);
  const [resetCounter, setResetCounter] = useState(0);
  const charCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCharCompletionTimer = useCallback(() => {
    if (charCompletionTimerRef.current !== null) {
      clearTimeout(charCompletionTimerRef.current);
      charCompletionTimerRef.current = null;
    }
  }, []);

  const resetCharState = useCallback(() => {
    clearCharCompletionTimer();
    setActiveCharIndex(0);
    setCompletedChars(new Set());
    setStatus('idle');
    setResetCounter((counter) => counter + 1);
  }, [clearCharCompletionTimer]);

  const session = useCardSession(loadedCards, sessionKey, {
    onSessionReset: () => {
      clearCharCompletionTimer();
      audioService.stop();
      resetCharState();
    },
    onAnswerStateReset: resetCharState,
  });
  const { activeCards: cards, currentIndex, currentCard, completed } = session;
  const screenState: 'playing' | 'complete' = completed ? 'complete' : 'playing';

  // Warm the deck's recorded audio once its cards arrive.
  useEffect(() => {
    if (cards.length === 0) return;
    audioService.preload(cards.map(c => c.audio));
  }, [cards]);

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

  const playlist = useMemo(() => cards, [cards]);
  const chars: string[] = currentCard ? Array.from(currentCard.front) : [];

  useEffect(() => {
    clearCharCompletionTimer();
    return () => {
      clearCharCompletionTimer();
      audioService.stop();
    };
  }, [clearCharCompletionTimer, currentCard?.id, screenState]);

  const toggleShuffle = useCallback(() => {
    session.toggleShuffle();
  }, [session]);

  // Play audio when the card changes
  useEffect(() => {
    if (autoPlayAudio && currentCard && currentIndex >= 0) {
      audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
    }
  }, [autoPlayAudio, currentIndex, currentCard, pronunciationRate]);

  // Pre-warm neural TTS for upcoming cards without recorded audio so the
  // first play of each card is the neural voice, not browser speech.
  useEffect(() => {
    if (playlist.length === 0 || currentIndex < 0) return;
    const upcoming = playlist.slice(currentIndex, currentIndex + NEURAL_PRELOAD_AHEAD);
    const fronts = upcoming
      .filter((card) => !audioService.isAudioFileName(card.audio))
      .map((card) => card.front?.trim())
      .filter((text): text is string => Boolean(text));
    if (fronts.length > 0) {
      audioService.preloadNeural(fronts, undefined, { limit: NEURAL_PRELOAD_AHEAD }).catch(() => {});
    }
  }, [playlist, currentIndex]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      clearCharCompletionTimer();
      session.moveTo(currentIndex - 1);
      setActiveCharIndex(0);
      setCompletedChars(new Set());
      setStatus('idle');
      setResetCounter(0);
    }
  }, [clearCharCompletionTimer, currentIndex, session]);

  const handleNext = useCallback(() => {
    clearCharCompletionTimer();
    const outcome = session.advanceOrComplete();
    if (outcome === 'advanced') {
      setActiveCharIndex(0);
      setCompletedChars(new Set());
      setStatus('idle');
      setResetCounter(0);
    }
  }, [clearCharCompletionTimer, session]);

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

  const restartCurrentChar = useCallback(() => {
    clearCharCompletionTimer();
    setCompletedChars(prev => {
      const next = new Set(prev);
      next.delete(activeCharIndex);
      return next;
    });
    setStatus('idle');
    setResetCounter(c => c + 1);
  }, [activeCharIndex, clearCharCompletionTimer]);

  const handlePrevChar = useCallback(() => {
    if (activeCharIndex <= 0) return;
    clearCharCompletionTimer();
    const prevIndex = activeCharIndex - 1;
    setCompletedChars(prev => {
      const next = new Set(prev);
      next.delete(prevIndex);
      next.delete(activeCharIndex);
      return next;
    });
    setActiveCharIndex(prevIndex);
    setStatus('idle');
    setResetCounter(c => c + 1);
  }, [activeCharIndex, clearCharCompletionTimer]);

  const jumpToChar = useCallback((targetIndex: number) => {
    if (targetIndex >= activeCharIndex || targetIndex < 0) return;
    clearCharCompletionTimer();
    setCompletedChars(prev => {
      const next = new Set(prev);
      for (let i = targetIndex; i <= activeCharIndex; i++) {
        next.delete(i);
      }
      return next;
    });
    setActiveCharIndex(targetIndex);
    setStatus('idle');
    setResetCounter(c => c + 1);
  }, [activeCharIndex, clearCharCompletionTimer]);

  const [animateStrokesSignal, setAnimateStrokesSignal] = useState(0);
  const [isAnimatingStrokes, setIsAnimatingStrokes] = useState(false);

  const triggerAnimateStrokes = useCallback(() => {
    if (isAnimatingStrokes) return;
    setAnimateStrokesSignal(c => c + 1);
  }, [isAnimatingStrokes]);

  const toggleOutline = useCallback(() => {
    setShowOutline(prev => !prev);
  }, []);

  const restartRound = useCallback(() => {
    session.resetAll();
  }, [session]);

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
    toggleOutline,
    resetCounter,
    setResetCounter,
    handlePrev,
    handleNext,
    handleCharComplete,
    isLoading,
    loadError,
    handleRetry,
    restartCurrentChar,
    handlePrevChar,
    jumpToChar,
    animateStrokesSignal,
    isAnimatingStrokes,
    setIsAnimatingStrokes,
    triggerAnimateStrokes,
    restartRound,
    isShuffled: session.isShuffled,
    toggleShuffle,
  };
}
