import React, { useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  onClose,
  onNavigateToPractice
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
    isLoading,
    error
  } = useFlashcards(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

  const { setPracticeHeader, setPracticeHeaderActions, setIsInteractionActive, setSwipeFeedback } = useAppStore();

  React.useEffect(() => {
    setPracticeHeader({
      progress: cards.length > 0 ? (currentIndex / cards.length) * 100 : 0,
      currentIndex,
      totalCount: cards.length,
      showLightbulb: !!currentCard
    });
    setPracticeHeaderActions({
      onLightbulbClick: currentCard ? () => setActiveMemoryHook(currentCard) : undefined,
      onSettingsClick: () => {}
    });
  }, [currentIndex, cards.length, currentCard, setActiveMemoryHook, setPracticeHeader, setPracticeHeaderActions]);

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
          if (next && card) audioService.play(card.audio, 1.0, card.front);
          return next;
        });
      } else if (e.key === 'm' || e.key === 'M') {
        if (card) triggerKeyboardRate(3, 1);
      } else if (e.key === 'n' || e.key === 'N') {
        if (card) triggerKeyboardRate(1, -1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerNav, triggerKeyboardRate, setIsFlipped]);

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

  return (
    <div id="flashcards-screen-root" className="absolute inset-0 w-full h-full bg-[#F7F7F7] flex flex-col overflow-hidden overscroll-none pt-[72px]">
      {/* Full-Screen Split Tap Zones */}
      <div className="absolute inset-0 pt-[76px] z-20 pointer-events-none flex">
        <div
          className="h-full cursor-pointer pointer-events-auto"
          style={{ width: '35%' }}
          onClick={() => {
            if (currentIndex > 0) triggerNav(-1);
          }}
        />
        <div className="h-full pointer-events-none" style={{ width: '30%' }} />
        <div
          className="h-full cursor-pointer pointer-events-auto"
          style={{ width: '35%' }}
          onClick={() => {
            const canGoNext = !isReviewDeck || currentIndex < maxVisitedIndex;
            if (canGoNext && currentIndex < cards.length) triggerNav(1);
          }}
        />
      </div>

      {/* Center flip zone */}
      <div
        className="absolute z-[5] pointer-events-auto"
        style={{ top: '76px', left: '35%', width: '30%', height: 'calc(100% - 76px)' }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.ignore-tap')) return;
          setIsFlipped((prev: boolean) => !prev);
          if (!isFlipped && currentCard) {
            audioService.play(currentCard.audio, 1.0, currentCard.front);
          }
        }}
      />

      <ScreenLayout maxWidth="xl" className="relative h-full pt-2 pointer-events-none flex flex-col pb-[120px]">
        <div className="flex-1 flex flex-col justify-center pointer-events-none">
          <div
            className="w-full h-[420px] sm:h-[480px] max-h-[60vh] max-w-[320px] sm:max-w-[400px] md:max-w-[460px] mx-auto flex flex-col items-center justify-center relative perspective-[2000px] z-10 pointer-events-auto"
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
                  triggerSwipeRate={triggerSwipeRate}
                  onCardTap={() => {
                    setIsFlipped(prev => !prev);
                    if (!isFlipped && currentCard) {
                      audioService.play(currentCard.audio, 1.0, currentCard.front);
                    }
                  }}
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
