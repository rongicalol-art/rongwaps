import { useCallback, useEffect, useRef } from 'react';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { useCardFlow } from './useCardFlow';
import { usePracticeHeaderRegistration } from '../../../hooks/usePracticeHeaderRegistration';
import type { Flashcard } from '../../../data/flashcards';

import type { CardSessionProgressInfo } from '../../../utils/srs/mistakeQueue';

interface UseFlashcardFlowProps {
  cards: Flashcard[];
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
  activeBreakdown: unknown;
  completed: boolean;
  /** Deck finished: the header keeps only its close button. */
  isDeckDone?: boolean;
  /** Flow loops: at the last card it returns here instead of ending. */
  goToStart: () => void;
}

export function useFlashcardFlow({
  cards,
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
  activeBreakdown,
  completed,
  isDeckDone = false,
  goToStart,
}: UseFlashcardFlowProps) {
  const setSwipeFeedback = useAppStore((state) => state.setSwipeFeedback);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback(
    (level: number) => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      setSwipeFeedback({
        text: level >= 3 ? 'Got it' : level === 2 ? 'Hard' : 'Again',
        type: level >= 3 ? 'learned' : 'review',
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

  const { flowStatus, pauseFlow, stopFlow, toggleFlow } = useCardFlow({
    currentCard: currentCard ?? undefined,
    currentIndex,
    totalCount: cards.length,
    setIsFlipped,
    onAdvance: () => handleNavigate(1),
    onReplay: goToStart,
  });

  // Only a flow that is playing owns the audio. Idle, paused or finished: a flip plays the card itself.
  // The status is read through a ref so pausing flow on an already-flipped card does not replay it.
  const flowStatusRef = useRef(flowStatus);
  flowStatusRef.current = flowStatus;
  useEffect(() => {
    if (flowStatusRef.current === 'playing' || !isFlipped || !currentCard) return;
    if (!autoPlayAudio && !manualRevealAudioRef.current) return;
    manualRevealAudioRef.current = false;
    audioService.playCard(currentCard, pronunciationRate, { overlap: true });
  }, [autoPlayAudio, currentCard, isFlipped, pronunciationRate]);

  useEffect(() => {
    manualRevealAudioRef.current = false;
  }, [currentCard?.id]);

  const restartSession = useCallback(() => {
    stopFlow();
    resetAll();
    useAppStore.getState().showFeedbackToast('Restarted');
  }, [resetAll, stopFlow]);

  const headerCurrentIndex = progressInfo?.displayIndex ?? currentIndex;
  const headerTotalCount = progressInfo?.totalCount ?? cards.length;

  usePracticeHeaderRegistration({
    currentIndex: headerCurrentIndex,
    totalCount: headerTotalCount,
    showLightbulb: false,
    isRetry: progressInfo?.isRetry,
    cleanupPhase: progressInfo?.cleanupPhase,
    minimal: isDeckDone,
    onShuffleClick: toggleShuffle,
    onFlowClick: toggleFlow,
    onRestartClick: restartSession,
    isShuffled,
    flowStatus,
  });

  useEffect(() => {
    if (!activeBreakdown) return;
    pauseFlow();
    audioService.stop();
  }, [activeBreakdown, pauseFlow]);

  useEffect(() => {
    if (!completed) return;
    audioService.stop();
  }, [completed]);

  const triggerManualReveal = useCallback(() => {
    manualRevealAudioRef.current = true;
  }, []);

  return { wrappedHandleNext, flowStatus, pauseFlow, toggleFlow, triggerManualReveal, autoPlayAudio };
}
