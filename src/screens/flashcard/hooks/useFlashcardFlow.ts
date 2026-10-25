import { useCallback, useEffect, useMemo, useRef } from 'react';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { useCardFlow } from './useCardFlow';
import { usePracticeHeaderRegistration } from '../../../hooks/usePracticeHeaderRegistration';
import { buildPracticePartSegments } from '../../../utils/lesson/practicePartSegments';
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
  isReviewDeck: boolean;
  isLibraryDeck: boolean;
  activeBreakdown: unknown;
  completed: boolean;
  /** Missed cards coming back: the header shows its plain amber counter, not the part rail. */
  isReviewPass?: boolean;
  /** Deck finished: the header keeps only its close button. */
  isDeckDone?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
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
  isReviewDeck,
  isLibraryDeck,
  activeBreakdown,
  completed,
  isReviewPass = false,
  isDeckDone = false,
  onContinue,
  continueLabel,
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

  const partSegments = useMemo(
    () => (isReviewDeck || isLibraryDeck || isReviewPass ? [] : buildPracticePartSegments(cards)),
    [cards, isLibraryDeck, isReviewDeck, isReviewPass]
  );

  const headerCurrentIndex = progressInfo?.displayIndex ?? currentIndex;
  const headerTotalCount = progressInfo?.totalCount ?? cards.length;

  usePracticeHeaderRegistration({
    currentIndex: headerCurrentIndex,
    totalCount: headerTotalCount,
    showLightbulb: false,
    partSegments,
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

  return { wrappedHandleNext, flowStatus, pauseFlow, triggerManualReveal, autoPlayAudio };
}
