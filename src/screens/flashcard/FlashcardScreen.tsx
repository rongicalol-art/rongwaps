import { useCallback, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { EdgeNavButtons, ScreenSkeleton, ScreenLayout } from '../../lib/widgets';
import { EmptyReviewState, LessonComplete } from '../../features/practice';
import { SAMPLE_BOOKS } from '../../data/books';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { useFlashcards } from './hooks/useFlashcards';
import { useFlashcardSwipe } from './hooks/useFlashcardSwipe';
import { DraggableFlashcard } from './components/DraggableFlashcard';
import { FlashcardList } from './components/FlashcardList';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import { useDeckExclusionActions } from '../../hooks/useDeckExclusionActions';
import { useFlashcardKeyboardShortcuts } from './hooks/useFlashcardKeyboardShortcuts';
import { useFlashcardFlow } from './hooks/useFlashcardFlow';

export type FlashcardViewMode = 'cards' | 'list';

interface FlashcardScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isReviewDeck?: boolean;
  isLibraryDeck?: boolean;
  mode?: FlashcardViewMode;
  onClose?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  onNavigateToPractice?: () => void;
}

export function FlashcardScreen({
  activeBookId,
  selectedLessons = [],
  isReviewDeck = false,
  isLibraryDeck = false,
  mode = 'cards',
  onClose,
  onContinue,
  continueLabel,
}: FlashcardScreenProps) {
  const activeBook = useMemo(
    () => SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0],
    [activeBookId]
  );

  const {
    cards,
    deckCards,
    currentCard,
    currentIndex,
    maxVisitedIndex,
    isFlipped,
    setIsFlipped,
    completed,
    activeBreakdown,
    activeBreakdownIndex,
    setActiveBreakdown,
    handleNavigate,
    handleNext,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle,
    progressInfo,
    deckExclusionKey,
    excludedIds,
    isLoading,
    error,
  } = useFlashcards(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

  const { toggleCard, resetDeckExclusions } = useDeckExclusionActions(deckExclusionKey);
  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);
  const showTranslation = usePracticePreferencesStore((state) => state.showTranslation);

  const { wrappedHandleNext, pauseFlow, triggerManualReveal, autoPlayAudio } = useFlashcardFlow({
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
  });

  const handleCardTap = useCallback(() => {
    if (!isFlipped && currentCard && !autoPlayAudio) triggerManualReveal();
    setIsFlipped((prev) => !prev);
  }, [autoPlayAudio, currentCard, isFlipped, setIsFlipped, triggerManualReveal]);

  const { direction, triggerSwipeRate, triggerKeyboardRate, triggerNav } = useFlashcardSwipe(
    wrappedHandleNext,
    handleNavigate,
    currentIndex,
  );

  useFlashcardKeyboardShortcuts({
    completed,
    mode,
    activeBreakdown,
    currentIndex,
    maxVisitedIndex,
    cardsLength: cards.length,
    currentCard,
    isReviewDeck,
    autoPlayAudio,
    pauseFlow,
    triggerNav,
    triggerKeyboardRate,
    setIsFlipped,
    onManualRevealAudio: triggerManualReveal,
  });

  if (isLoading && cards.length === 0) return <ScreenSkeleton type="flashcard" />;

  if (
    error ||
    (cards.length === 0 && !completed && mode === 'cards') ||
    (!currentCard && !isLoading && mode === 'cards')
  ) {
    const emptyTitle = error
      ? 'Something went wrong'
      : cards.length === 0
      ? 'Nothing to study yet'
      : isReviewDeck
      ? "You're all caught up!"
      : 'Folder is Empty!';
    const emptyMessage = error
      ? error
      : cards.length === 0
      ? "We couldn't find any flashcards for this selection. Try choosing different lessons or adding cards to your library."
      : isReviewDeck
      ? 'No cards are due for review right now.'
      : 'There are no flashcards here yet.';

    return (
      <EmptyReviewState
        onClose={onClose}
        accentBg={activeBook.accentBg}
        buttonEdge={activeBook.buttonEdge}
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  if (completed) {
    return (
      <LessonComplete
        learnedCount={learnedCount}
        unlearnedCount={unlearnedCount}
        onContinue={onContinue ?? onClose}
        continueLabel={onContinue ? continueLabel : undefined}
        onReviewUnlearned={unlearnedCount > 0 ? reviewUnlearned : undefined}
        onResetAll={resetAll}
      />
    );
  }

  const canNavigatePrevious = currentIndex > 0;
  const canNavigateNext =
    (!isReviewDeck || currentIndex < maxVisitedIndex) && currentIndex < cards.length;

  if (mode === 'list') {
    return (
      <FlashcardList
        cards={deckCards}
        excludedIds={excludedIds}
        onToggleCard={toggleCard}
        onResetExclusions={resetDeckExclusions}
        accentColor={activeBook.accent}
        edgeHex={activeBook.edgeHex}
      />
    );
  }

  return (
    <div
      id="flashcards-screen-root"
      className="absolute inset-0 flex h-full w-full flex-col overflow-hidden overscroll-none bg-transparent pt-[72px]"
      onPointerDownCapture={pauseFlow}
    >
      <EdgeNavButtons
        onPrevious={() => triggerNav(-1)}
        onNext={() => triggerNav(1)}
        canNavigatePrevious={canNavigatePrevious}
        canNavigateNext={canNavigateNext}
        previousLabel="Previous flashcard"
        nextLabel="Next flashcard"
      />

      <ScreenLayout
        maxWidth="none"
        className="pointer-events-none relative flex h-full max-w-[760px] flex-col items-center justify-center pb-dock-clearance pt-2"
      >
        <div className="pointer-events-none flex flex-1 w-full flex-col items-center justify-center">
          <div className="pointer-events-none relative z-10 mx-auto flex h-full max-h-[min(520px,calc(100dvh-170px))] w-full max-w-[680px] flex-col items-center justify-center px-4">
            <AnimatePresence initial={false} custom={direction}>
              {currentCard && (
                <DraggableFlashcard
                  key={`${currentCard.id}-${currentIndex}`}
                  card={currentCard}
                  direction={direction}
                  isFlipped={isFlipped}
                  setActiveBreakdown={setActiveBreakdown}
                  triggerSwipeRate={triggerSwipeRate}
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
    </div>
  );
}
