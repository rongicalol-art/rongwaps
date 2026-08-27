import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { shuffleItems } from '../../../utils/sessionOrder';
import { usePracticePreferencesStore } from '../../../store/usePracticePreferencesStore';
import { queueMissedItem } from '../../../utils/mistakeQueue';
import { getCurriculumSessionKey } from '../../../utils/lessonPartSelection';
import { getSessionStartIndex, retainCurrentCardIndex } from '../../../utils/sessionProgress';
import { buildMeaningChoices } from '../../../utils/meaningChoices';

// How many upcoming cards (without recorded audio) get neural TTS pre-warmed
// so their first play uses the good voice instead of browser speech.
const NEURAL_PRELOAD_AHEAD = 2;

export function useListening(activeBookId: number, selectedLessons: number[], isLibraryDeck: boolean = false, isReviewDeck: boolean = false) {
  const { markCardReviewed, sessionProgressIndex, setSessionProgressIndex, clearSessionProgressIndex, libraryActiveFolder, selectedLessonParts } = useAppStore();
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const autoPlayAudio = usePracticePreferencesStore((state) => state.autoPlayAudio);
  const repeatMistakes = usePracticePreferencesStore((state) => state.repeatMistakes);
  const sessionKey = isReviewDeck ? `shared_deck_review_${activeBookId}` : isLibraryDeck ? `shared_deck_library_${libraryActiveFolder}` : getCurriculumSessionKey(activeBookId, selectedLessons, selectedLessonParts);
  
  const [screenState, setScreenState] = useState<'playing' | 'complete'>('playing');
  const [currentIndex, setCurrentIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  const { cards: loadedCards, isLoading } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeCards, setActiveCards] = useState<Flashcard[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const canonicalOrderRef = useRef<Flashcard[]>([]);
  const sessionKeyRef = useRef(sessionKey);
  const sessionInitializedRef = useRef(false);
  const pendingSessionCardIdRef = useRef<string | null>(null);
  const currentCardIdRef = useRef<string | null>(null);
  const gradingCardKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const playbackRequestRef = useRef(0);

  useEffect(() => {
    if (sessionKeyRef.current !== sessionKey) {
      pendingSessionCardIdRef.current = currentCardIdRef.current;
      sessionKeyRef.current = sessionKey;
      sessionInitializedRef.current = false;
      currentCardIdRef.current = null;
      canonicalOrderRef.current = [];
      playbackRequestRef.current += 1;
      audioService.stop();
      setCards([]);
      setActiveCards([]);
      setCurrentIndex(0);
      setIsShuffled(false);
      setScreenState('playing');
      setIsPlaying(false);
      setSelectedOption(null);
      setIsChecked(false);
      setSessionResults({});
      gradingCardKeyRef.current = null;
      return;
    }

    setCards(loadedCards);
    setActiveCards(loadedCards);
    if (loadedCards.length > 0) {
      const cardIdToRetain = sessionInitializedRef.current
        ? currentCardIdRef.current
        : pendingSessionCardIdRef.current;
      const retainCurrentCard = sessionInitializedRef.current || Boolean(
        cardIdToRetain && loadedCards.some((card) => card.id === cardIdToRetain),
      );
      const savedIndex = retainCurrentCard ? 0 : getSessionStartIndex(
          useAppStore.getState().sessionProgressIndex,
          sessionKey,
          loadedCards.length,
        );
      setCurrentIndex((previousIndex) => retainCurrentCard
        ? retainCurrentCardIndex(loadedCards, cardIdToRetain, previousIndex)
        : savedIndex);
      sessionInitializedRef.current = true;
      pendingSessionCardIdRef.current = null;
    }
    setIsShuffled(false);
    canonicalOrderRef.current = loadedCards;
    if (loadedCards.length > 0) {
      audioService.preload(loadedCards.map(c => c.audio));
    }
  }, [loadedCards, sessionKey]);
  
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});

  useEffect(() => {
    if (activeCards.length > 0 && currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  // Read playlist...
  const playlist = useMemo(() => {
    return activeCards.length > 0 ? activeCards : [];
  }, [activeCards]);

  const currentCard = playlist[currentIndex];
  if (currentCard) currentCardIdRef.current = currentCard.id;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      playbackRequestRef.current += 1;
      audioService.stop();
    };
  }, [screenState]);

  const toggleShuffle = useCallback(() => {
    const nextShuffled = !isShuffled;
    setActiveCards(nextShuffled ? shuffleItems(canonicalOrderRef.current) : [...canonicalOrderRef.current]);
    setCurrentIndex(0);
    setScreenState('playing');
    setIsChecked(false);
    setSelectedOption(null);
    gradingCardKeyRef.current = null;
    setIsShuffled(nextShuffled);
  }, [isShuffled]);

  // Generate distinct, shuffled meanings.
  const options = useMemo(() => {
    if (!currentCard || cards.length === 0) return [];

    const choices = buildMeaningChoices(currentCard, shuffleItems(cards));
    return shuffleItems(choices).map((choice) => choice.back);
  }, [currentCard, cards]);

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

  // Save progress
  useEffect(() => {
    if (!sessionInitializedRef.current || activeCards.length === 0) return;
    setSessionProgressIndex(sessionKey, currentIndex);
  }, [activeCards.length, currentIndex, sessionKey, setSessionProgressIndex]);

  const isCorrect = selectedOption === currentCard?.back;

  const advanceCard = useCallback(() => {
    setIsChecked(false);
    setSelectedOption(null);

    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      clearSessionProgressIndex(sessionKey);
      setScreenState('complete');
    }
  }, [clearSessionProgressIndex, currentIndex, playlist.length, sessionKey]);

  const gradeAnswer = useCallback((option: string) => {
    if (!currentCard) return;

    const gradingCardKey = `${currentIndex}:${currentCard.id}`;
    if (gradingCardKeyRef.current === gradingCardKey) return;
    gradingCardKeyRef.current = gradingCardKey;

    setSelectedOption(option);
    setIsChecked(true);
    const correct = option === currentCard.back;
    markCardReviewed(currentCard.id, correct ? 4 : 2);
    setSessionResults(prev => ({ ...prev, [currentCard.id]: correct ? 4 : 2 }));
    if (!correct) {
      setActiveCards((items) => queueMissedItem(items, currentCard, currentIndex, repeatMistakes));
    }
  }, [currentCard, currentIndex, markCardReviewed, repeatMistakes]);

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
    gradingCardKeyRef.current = null;
    setIsChecked(false);
    setSelectedOption(null);
  }, [isChecked, isCorrect]);

  const resetAll = () => {
    setActiveCards(cards);
    canonicalOrderRef.current = cards;
    setIsShuffled(false);
    setCurrentIndex(0);
    setScreenState('playing');
    setSessionResults({});
    setIsChecked(false);
    setSelectedOption(null);
    gradingCardKeyRef.current = null;
  };

  const reviewUnlearned = () => {
    const unlearnedIds = Object.entries(sessionResults)
      .filter(([, q]) => q === 1 || q === 2)
      .map(([id]) => id);
      
    const unlearnedCards = cards.filter(c => unlearnedIds.includes(c.id));
    if (unlearnedCards.length === 0) {
       resetAll();
       return;
    }
    setActiveCards(unlearnedCards);
    canonicalOrderRef.current = unlearnedCards;
    setIsShuffled(false);
    setCurrentIndex(0);
    setScreenState('playing');
    setSessionResults({});
    setIsChecked(false);
    setSelectedOption(null);
    gradingCardKeyRef.current = null;
  };

  const unlearnedCount = Object.values(sessionResults).filter(q => (q as number) === 1 || (q as number) === 2).length;
  const learnedCount = Object.values(sessionResults).filter(q => (q as number) > 2).length;

  return {
    screenState,
    setScreenState,
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
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle
  };
}
