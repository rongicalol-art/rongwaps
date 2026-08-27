import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { shuffleItems } from '../../../utils/sessionOrder';
import { usePracticePreferencesStore } from '../../../store/usePracticePreferencesStore';
import { queueMissedItem } from '../../../utils/mistakeQueue';
import { isPinyinAnswerAccepted } from '../../../utils/pinyinAnswer';
import { getSessionStartIndex, retainCurrentCardIndex } from '../../../utils/sessionProgress';
import { buildMeaningChoices } from '../../../utils/meaningChoices';

export function useQuizLoader(activeBookId: number, selectedLessons: number[], isLibraryDeck: boolean = false, isReviewDeck: boolean = false) {
  return useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
}

/**
 * Manages a multiple-choice quiz session.
 *
 * For each card, 3 options are shown: the correct answer + 2 random
 * wrong answers from the same deck. The check flow is two-phase:
 *   First click → check the answer and show correct/wrong feedback
 *   Second click → advance to the next card (or complete the session)
 */
export function useQuizChoices(cards: Flashcard[], sessionKey: string) {
  const { markCardReviewed, sessionProgressIndex, setSessionProgressIndex, clearSessionProgressIndex } = useAppStore();
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const replayAudioAfterAnswer = usePracticePreferencesStore((state) => state.replayAudioAfterAnswer);
  const repeatMistakes = usePracticePreferencesStore((state) => state.repeatMistakes);
  
  const [activeCards, setActiveCards] = useState<Flashcard[]>(cards);
  const [isShuffled, setIsShuffled] = useState(false);
  const canonicalOrderRef = useRef<Flashcard[]>(cards);
  const sessionKeyRef = useRef(sessionKey);
  const sessionInitializedRef = useRef(false);
  const pendingSessionCardIdRef = useRef<string | null>(null);
  const currentCardIdRef = useRef<string | null>(null);
  const gradingCardKeyRef = useRef<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  useEffect(() => {
    if (sessionKeyRef.current !== sessionKey) {
      pendingSessionCardIdRef.current = currentCardIdRef.current;
      sessionKeyRef.current = sessionKey;
      sessionInitializedRef.current = false;
      currentCardIdRef.current = null;
      canonicalOrderRef.current = [];
      setActiveCards([]);
      setIsShuffled(false);
      setCurrentIndex(0);
      setCompleted(false);
      setSelectedOption(null);
      setIsChecked(false);
      setSessionResults({});
      gradingCardKeyRef.current = null;
      return;
    }

    setActiveCards(cards);
    if (cards.length > 0) {
      const cardIdToRetain = sessionInitializedRef.current
        ? currentCardIdRef.current
        : pendingSessionCardIdRef.current;
      const retainCurrentCard = sessionInitializedRef.current || Boolean(
        cardIdToRetain && cards.some((card) => card.id === cardIdToRetain),
      );
      const savedIndex = retainCurrentCard ? 0 : getSessionStartIndex(
          useAppStore.getState().sessionProgressIndex,
          sessionKey,
          cards.length,
        );
      setCurrentIndex((previousIndex) => retainCurrentCard
        ? retainCurrentCardIndex(cards, cardIdToRetain, previousIndex)
        : savedIndex);
      sessionInitializedRef.current = true;
      pendingSessionCardIdRef.current = null;
    }
    setIsShuffled(false);
    canonicalOrderRef.current = cards;
  }, [cards, sessionKey]);

  useEffect(() => {
    if (activeCards.length > 0 && currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  // Save progress
  useEffect(() => {
    if (!sessionInitializedRef.current || activeCards.length === 0) return;
    setSessionProgressIndex(sessionKey, currentIndex);
  }, [activeCards.length, currentIndex, sessionKey, setSessionProgressIndex]);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  // Preload audio
  useEffect(() => {
    if (activeCards.length > 0) {
      audioService.preload(activeCards.map(c => c.audio));
    }
  }, [activeCards]);

  const currentCard = activeCards[currentIndex];
  if (currentCard) currentCardIdRef.current = currentCard.id;

  // Stop audio only when the session completes or unmounts — never when
  // advancing to the next card, so the correct-answer pronunciation keeps
  // ringing through the card transition.
  useEffect(() => {
    return () => audioService.stop();
  }, [completed]);

  const toggleShuffle = useCallback(() => {
    const nextShuffled = !isShuffled;
    setActiveCards(nextShuffled ? shuffleItems(canonicalOrderRef.current) : [...canonicalOrderRef.current]);
    setCurrentIndex(0);
    setCompleted(false);
    setIsChecked(false);
    setSelectedOption(null);
    gradingCardKeyRef.current = null;
    setIsShuffled(nextShuffled);
  }, [isShuffled]);

  // Derive choices during the same render as the next card. Keeping these in an
  // effect briefly paired a new prompt with the previous prompt's answers,
  // producing a visible second render during every card transition.
  const options = useMemo(() => {
    if (!currentCard) return [];
    return shuffleItems(buildMeaningChoices(currentCard, shuffleItems(cards)));
  }, [cards, currentCard]);

  useEffect(() => {
    setSelectedOption(null);
    setIsChecked(false);
  }, [currentCard?.id]);

  const isCorrect = selectedOption === currentCard?.back;

  const recordChoiceAnswer = useCallback((option: string) => {
    if (!currentCard) return;

    const gradingCardKey = `${currentIndex}:${currentCard.id}`;
    if (gradingCardKeyRef.current === gradingCardKey) return;
    gradingCardKeyRef.current = gradingCardKey;

    setSelectedOption(option);
    setIsChecked(true);
    const correct = option === currentCard.back;
    if (correct && replayAudioAfterAnswer) {
      audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
    }
    markCardReviewed(currentCard.id, correct ? 4 : 2);
    setSessionResults(prev => ({ ...prev, [currentCard.id]: correct ? 4 : 2 }));
    if (!correct) {
      setActiveCards((items) => queueMissedItem(items, currentCard, currentIndex, repeatMistakes));
    }
  }, [currentCard, currentIndex, markCardReviewed, pronunciationRate, repeatMistakes, replayAudioAfterAnswer]);

  const handleCheck = () => {
    if (!selectedOption) return;

    if (isChecked) {
      if (!isCorrect) return;
      setIsChecked(false); // Reset before moving to next card
      setSelectedOption(null);
      if (currentIndex < activeCards.length - 1) {
        setCurrentIndex(c => c + 1);
      } else {
        clearSessionProgressIndex(sessionKey);
        setCompleted(true);
      }
    } else {
      recordChoiceAnswer(selectedOption);
    }
  };

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
    setCompleted(false);
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
    setCompleted(false);
    setSessionResults({});
    setIsChecked(false);
    setSelectedOption(null);
    gradingCardKeyRef.current = null;
  };

  const unlearnedCount = Object.values(sessionResults).filter(q => (q as number) === 1 || (q as number) === 2).length;
  const learnedCount = Object.values(sessionResults).filter(q => (q as number) > 2).length;

  return {
    activeCards,
    currentIndex,
    currentCard,
    options,
    selectedOption,
    setSelectedOption,
    handleSelect: recordChoiceAnswer,
    isChecked,
    isCorrect,
    handleCheck,
    retryAnswer,
    completed,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle
  };
}

/**
 * Manages a typing-based quiz session where users type the pinyin
 * for each flashcard.
 *
 * Matching ignores tone formatting, punctuation, and spacing. Optional
 * parenthesized syllables may be omitted, and slash-separated readings
 * are treated as alternatives.
 *
 * The check flow is two-phase:
 *   First click → check the answer and show correct/wrong feedback
 *   Second click → advance to the next card (or complete the session)
 */
export function useQuizTyping(cards: Flashcard[], sessionKey: string) {
  const { markCardReviewed, sessionProgressIndex, setSessionProgressIndex, clearSessionProgressIndex } = useAppStore();
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const replayAudioAfterAnswer = usePracticePreferencesStore((state) => state.replayAudioAfterAnswer);
  const repeatMistakes = usePracticePreferencesStore((state) => state.repeatMistakes);
  
  const [activeCards, setActiveCards] = useState<Flashcard[]>(cards);
  const [isShuffled, setIsShuffled] = useState(false);
  const canonicalOrderRef = useRef<Flashcard[]>(cards);
  const sessionKeyRef = useRef(sessionKey);
  const sessionInitializedRef = useRef(false);
  const pendingSessionCardIdRef = useRef<string | null>(null);
  const currentCardIdRef = useRef<string | null>(null);
  const gradingCardKeyRef = useRef<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  useEffect(() => {
    if (sessionKeyRef.current !== sessionKey) {
      pendingSessionCardIdRef.current = currentCardIdRef.current;
      sessionKeyRef.current = sessionKey;
      sessionInitializedRef.current = false;
      currentCardIdRef.current = null;
      canonicalOrderRef.current = [];
      setActiveCards([]);
      setIsShuffled(false);
      setCurrentIndex(0);
      setCompleted(false);
      setInput('');
      setStatus('idle');
      setSessionResults({});
      gradingCardKeyRef.current = null;
      return;
    }

    setActiveCards(cards);
    if (cards.length > 0) {
      const cardIdToRetain = sessionInitializedRef.current
        ? currentCardIdRef.current
        : pendingSessionCardIdRef.current;
      const retainCurrentCard = sessionInitializedRef.current || Boolean(
        cardIdToRetain && cards.some((card) => card.id === cardIdToRetain),
      );
      const savedIndex = retainCurrentCard ? 0 : getSessionStartIndex(
          useAppStore.getState().sessionProgressIndex,
          sessionKey,
          cards.length,
        );
      setCurrentIndex((previousIndex) => retainCurrentCard
        ? retainCurrentCardIndex(cards, cardIdToRetain, previousIndex)
        : savedIndex);
      sessionInitializedRef.current = true;
      pendingSessionCardIdRef.current = null;
    }
    setIsShuffled(false);
    canonicalOrderRef.current = cards;
  }, [cards, sessionKey]);

  useEffect(() => {
    if (activeCards.length > 0 && currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  // Save progress
  useEffect(() => {
    if (!sessionInitializedRef.current || activeCards.length === 0) return;
    setSessionProgressIndex(sessionKey, currentIndex);
  }, [activeCards.length, currentIndex, sessionKey, setSessionProgressIndex]);
  
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  // Preload audio
  useEffect(() => {
    if (activeCards.length > 0) {
      audioService.preload(activeCards.map(c => c.audio));
    }
  }, [activeCards]);

  const currentCard = activeCards[currentIndex];
  if (currentCard) currentCardIdRef.current = currentCard.id;

  // Stop audio only when the session completes or unmounts — never when
  // advancing to the next card, so the correct-answer pronunciation keeps
  // ringing through the card transition.
  useEffect(() => {
    return () => audioService.stop();
  }, [completed]);

  const toggleShuffle = useCallback(() => {
    const nextShuffled = !isShuffled;
    setActiveCards(nextShuffled ? shuffleItems(canonicalOrderRef.current) : [...canonicalOrderRef.current]);
    setCurrentIndex(0);
    setCompleted(false);
    setStatus('idle');
    setInput('');
    gradingCardKeyRef.current = null;
    setIsShuffled(nextShuffled);
  }, [isShuffled]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleCheck = () => {
    if (!input.trim()) return;

    if (status === 'correct') {
      if (currentIndex < activeCards.length - 1) {
        gradingCardKeyRef.current = null;
        setCurrentIndex(c => c + 1);
        setInput('');
        setStatus('idle');
      } else {
        clearSessionProgressIndex(sessionKey);
        setCompleted(true);
      }
      return;
    }
    
    if (!currentCard) return;

    const gradingCardKey = `${currentIndex}:${currentCard.id}`;
    if (gradingCardKeyRef.current === gradingCardKey) return;
    gradingCardKeyRef.current = gradingCardKey;

    const isCorrect = isPinyinAnswerAccepted(input, currentCard.pinyin);
    if (isCorrect && replayAudioAfterAnswer) {
      audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
    }

    setStatus(isCorrect ? 'correct' : 'wrong');
    markCardReviewed(currentCard.id, isCorrect ? 4 : 2);
    setSessionResults(prev => ({ ...prev, [currentCard.id]: isCorrect ? 4 : 2 }));
    if (!isCorrect) {
      setActiveCards((items) => queueMissedItem(items, currentCard, currentIndex, repeatMistakes));
    }
  };

  const retryAnswer = useCallback(() => {
    gradingCardKeyRef.current = null;
    setInput('');
    setStatus('idle');
  }, []);

  const resetAll = () => {
    setActiveCards(cards);
    canonicalOrderRef.current = cards;
    setIsShuffled(false);
    setCurrentIndex(0);
    setCompleted(false);
    setSessionResults({});
    setStatus('idle');
    setInput('');
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
    setCompleted(false);
    setSessionResults({});
    setStatus('idle');
    setInput('');
    gradingCardKeyRef.current = null;
  };

  const unlearnedCount = Object.values(sessionResults).filter(q => (q as number) === 1 || (q as number) === 2).length;
  const learnedCount = Object.values(sessionResults).filter(q => (q as number) > 2).length;

  return {
    activeCards,
    currentIndex,
    currentCard,
    input,
    handleInputChange,
    status,
    handleCheck,
    retryAnswer,
    completed,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle
  };
}
