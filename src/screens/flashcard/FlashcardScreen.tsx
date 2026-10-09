import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { EdgeNavButtons } from '../../lib/widgets';
import { EmptyReviewState } from '../../features/practice';
import { SAMPLE_BOOKS } from '../../data/books';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { prefetchFlashcardExtras, useFlashcardExtras } from '../../features/flashcards';
import { useFlashcards } from './hooks/useFlashcards';
import { useFlashcardSwipe } from './hooks/useFlashcardSwipe';
import { DraggableFlashcard } from './components/DraggableFlashcard';
import { FlashcardAnswerBar } from './components/FlashcardAnswerBar';
import { DeckComplete } from './components/DeckComplete';
import { ReviewDealIntro } from './components/ReviewDealIntro';
import { cn } from '../../utils/cn';
import { useAppStore } from '../../store/useAppStore';
import { useFlashcardKeyboardShortcuts } from './hooks/useFlashcardKeyboardShortcuts';
import { useFlashcardFlow } from './hooks/useFlashcardFlow';

interface FlashcardScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isReviewDeck?: boolean;
  isLibraryDeck?: boolean;
  onClose?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  /** Quizzes the same words; offered at the end of a round. */
  onStartQuiz?: () => void;
}

export function FlashcardScreen({
  activeBookId,
  selectedLessons = [],
  isReviewDeck = false,
  isLibraryDeck = false,
  onClose,
  onContinue,
  continueLabel,
  onStartQuiz,
}: FlashcardScreenProps) {
  const activeBook = useMemo(
    () => SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0],
    [activeBookId]
  );

  const {
    cards,
    missedCards,
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
    resetAll: resetDeck,
    reviewUnlearned,
    learnedCount,
    isShuffled,
    toggleShuffle,
    progressInfo,
    isLoading,
    error,
  } = useFlashcards(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

  const showPinyin = useAppStore((state) => state.showPinyin);
  const toneColors = useAppStore((state) => state.toneColors);
  const showTranslation = useAppStore((state) => state.showTranslation);

  // Missed cards come back automatically: after the first pass, then again until a pass has no misses.
  const [reviewPass, setReviewPass] = useState(0);
  const [introActive, setIntroActive] = useState(false);
  /** The first review card has landed: the real deck is shown while the overlay finishes. */
  const [introLanded, setIntroLanded] = useState(false);
  const [dealStarted, setDealStarted] = useState(false);
  /** Size of the pass that just ended: the header shows that finished deck during the intro. */
  const [finishedPassSize, setFinishedPassSize] = useState(0);
  const firstPassRef = useRef<{ total: number; correct: number } | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const isReviewPass = reviewPass > 0;
  const missedCount = missedCards.length;

  useEffect(() => {
    if (currentCard && startedAtRef.current === null) startedAtRef.current = Date.now();
  }, [currentCard]);

  useEffect(() => {
    if (!completed || missedCount === 0) return;
    firstPassRef.current ??= { total: cards.length, correct: learnedCount };
    reviewUnlearned();
    setReviewPass((pass) => pass + 1);
    setFinishedPassSize(cards.length);
    setDealStarted(false);
    setIntroLanded(false);
    setIntroActive(true);
  }, [cards.length, completed, learnedCount, missedCount, reviewUnlearned]);

  const resetAll = useCallback(() => {
    firstPassRef.current = null;
    startedAtRef.current = null;
    setReviewPass(0);
    setIntroActive(false);
    resetDeck();
  }, [resetDeck]);

  const isDeckDone = completed && missedCount === 0;

  // The whole app turns warm for review passes (the intro included).
  useEffect(() => {
    if (!isReviewPass || isDeckDone) return undefined;
    const root = document.documentElement;
    root.dataset.practiceTone = 'review';
    return () => { delete root.dataset.practiceTone; };
  }, [isDeckDone, isReviewPass]);

  const reviewProgress = useMemo(
    () => (isReviewPass && introActive && !dealStarted && finishedPassSize > 0
      ? { displayIndex: finishedPassSize - 1, totalCount: finishedPassSize, isRetry: false, cleanupPhase: null }
      : isReviewPass && !isDeckDone
      ? {
        displayIndex: currentIndex,
        totalCount: cards.length,
        isRetry: false,
        cleanupPhase: { currentIndex, totalCount: cards.length },
      }
      : progressInfo),
    [cards.length, currentIndex, dealStarted, finishedPassSize, introActive, isDeckDone, isReviewPass, progressInfo],
  );

  const { wrappedHandleNext, pauseFlow, triggerManualReveal, autoPlayAudio } = useFlashcardFlow({
    cards,
    currentCard,
    currentIndex,
    progressInfo: reviewProgress,
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
    isReviewPass,
    isDeckDone,
    onContinue,
    continueLabel,
  });

  const handleCardTap = useCallback(() => {
    if (!isFlipped && currentCard && !autoPlayAudio) triggerManualReveal();
    setIsFlipped((prev) => !prev);
  }, [autoPlayAudio, currentCard, isFlipped, setIsFlipped, triggerManualReveal]);

  const { isLoading: isContentLoading } = useFlashcardExtras(currentCard);
  useEffect(() => {
    if (!isContentLoading) prefetchFlashcardExtras(cards, currentIndex);
  }, [isContentLoading, cards, currentIndex]);

  const { direction, triggerSwipeRate, triggerKeyboardRate, triggerNav } = useFlashcardSwipe(
    wrappedHandleNext,
    handleNavigate,
    currentIndex,
  );

  useFlashcardKeyboardShortcuts({
    completed,
    isIntroActive: introActive,
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

  if (isLoading && cards.length === 0) return null;

  if (error || (cards.length === 0 && !completed) || (!currentCard && !isLoading)) {
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

  if (isDeckDone) {
    const first = firstPassRef.current ?? { total: cards.length, correct: learnedCount };
    const seconds = Math.max(1, Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000));
    const quiz = onStartQuiz;
    return (
      <DeckComplete
        wordCount={first.total}
        firstTryPct={Math.round((first.correct / Math.max(1, first.total)) * 100)}
        seconds={seconds}
        isPerfect={first.correct === first.total}
        actionLabel={quiz ? 'Test me' : 'Continue'}
        onContinue={quiz ?? onContinue ?? onClose ?? (() => {})}
      />
    );
  }

  const canNavigatePrevious = currentIndex > 0;
  const canNavigateNext =
    (!isReviewDeck || currentIndex < maxVisitedIndex) && currentIndex < cards.length;

  return (
    <div
      id="flashcards-screen-root"
      className={cn(
        'absolute inset-0 flex h-full w-full flex-col overflow-hidden overscroll-none bg-transparent pt-[72px]',
      )}
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

      <div ref={stageRef} className="relative flex min-h-0 w-full flex-1 flex-col border-t-2 border-ui-divider">
        <div aria-hidden className="absolute inset-0 z-0 flex">
          <div className="h-full w-1/2" onClick={() => canNavigatePrevious && triggerNav(-1)} />
          <div className="h-full w-1/2" onClick={() => canNavigateNext && triggerNav(1)} />
        </div>
        <div data-fc-cardarea className={cn(
            'pointer-events-none relative mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col justify-center px-4 py-5 sm:px-8 xl:max-w-3xl 2xl:max-w-4xl',
            introActive && !introLanded && 'opacity-0',
          )}
        >
          <div className="pointer-events-none relative z-10 h-[min(clamp(26rem,62dvh,40rem),100%)] min-h-0 w-full shrink [container-type:size]">
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              {currentCard && (
                <DraggableFlashcard
                  key={`${currentCard.id}-${currentIndex}`}
                  card={currentCard}
                  direction={direction}
                  isFlipped={isFlipped}
                  setActiveBreakdown={setActiveBreakdown}
                  triggerSwipeRate={triggerSwipeRate}
                  showPinyin={showPinyin}
                  toneColors={toneColors}
                  showTranslation={showTranslation}
                  onCardTap={handleCardTap}
                  tone={isReviewPass ? 'review' : 'default'}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
        <FlashcardAnswerBar
          tone={isReviewPass ? 'review' : 'default'}
          concealed={introActive && !introLanded}
          isFlipped={isFlipped}
          onFlip={handleCardTap}
          onAgain={() => triggerKeyboardRate(1, 1)}
          onGotIt={() => triggerKeyboardRate(3, -1)}
        />
        {introActive && (
          <ReviewDealIntro
            key={reviewPass}
            cards={cards}
            pass={reviewPass}
            stageRef={stageRef}
            onLanded={() => setIntroLanded(true)}
            onDone={() => setIntroActive(false)}
            onDealStart={() => setDealStarted(true)}
          />
        )}
      </div>

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        initialCharIndex={activeBreakdownIndex}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />
    </div>
  );
}
