import { useQuizAnswerAudio } from './useQuizAnswerAudio';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { shuffleItems } from '../../../utils/srs/sessionOrder';
import { useAppStore } from '../../../store/useAppStore';
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
/** Review quizzes: count toward today's daily review, and draw wrong answers from more words than the few asked. */
export interface QuizReviewOptions {
  daily?: boolean;
  extraCards?: readonly Flashcard[];
}

export function useQuizChoices(cards: Flashcard[], sessionKey: string, review: QuizReviewOptions = {}) {
  const quizChoiceType = useAppStore((state) => state.quizChoiceType);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const { answerAudioPlaying, playWord, stopAnswerAudio } = useQuizAnswerAudio();
  const currentCardChoicesRef = useRef<{ cardId: string; choiceType: string; simpleDefinitions: boolean; options: Flashcard[] } | null>(null);

  // A new session, shuffle, reset or review round also draws fresh choices.
  const resetAnswer = () => {
    stopAnswerAudio();
    currentCardChoicesRef.current = null;
    setSelectedOption(null);
    setIsChecked(false);
  };
  const session = useCardSession(cards, sessionKey, {
    requeueMissed: false, daily: review.daily, source: review.daily ? 'daily' : undefined,
    onSessionReset: resetAnswer, onAnswerStateReset: resetAnswer,
  });
  const { extraCards } = review;
  const choicePool = useMemo(() => (extraCards?.length ? [...cards, ...extraCards] : cards), [cards, extraCards]);
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
    const choices = shuffleItems(buildAttributeChoices(currentCard, shuffleItems(choicePool), quizChoiceType, 3, simpleDefinitions));
    currentCardChoicesRef.current = { cardId: currentCard.id, choiceType: quizChoiceType, simpleDefinitions, options: choices };
    return choices;
  }, [choicePool, currentCard, quizChoiceType, simpleDefinitions]);

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
