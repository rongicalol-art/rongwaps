import { useCallback, useEffect, useMemo, useRef } from 'react';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { useCardFlow } from './useCardFlow';
import { usePracticeHeaderRegistration } from '../../../hooks/usePracticeHeaderRegistration';
import { buildPracticePartSegments } from '../../../utils/practicePartSegments';
import type { Flashcard } from '../../../data/flashcards';

import type { CardSessionProgressInfo } from '../../../utils/mistakeQueue';

interface UseFlashcardFlowProps {
  cards: Flashcard[];
  deckCards: Flashcard[];
  currentCard: Flashcard | null;
  currentIndex: number;
  progressInfo?: CardSessionProgressInfo;
  isFlipped: boolean;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  handleNavigate: (offset: number) => void;
  handleNext: (level: number) => void;
  resetAll: () => void;
  isShuffled: boolean;
  toggleShuffle: () => void;
  isReviewDeck: boolean;
  isLibraryDeck: boolean;
  activeBreakdown: unknown;
  mode: string;
  completed: boolean;
  onContinue?: () => void;
  continueLabel?: string;
}

export function useFlashcardFlow({
  cards,
  deckCards,
  currentCard,
  currentIndex,
  progressInfo,
  isFlipped,
  setIsFlipped,
  handleNavigate,
  handleNext,
  resetAll,
  isShuffled,
  toggleShuffle,
  isReviewDeck,
  isLibraryDeck,
  activeBreakdown,
  mode,
  completed,
  onContinue,
  continueLabel,
}: UseFlashcardFlowProps) {
  const setSwipeFeedback = useAppStore((state) => state.setSwipeFeedback);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback(
    (level: number) => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      setSwipeFeedback({
        text: level === 3 || level === 4 ? 'Learned' : 'Review',
        type: level === 3 || level === 4 ? 'learned' : 'review',
      });
      feedbackTimeoutRef.current = setTimeout(() => {
        setSwipeFeedback(null);
      }, 450);
    },
    [setSwipeFeedback]
  );

  const wrappedHandleNext = useCallback(
    (level: number) => {
      showFeedback(level);
      handleNext(level);
    },
    [handleNext, showFeedback]
  );

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      useAppStore.getState().setSwipeFeedback(null);
    };
  }, []);

  const pronunciationRate = useAppStore((state) => state.pronunciationRate);
  const autoPlayAudio = useAppStore((state) => state.autoPlayAudio);
  const manualRevealAudioRef = useRef(false);

  const handleFinishSetInFlow = useCallback(() => {
    if (onContinue) {
      if (continueLabel) {
        const cleaned = continueLabel.replace(/^Continue\s*\(?/, '').replace(/\)?$/, '').trim();
        if (cleaned) {
          setSwipeFeedback({ text: cleaned, type: 'learned' });
          setTimeout(() => setSwipeFeedback(null), 800);
        }
      }
      onContinue();
    } else {
      setSwipeFeedback({ text: 'Replaying Deck', type: 'learned' });
      setTimeout(() => setSwipeFeedback(null), 800);
      resetAll();
    }
  }, [continueLabel, onContinue, resetAll, setSwipeFeedback]);

  const { flowStatus, pauseFlow, stopFlow, toggleFlow } = useCardFlow({
    currentCard: currentCard ?? undefined,
    currentIndex,
    totalCount: cards.length,
    setIsFlipped,
    onAdvance: () => handleNavigate(1),
    onReplay: resetAll,
    onFinishSet: handleFinishSetInFlow,
  });

  useEffect(() => {
    if (flowStatus !== 'idle' || !isFlipped || !currentCard) return;
    if (!autoPlayAudio && !manualRevealAudioRef.current) return;
    manualRevealAudioRef.current = false;
    audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
  }, [autoPlayAudio, currentCard, flowStatus, isFlipped, pronunciationRate]);

  useEffect(() => {
    manualRevealAudioRef.current = false;
  }, [currentCard?.id]);

  const restartSession = useCallback(() => {
    stopFlow();
    resetAll();
  }, [resetAll, stopFlow]);

  const partSegments = useMemo(
    () => (isShuffled || isReviewDeck || isLibraryDeck ? [] : buildPracticePartSegments(cards)),
    [cards, isLibraryDeck, isReviewDeck, isShuffled]
  );

  const headerCurrentIndex = mode === 'list'
    ? Math.max(cards.length - 1, -1)
    : (progressInfo?.displayIndex ?? currentIndex);
  const headerTotalCount = mode === 'list'
    ? deckCards.length
    : (progressInfo?.totalCount ?? cards.length);

  usePracticeHeaderRegistration({
    currentIndex: headerCurrentIndex,
    totalCount: headerTotalCount,
    showLightbulb: false,
    partSegments,
    isRetry: progressInfo?.isRetry,
    cleanupPhase: progressInfo?.cleanupPhase,
    onShuffleClick: toggleShuffle,
    onFlowClick: toggleFlow,
    onRestartClick: restartSession,
    isShuffled,
    flowStatus,
  });

  useEffect(() => {
    if (activeBreakdown || mode === 'list') pauseFlow();
  }, [activeBreakdown, mode, pauseFlow]);

  useEffect(() => {
    if (!completed) return;
    audioService.stop();
  }, [completed]);

  const triggerManualReveal = useCallback(() => {
    manualRevealAudioRef.current = true;
  }, []);

  return { wrappedHandleNext, flowStatus, pauseFlow, triggerManualReveal, autoPlayAudio };
}
