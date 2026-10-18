import { useQuizAnswerAudio } from './useQuizAnswerAudio';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { shuffleItems } from '../../../utils/srs/sessionOrder';
import { useAppStore } from '../../../store/useAppStore';
import { isPinyinAnswerAccepted } from '../../../utils/pinyin/pinyinAnswer';
import { buildAttributeChoices, getCardChoiceTarget } from '../../../utils/vocabulary/meaningChoices';
import { useCardSession } from '../../../hooks/useCardSession';
import { useAudioSessionLifecycle } from '../../../hooks/useSessionAudio';

/**
 * Manages a multiple-choice quiz session.
 *
 * For each card, 3 options are shown: the correct answer + 2 random
 * wrong answers from the same deck. The check flow is two-phase:
 *   First click → check the answer and show correct/wrong feedback
 *   Second click → advance to the next card (or complete the session)
 */
export function useQuizChoices(cards: Flashcard[], sessionKey: string) {
  const quizChoiceType = useAppStore((state) => state.quizChoiceType);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const { answerAudioPlaying, playWord, stopAnswerAudio } = useQuizAnswerAudio();
  const currentCardChoicesRef = useRef<{ cardId: string; choiceType: string; simpleDefinitions: boolean; options: Flashcard[] } | null>(null);

  const session = useCardSession(cards, sessionKey, {
    requeueMissed: false,
    onSessionReset: () => {
      stopAnswerAudio();
      currentCardChoicesRef.current = null;
      setSelectedOption(null);
      setIsChecked(false);
    },
    onAnswerStateReset: () => {
      stopAnswerAudio();
      setSelectedOption(null);
      setIsChecked(false);
    },
  });
  const { activeCards, currentIndex, currentCard, completed } = session;

  useAudioSessionLifecycle(completed);

  // Derive choices during the same render as the next card. Keeping these in an
  // effect briefly paired a new prompt with the previous prompt's answers,
  // producing a visible second render during every card transition.
  // Pinned per card ID and choiceType so background updates / tab switches never refresh choices mid-card.
  const options = useMemo(() => {
    if (!currentCard) return [];
    if (
      currentCardChoicesRef.current &&
      currentCardChoicesRef.current.cardId === currentCard.id &&
      currentCardChoicesRef.current.choiceType === quizChoiceType &&
      currentCardChoicesRef.current.simpleDefinitions === simpleDefinitions
    ) {
      return currentCardChoicesRef.current.options;
    }
    const choices = shuffleItems(buildAttributeChoices(currentCard, shuffleItems(cards), quizChoiceType, 3, simpleDefinitions));
    currentCardChoicesRef.current = { cardId: currentCard.id, choiceType: quizChoiceType, simpleDefinitions, options: choices };
    return choices;
  }, [cards, currentCard, quizChoiceType, simpleDefinitions]);

  useEffect(() => {
    stopAnswerAudio();
    setSelectedOption(null);
    setIsChecked(false);
  }, [currentCard?.id, quizChoiceType, stopAnswerAudio]);

  const correctTarget = currentCard ? getCardChoiceTarget(currentCard, quizChoiceType, simpleDefinitions) : null;
  const isCorrect = selectedOption === correctTarget;

  const recordChoiceAnswer = useCallback((option: string) => {
    if (!currentCard) return;
    if (!session.beginGrading()) return;

    setSelectedOption(option);
    setIsChecked(true);
    const correct = option === getCardChoiceTarget(currentCard, quizChoiceType, simpleDefinitions);
    if (correct) playWord(currentCard);
    session.recordAnswer(currentCard, correct ? 4 : 2);
  }, [currentCard, playWord, quizChoiceType, simpleDefinitions, session]);

  const handleCheck = () => {
    if (!selectedOption) return;

    if (isChecked) {
      stopAnswerAudio();
      setIsChecked(false); // Reset before moving to next card
      setSelectedOption(null);
      session.advanceOrComplete();
    } else {
      recordChoiceAnswer(selectedOption);
    }
  };

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
    answerAudioPlaying,
    handleCheck,
    completed,
    resumedReview: session.resumedReview,
    resetAll,
    practiceCards: session.practiceCards,
    missedCards: activeCards.filter((card) => session.sessionResults[card.id] === 1 || session.sessionResults[card.id] === 2),
    reviewUnlearned,
    unlearnedCount: session.unlearnedCount,
    learnedCount: session.learnedCount,
    isShuffled: session.isShuffled,
    toggleShuffle,
    progressInfo: session.progressInfo,
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

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const { answerAudioPlaying, playWord, stopAnswerAudio } = useQuizAnswerAudio();

  const session = useCardSession(cards, sessionKey, {
    requeueMissed: false,
    onSessionReset: () => {
      stopAnswerAudio();
      setInput('');
      setStatus('idle');
    },
    onAnswerStateReset: () => {
      stopAnswerAudio();
      setInput('');
      setStatus('idle');
    },
  });
  const { activeCards, currentIndex, currentCard, completed } = session;

  useAudioSessionLifecycle(completed);

  const handleCheck = (answerValue = input) => {
    if (!answerValue.trim()) return;

    if (status !== 'idle') {
      stopAnswerAudio();
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

    const isCorrect = isPinyinAnswerAccepted(answerValue, currentCard.pinyin);
    if (isCorrect) playWord(currentCard);

    setStatus(isCorrect ? 'correct' : 'wrong');
    session.recordAnswer(currentCard, isCorrect ? 4 : 2);
  };

  return {
    activeCards,
    currentIndex,
    currentCard,
    input,
    handleInputChange: setInput,
    status,
    answerAudioPlaying,
    handleCheck,
    completed,
    resumedReview: session.resumedReview,
    resetAll: session.resetAll,
    practiceCards: session.practiceCards,
    missedCards: activeCards.filter((card) => session.sessionResults[card.id] === 1 || session.sessionResults[card.id] === 2),
    reviewUnlearned: session.reviewUnlearned,
    unlearnedCount: session.unlearnedCount,
    learnedCount: session.learnedCount,
    isShuffled: session.isShuffled,
    toggleShuffle: session.toggleShuffle,
    progressInfo: session.progressInfo,
  };
}
