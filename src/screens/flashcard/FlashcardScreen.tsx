import React, { useMemo, useRef, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { ScreenSkeleton, EmptyReviewState, ScreenLayout } from '../../lib/widgets';
import { SAMPLE_BOOKS } from '../../data/books';
import { LessonComplete } from '../../lib/widgets/LessonComplete';
import { CharacterBreakdownOverlay } from '../../lib/widgets/CharacterBreakdownOverlay';
import { useFlashcards } from './hooks/useFlashcards';
import { useFlashcardSwipe } from './hooks/useFlashcardSwipe';
import { DraggableFlashcard } from '../../lib/widgets/DraggableFlashcard';
import { useAppStore } from '../../store/useAppStore';
import { MemoryHookOverlay } from './MemoryHookOverlay';
import { audioService } from '../../services/audioService';
import { useCardFlow } from '../../hooks/useCardFlow';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import { buildPracticePartSegments } from '../../utils/practicePartSegments';

interface FlashcardScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isReviewDeck?: boolean;
  isLibraryDeck?: boolean;
  onClose?: () => void;
  onNavigateToPractice?: () => void;
}

export function FlashcardScreen({
  activeBookId,
  selectedLessons = [],
  isReviewDeck = false,
  isLibraryDeck = false,
  onClose
}: FlashcardScreenProps) {
  const activeBook = useMemo(() =>
    SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0]
  , [activeBookId]);

  const {
    cards,
    currentCard,
    currentIndex,
    maxVisitedIndex,
    isFlipped,
    setIsFlipped,
    completed,
    activeBreakdown,
    activeBreakdownIndex,
    setActiveBreakdown,
    activeMemoryHook,
    setActiveMemoryHook,
    handleNavigate,
    handleNext,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle,
    isLoading,
    error
  } = useFlashcards(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

  const { setIsInteractionActive, setSwipeFeedback } = useAppStore();
  const pronunciationRate = usePracticePreferencesStore((state) => state.pronunciationRate);
  const autoPlayAudio = usePracticePreferencesStore((state) => state.autoPlayAudio);
  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);
  const showTranslation = usePracticePreferencesStore((state) => state.showTranslation);

  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = React.useCallback((level: number) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    
    setIsInteractionActive(true);
    setSwipeFeedback({
      text: level === 3 || level === 4 ? 'Learned' : 'Review',
      type: level === 3 || level === 4 ? 'learned' : 'review'
    });

    feedbackTimeoutRef.current = setTimeout(() => {
      setSwipeFeedback(null);
      setIsInteractionActive(false);
    }, 450);
  }, [setIsInteractionActive, setSwipeFeedback]);

  const wrappedHandleNext = React.useCallback((level: number) => {
    showFeedback(level);
    handleNext(level);
  }, [handleNext, showFeedback]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      useAppStore.getState().setIsInteractionActive(false);
      useAppStore.getState().setSwipeFeedback(null);
    };
  }, []);

  const {
    direction,
    navKey,
    triggerSwipeRate,
    triggerKeyboardRate,
    triggerNav,
  } = useFlashcardSwipe(wrappedHandleNext, handleNavigate);

  const { flowStatus, pauseFlow, stopFlow, toggleFlow } = useCardFlow({
    currentCard,
    currentIndex,
    totalCount: cards.length,
    setIsFlipped,
    onAdvance: () => handleNavigate(1),
    onReplay: resetAll,
  });

  useEffect(() => {
    if (autoPlayAudio && flowStatus === 'idle' && currentCard) {
      audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
    }
  }, [autoPlayAudio, currentCard, flowStatus, pronunciationRate]);

  const restartSession = React.useCallback(() => {
    stopFlow();
    resetAll();
  }, [resetAll, stopFlow]);
  const partSegments = useMemo(
    () => (isShuffled ? [] : buildPracticePartSegments(cards)),
    [cards, isShuffled],
  );

  usePracticeHeaderRegistration({
    currentIndex,
    totalCount: cards.length,
    showLightbulb: !!currentCard,
    partSegments,
    onLightbulbClick: currentCard ? () => setActiveMemoryHook(currentCard) : undefined,
    onSettingsClick: pauseFlow,
    onShuffleClick: toggleShuffle,
    onFlowClick: toggleFlow,
    onRestartClick: restartSession,
    isShuffled,
    flowStatus,
  });

  useEffect(() => {
    if (activeBreakdown || activeMemoryHook) pauseFlow();
  }, [activeBreakdown, activeMemoryHook, pauseFlow]);

  // Refs so the keyboard handler always reads the latest values without re-registering
  const currentIndexRef = useRef(currentIndex);
  const cardsLengthRef = useRef(cards.length);
  const maxVisitedIndexRef = useRef(maxVisitedIndex);
  const currentCardRef = useRef(currentCard);
  const isReviewDeckRef = useRef(isReviewDeck);

  currentIndexRef.current = currentIndex;
  cardsLengthRef.current = cards.length;
  maxVisitedIndexRef.current = maxVisitedIndex;
  currentCardRef.current = currentCard;
  isReviewDeckRef.current = isReviewDeck;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      if (activeBreakdown || activeMemoryHook) return;
      if (e.repeat) return;

      if (['ArrowLeft', 'ArrowRight', ' ', 'm', 'M', 'n', 'N'].includes(e.key)) pauseFlow();

      const idx = currentIndexRef.current;
      const len = cardsLengthRef.current;
      const maxIdx = maxVisitedIndexRef.current;
      const card = currentCardRef.current;
      const reviewDeck = isReviewDeckRef.current;

      if (e.key === 'ArrowLeft') {
        if (idx > 0) triggerNav(-1);
      } else if (e.key === 'ArrowRight') {
        const canGoNext = !reviewDeck || idx < maxIdx;
        if (canGoNext && idx < len - 1) {
          triggerNav(1);
        } else if (canGoNext && idx === len - 1) {
          triggerNav(1);
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev: boolean) => {
          const next = !prev;
          if (next && card) audioService.play(card.audio, pronunciationRate, card.front);
          return next;
        });
      } else if (e.key === 'm' || e.key === 'M') {
        if (!card) return;
        if (!isFlipped) {
          setIsFlipped(true);
          audioService.play(card.audio, pronunciationRate, card.front);
        } else {
          triggerKeyboardRate(3, 1);
        }
      } else if (e.key === 'n' || e.key === 'N') {
        if (!card) return;
        if (!isFlipped) {
          setIsFlipped(true);
          audioService.play(card.audio, pronunciationRate, card.front);
        } else {
          triggerKeyboardRate(1, -1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBreakdown, activeMemoryHook, isFlipped, pauseFlow, pronunciationRate, triggerNav, triggerKeyboardRate, setIsFlipped]);

  if (isLoading) return <ScreenSkeleton type="flashcard" />;

  if (error) {
    return (
      <EmptyReviewState
        onClose={onClose}
        accentBg={activeBook.accentBg}
        buttonEdge={activeBook.buttonEdge}
        title="Something went wrong"
        message={error}
      />
    );
  }

  if (!error && cards.length === 0 && !completed) {
    return (
      <EmptyReviewState
        onClose={onClose}
        accentBg={activeBook.accentBg}
        buttonEdge={activeBook.buttonEdge}
        title="Nothing to study yet"
        message="We couldn't find any flashcards for this selection. Try choosing different lessons or adding cards to your library."
      />
    );
  }

  if (completed) {
    return (
      <LessonComplete
        learnedCount={learnedCount}
        unlearnedCount={unlearnedCount}
        activeBook={activeBook}
        onContinue={onClose}
        onReviewUnlearned={unlearnedCount > 0 ? reviewUnlearned : undefined}
        onResetAll={resetAll}
      />
    );
  }

  if (!currentCard && !isLoading) {
    if (isReviewDeck) {
      return (
        <EmptyReviewState
          onClose={onClose}
          accentBg={activeBook.accentBg}
          buttonEdge={activeBook.buttonEdge}
          title="You're all caught up!"
          message="No cards are due for review right now."
        />
      );
    } else {
      return (
        <EmptyReviewState
          onClose={onClose}
          accentBg={activeBook.accentBg}
          buttonEdge={activeBook.buttonEdge}
          title="Folder is Empty!"
          message="There are no flashcards here yet."
        />
      );
    }
  }

  const canNavigatePrevious = currentIndex > 0;
  const canNavigateNext = (
    (!isReviewDeck || currentIndex < maxVisitedIndex) && currentIndex < cards.length
  );

  const handleCardTap = (event: React.MouseEvent) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontalPosition = (event.clientX - bounds.left) / bounds.width;

    if (horizontalPosition <= 0.3) {
      if (canNavigatePrevious) triggerNav(-1);
      return;
    }

    if (horizontalPosition >= 0.7) {
      if (canNavigateNext) triggerNav(1);
      return;
    }

    setIsFlipped(prev => !prev);
    if (!isFlipped && currentCard) {
      audioService.play(currentCard.audio, pronunciationRate, currentCard.front);
    }
  };

  return (
    <div
      id="flashcards-screen-root"
      className="absolute inset-0 w-full h-full bg-transparent flex flex-col overflow-hidden overscroll-none pt-[72px]"
      onPointerDownCapture={pauseFlow}
    >
      <button
        type="button"
        aria-label="Previous flashcard"
        disabled={!canNavigatePrevious}
        onClick={() => triggerNav(-1)}
        className="absolute bottom-0 left-0 top-[72px] z-0 w-[22%] bg-transparent outline-none disabled:pointer-events-none"
      />
      <button
        type="button"
        aria-label="Next flashcard"
        disabled={!canNavigateNext}
        onClick={() => triggerNav(1)}
        className="absolute bottom-0 right-0 top-[72px] z-0 w-[22%] bg-transparent outline-none disabled:pointer-events-none"
      />

      <ScreenLayout maxWidth="xl" className="relative flex h-full flex-col pb-[112px] pt-2 pointer-events-none md:pb-[120px]">
        <div className="flex-1 flex flex-col justify-center pointer-events-none">
          <div
            className="relative z-10 mx-auto flex h-[420px] max-h-[60vh] w-full max-w-[320px] flex-col items-center justify-center perspective-[2000px] pointer-events-auto sm:h-[480px] sm:max-w-[400px] md:max-w-[460px]"
          >
            {/* navKey maps directly to the AnimatePresence slide effect.
                Taps/keyboard bump navKey. Swiping leaves it alone so it stays mounted. */}
            <AnimatePresence initial={false} custom={direction}>
              {currentCard && (
                <DraggableFlashcard
                  key={navKey}
                  card={currentCard}
                  direction={direction}
                  isFlipped={isFlipped}
                  setIsFlipped={setIsFlipped}
                  setActiveBreakdown={setActiveBreakdown}
                  setActiveMemoryHook={setActiveMemoryHook}
                  triggerSwipeRate={isFlipped ? triggerSwipeRate : () => setIsFlipped(true)}
                  showPinyin={showPinyin}
                  showTranslation={showTranslation}
                  onCardTap={handleCardTap}
                />
              )}
            </AnimatePresence>

          </div>
        </div>
      </ScreenLayout>

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        initialCharIndex={activeBreakdownIndex}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />

      <MemoryHookOverlay
        activeMemoryHook={activeMemoryHook}
        setActiveMemoryHook={setActiveMemoryHook}
        activeBook={activeBook}
      />
    </div>
  );
}
