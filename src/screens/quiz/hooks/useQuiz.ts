import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import { shuffleItems } from '../../../utils/sessionOrder';
import { usePracticePreferencesStore } from '../../../store/usePracticePreferencesStore';
import { isPinyinAnswerAccepted } from '../../../utils/pinyinAnswer';
import { buildMeaningChoices } from '../../../utils/meaningChoices';
import { useCardSession } from '../../../hooks/useCardSession';

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
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const replayAudioAfterAnswer = usePracticePreferencesStore((state) => state.replayAudioAfterAnswer);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const currentCardChoicesRef = useRef<{ cardId: string; options: Flashcard[] } | null>(null);

  const session = useCardSession(cards, sessionKey, {
    onSessionReset: () => {
      currentCardChoicesRef.current = null;
      setSelectedOption(null);
      setIsChecked(false);
    },
    onAnswerStateReset: () => {
      setSelectedOption(null);
      setIsChecked(false);
    },
  });
  const { activeCards, currentIndex, currentCard, completed } = session;

  // Preload audio
  useEffect(() => {
    if (activeCards.length > 0) {
      audioService.preload(activeCards.map(c => c.audio));
    }
  }, [activeCards]);

  // Stop audio only when the session completes or unmounts — never when
  // advancing to the next card, so the correct-answer pronunciation keeps
  // ringing through the card transition.
  useEffect(() => {
    return () => audioService.stop();
  }, [completed]);

  // Derive choices during the same render as the next card. Keeping these in an
  // effect briefly paired a new prompt with the previous prompt's answers,
  // producing a visible second render during every card transition.
  // Pinned per card ID so background updates / tab switches never refresh choices mid-card.
  const options = useMemo(() => {
    if (!currentCard) return [];
    if (currentCardChoicesRef.current && currentCardChoicesRef.current.cardId === currentCard.id) {
      return currentCardChoicesRef.current.options;
    }
    const choices = shuffleItems(buildMeaningChoices(currentCard, shuffleItems(cards)));
    currentCardChoicesRef.current = { cardId: currentCard.id, options: choices };
    return choices;
  }, [cards, currentCard]);

  useEffect(() => {
    setSelectedOption(null);
    setIsChecked(false);
  }, [currentCard?.id]);

  const isCorrect = selectedOption === currentCard?.back;

  const recordChoiceAnswer = useCallback((option: string) => {
    if (!currentCard) return;
    if (!session.beginGrading()) return;

    setSelectedOption(option);
    setIsChecked(true);
    const correct = option === currentCard.back;
    if (correct && replayAudioAfterAnswer) {
      audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
    }
    session.recordAnswer(currentCard, correct ? 4 : 2);
  }, [currentCard, pronunciationRate, replayAudioAfterAnswer, session]);

  const handleCheck = () => {
    if (!selectedOption) return;

    if (isChecked) {
      if (!isCorrect) return;
      setIsChecked(false); // Reset before moving to next card
      setSelectedOption(null);
      session.advanceOrComplete();
    } else {
      recordChoiceAnswer(selectedOption);
    }
  };

  const retryAnswer = useCallback(() => {
    if (!isChecked || isCorrect) return;
    session.clearGrading();
    setIsChecked(false);
    setSelectedOption(null);
  }, [isChecked, isCorrect, session]);

  const toggleShuffle = useCallback(() => {
    currentCardChoicesRef.current = null;
    session.toggleShuffle();
  }, [session]);

  const resetAll = useCallback(() => {
    currentCardChoicesRef.current = null;
    session.resetAll();
  }, [session]);

  const reviewUnlearned = useCallback(() => {
    currentCardChoicesRef.current = null;
    session.reviewUnlearned();
  }, [session]);

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
    unlearnedCount: session.unlearnedCount,
    learnedCount: session.learnedCount,
    isShuffled: session.isShuffled,
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
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const replayAudioAfterAnswer = usePracticePreferencesStore((state) => state.replayAudioAfterAnswer);

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const session = useCardSession(cards, sessionKey, {
    onSessionReset: () => {
      setInput('');
      setStatus('idle');
    },
    onAnswerStateReset: () => {
      setInput('');
      setStatus('idle');
    },
  });
  const { activeCards, currentIndex, currentCard, completed } = session;

  // Preload audio
  useEffect(() => {
    if (activeCards.length > 0) {
      audioService.preload(activeCards.map(c => c.audio));
    }
  }, [activeCards]);

  // Stop audio only when the session completes or unmounts — never when
  // advancing to the next card, so the correct-answer pronunciation keeps
  // ringing through the card transition.
  useEffect(() => {
    return () => audioService.stop();
  }, [completed]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleCheck = () => {
    if (!input.trim()) return;

    if (status === 'correct') {
      const outcome = session.advanceOrComplete();
      if (outcome === 'advanced') {
        session.clearGrading();
        setInput('');
        setStatus('idle');
      }
      return;
    }

    if (!currentCard) return;
    if (!session.beginGrading()) return;

    const isCorrect = isPinyinAnswerAccepted(input, currentCard.pinyin);
    if (isCorrect && replayAudioAfterAnswer) {
      audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
    }

    setStatus(isCorrect ? 'correct' : 'wrong');
    session.recordAnswer(currentCard, isCorrect ? 4 : 2);
  };

  const retryAnswer = useCallback(() => {
    session.clearGrading();
    setInput('');
    setStatus('idle');
  }, [session]);

  const resetAll = useCallback(() => {
    session.resetAll();
  }, [session]);

  const reviewUnlearned = useCallback(() => {
    session.reviewUnlearned();
  }, [session]);

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
    unlearnedCount: session.unlearnedCount,
    learnedCount: session.learnedCount,
    isShuffled: session.isShuffled,
    toggleShuffle: session.toggleShuffle
  };
}
