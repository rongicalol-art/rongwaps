import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { useAppStore } from '../../../store/useAppStore';
import { shuffleItems } from '../../../utils/sessionOrder';
import { usePracticePreferencesStore } from '../../../store/usePracticePreferencesStore';
import { getCurriculumSessionKey, SHARED_REVIEW_SESSION_KEY } from '../../../utils/lessonPartSelection';
import { buildMeaningChoices } from '../../../utils/meaningChoices';
import { useCardSession } from '../../../hooks/useCardSession';

// How many upcoming cards (without recorded audio) get neural TTS pre-warmed
// so their first play uses the good voice instead of browser speech.
const NEURAL_PRELOAD_AHEAD = 2;

export function useListening(activeBookId: number, selectedLessons: number[], isLibraryDeck: boolean = false, isReviewDeck: boolean = false) {
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const autoPlayAudio = usePracticePreferencesStore((state) => state.autoPlayAudio);
  const sessionKey = isReviewDeck ? SHARED_REVIEW_SESSION_KEY : isLibraryDeck ? `shared_deck_library_${libraryActiveFolder}` : getCurriculumSessionKey(activeBookId, selectedLessons, selectedLessonParts);

  const { cards: loadedCards, isLoading } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const currentCardChoicesRef = useRef<{ cardId: string; options: string[] } | null>(null);
  const isMountedRef = useRef(true);
  const playbackRequestRef = useRef(0);

  const clearAnswerState = useCallback(() => {
    setIsChecked(false);
    setSelectedOption(null);
  }, []);

  const session = useCardSession(loadedCards, sessionKey, {
    onSessionReset: () => {
      currentCardChoicesRef.current = null;
      playbackRequestRef.current += 1;
      audioService.stop();
      setIsPlaying(false);
      clearAnswerState();
    },
    onAnswerStateReset: clearAnswerState,
  });
  const { activeCards, currentIndex, currentCard, completed } = session;
  const screenState: 'playing' | 'complete' = completed ? 'complete' : 'playing';

  // Read playlist (the session's active card list, mistake-queue aware).
  const playlist = useMemo(() => {
    return activeCards.length > 0 ? activeCards : [];
  }, [activeCards]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      playbackRequestRef.current += 1;
      audioService.stop();
    };
  }, [screenState]);

  const toggleShuffle = useCallback(() => {
    currentCardChoicesRef.current = null;
    session.toggleShuffle();
  }, [session]);

  // Generate distinct, shuffled meanings.
  // Pinned per card ID so background updates / tab switches never refresh choices mid-card.
  const options = useMemo(() => {
    if (!currentCard || loadedCards.length === 0) return [];
    if (currentCardChoicesRef.current && currentCardChoicesRef.current.cardId === currentCard.id) {
      return currentCardChoicesRef.current.options;
    }

    const choices = buildMeaningChoices(currentCard, shuffleItems(loadedCards));
    const result = shuffleItems(choices).map((choice) => choice.back);
    currentCardChoicesRef.current = { cardId: currentCard.id, options: result };
    return result;
  }, [currentCard, loadedCards]);

  const playAudio = useCallback(async (rate: number = pronunciationRate) => {
    if (!currentCard) return;

    const requestId = playbackRequestRef.current + 1;
    playbackRequestRef.current = requestId;
    setIsPlaying(true);
    await audioService.play(currentCard.audio, rate, currentCard.front);
    if (isMountedRef.current && playbackRequestRef.current === requestId) {
      setIsPlaying(false);
    }
  }, [currentCard, pronunciationRate]);

  // Play audio on new word
  useEffect(() => {
    if (!autoPlayAudio || screenState !== 'playing') return;
    if (currentIndex >= playlist.length) return;
    const t = window.setTimeout(() => void playAudio(pronunciationRate), 400);
    return () => clearTimeout(t);
  }, [autoPlayAudio, currentIndex, playAudio, playlist.length, pronunciationRate, screenState]);

  // Pre-warm neural TTS for upcoming cards without recorded audio so the
  // first play of each card is the neural voice, not browser speech.
  useEffect(() => {
    if (playlist.length === 0) return;
    const upcoming = playlist.slice(currentIndex, currentIndex + NEURAL_PRELOAD_AHEAD);
    const fronts = upcoming
      .filter((card) => !audioService.isAudioFileName(card.audio))
      .map((card) => card.front?.trim())
      .filter((text): text is string => Boolean(text));
    if (fronts.length > 0) {
      audioService.preloadNeural(fronts, undefined, { limit: NEURAL_PRELOAD_AHEAD }).catch(() => {});
    }
  }, [playlist, currentIndex]);

  const isCorrect = selectedOption === currentCard?.back;

  const advanceCard = useCallback(() => {
    clearAnswerState();
    session.advanceOrComplete();
  }, [clearAnswerState, session]);

  const gradeAnswer = useCallback((option: string) => {
    if (!currentCard) return;
    if (!session.beginGrading()) return;

    setSelectedOption(option);
    setIsChecked(true);
    const correct = option === currentCard.back;
    session.recordAnswer(currentCard, correct ? 4 : 2);
  }, [currentCard, session]);

  const handleCheck = useCallback(() => {
    if (!selectedOption) return;
    if (!isChecked) {
      gradeAnswer(selectedOption);
      return;
    }
    if (!isCorrect) return;
    advanceCard();
  }, [advanceCard, gradeAnswer, isChecked, isCorrect, selectedOption]);

  const retryAnswer = useCallback(() => {
    if (!isChecked || isCorrect) return;
    session.clearGrading();
    clearAnswerState();
  }, [isChecked, isCorrect, clearAnswerState, session]);

  const resetAll = useCallback(() => {
    currentCardChoicesRef.current = null;
    session.resetAll();
  }, [session]);

  const reviewUnlearned = useCallback(() => {
    currentCardChoicesRef.current = null;
    session.reviewUnlearned();
  }, [session]);

  return {
    screenState,
    currentIndex,
    playlist,
    currentCard,
    options,
    isPlaying,
    playAudio,
    selectedOption,
    handleSelect: gradeAnswer,
    isChecked,
    handleCheck,
    retryAnswer,
    isCorrect,
    isLoading,
    resetAll,
    reviewUnlearned,
    unlearnedCount: session.unlearnedCount,
    learnedCount: session.learnedCount,
    isShuffled: session.isShuffled,
    toggleShuffle
  };
}
