import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Flashcard } from '../../data/flashcards';
import { EdgeNavButtons } from '../../lib/widgets';
import { EmptyReviewState, SessionComplete, type SessionStats } from '../../features/practice';
import { SAMPLE_BOOKS } from '../../data/books';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { prefetchFlashcardExtras, useFlashcardExtras } from '../../features/flashcards';
import { useFlashcards } from './hooks/useFlashcards';
import { useFlashcardSwipe } from './hooks/useFlashcardSwipe';
import { DraggableFlashcard } from './components/DraggableFlashcard';
import { FlashcardAnswerBar } from './components/FlashcardAnswerBar';
import { CardsDone } from './components/CardsDone';
import type { QuizTypeId } from '../../utils/vocabulary/quizDirector';
import { ReviewDealIntro } from './components/ReviewDealIntro';
import { cn } from '../../utils/cn';
import { useReviewTone } from '../../hooks/useReviewTone';
import { useAppStore } from '../../store/useAppStore';
import { useFlashcardKeyboardShortcuts } from './hooks/useFlashcardKeyboardShortcuts';
import { useFlashcardFlow } from './hooks/useFlashcardFlow';
import { groupRankedExamples } from '../../utils/vocabulary/courseExamples';
import { playSentence } from '../../services/audio/sentenceAudio';

interface FlashcardScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isReviewDeck?: boolean;
  isLibraryDeck?: boolean;
  isIndependentStudy?: boolean;
  onClose?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  /** Quizzes the same words; offered at the end of a round. `types` is the Cards done pick ([] = Mixed). */
  onStartQuiz?: (types: QuizTypeId[], stats: SessionStats) => void;
  /** Cards done shows this word first in its sheet. */
  quizFirstId?: string;
  /** The lesson's full deck; used when the first pass isn't in memory (a session reopened mid-review). */
  sessionDeck?: Flashcard[];
  /** The card's pencil switches to writing mode. */
  onOpenWriting?: () => void;
}

/** Up to six words for the Cards done sheet: the quiz's first word, then deck order; the answered card is always last. */
function sheetCards(deck: Flashcard[], last: Flashcard, firstId?: string) {
  const others = deck.filter((card) => card.id !== last.id);
  const first = others.find((card) => card.id === firstId);
  const picked = first ? [first, ...others.filter((card) => card !== first)] : others;
  return [...picked.slice(0, 5), last];
}

export function FlashcardScreen({
  activeBookId,
  selectedLessons = [],
  isReviewDeck = false,
  isLibraryDeck = false,
  isIndependentStudy = false,
  onClose,
  onContinue,
  continueLabel,
  onStartQuiz,
  quizFirstId,
  sessionDeck,
  onOpenWriting,
}: FlashcardScreenProps) {
  const activeBook = useMemo(
    () => SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0],
    [activeBookId]
  );

  const {
    cards,
    isExtraReview,
    missedCards,
    trickyCards,
    currentCard,
    currentIndex,
    maxVisitedIndex,
    isFlipped,
    setIsFlipped,
    completed,
    practiceOnly,
    resumedReview,
    activeBreakdown,
    activeBreakdownIndex,
    setActiveBreakdown,
    handleNavigate,
    handleNext,
    resetAll: resetDeck,
    restartSession: restartDeckSession,
    practiceCards,
    reviewUnlearned,
    learnedCount,
    isShuffled,
    toggleShuffle,
    progressInfo,
    isLoading,
    error,
  } = useFlashcards(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);

  const dailyPlan = useAppStore(state => state.dailyReviewPlan);

  const showPinyin = useAppStore((state) => state.showPinyin);
  const toneColors = useAppStore((state) => state.toneColors);
  const showTranslation = useAppStore((state) => state.showTranslation);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);

  // Missed cards come back automatically: after the first pass, then again until a pass has no misses.
  const [reviewPass, setReviewPass] = useState(0);
  const [introActive, setIntroActive] = useState(false);
  /** The first review card has landed: the real deck is shown while the overlay finishes. */
  const [introLanded, setIntroLanded] = useState(false);
  const [dealStarted, setDealStarted] = useState(false);
  /** Size of the pass that just ended: the header shows that finished deck during the intro. */
  const [finishedPassSize, setFinishedPassSize] = useState(0);
  const [finishedPassCards, setFinishedPassCards] = useState<Flashcard[]>([]);
  /** The first review's missed tiles are highlighted: the app turns honey from here. */
  const [introToned, setIntroToned] = useState(false);
  const firstPassRef = useRef<{ total: number; correct: number; cards: Flashcard[]; missedCards: Flashcard[]; trickyCards: Flashcard[] } | null>(null);
  /** The honey tone has drained after the last card: Cards done releases it as the card lands in the sheet. */
  const [toneReleased, setToneReleased] = useState(false);
  /** Whether the last card was showing its answer when the deck ended: Cards done keeps it that way. */
  const lastFlippedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // A session reopened inside an unfinished review keeps the review look from the first frame.
  const isReviewPass = reviewPass > 0 || resumedReview;
  const missedCount = missedCards.length;

  useEffect(() => {
    if (resumedReview) setReviewPass((pass) => pass || 1);
  }, [resumedReview]);

  useEffect(() => {
    if (currentCard && startedAtRef.current === null) startedAtRef.current = Date.now();
  }, [currentCard]);

  useEffect(() => {
    if (practiceOnly || !completed || missedCount === 0) return;
    firstPassRef.current ??= { total: cards.length, correct: learnedCount, cards, missedCards, trickyCards };
    reviewUnlearned();
    setReviewPass((pass) => pass + 1);
    setFinishedPassSize(cards.length);
    setFinishedPassCards(cards);
    setIntroToned(false);
    setDealStarted(false);
    setIntroLanded(false);
    setIntroActive(true);
  }, [cards, completed, learnedCount, missedCards, missedCount, reviewUnlearned, trickyCards, practiceOnly]);

  useEffect(() => {
    if (!isReviewDeck || !completed || missedCount > 0 || !dailyPlan || dailyPlan.completed) return;
    useAppStore.getState().setDailyReviewPlan({ ...dailyPlan, completed: true });
  }, [completed, dailyPlan, isReviewDeck, missedCount]);

  const resetAll = useCallback(() => {
    firstPassRef.current = null;
    startedAtRef.current = null;
    setToneReleased(false);
    setReviewPass(0);
    setIntroActive(false);
    resetDeck();
  }, [resetDeck]);

  const studyAllAgain = useCallback(() => {
    firstPassRef.current = null;
    startedAtRef.current = null;
    setToneReleased(false);
    setReviewPass(0);
    setIntroActive(false);
    restartDeckSession();
  }, [restartDeckSession]);

  const isDeckDone = completed && (practiceOnly || missedCount === 0);
  /** A quiz follows: the last card shrinks into the Cards done sheet instead of the screen swapping. */
  const cardsDone = isDeckDone && Boolean(onStartQuiz) && !practiceOnly;
  if (!isDeckDone) lastFlippedRef.current = isFlipped;

  // The whole app turns warm for review passes (the intro included); after the last card it drains with Cards done.
  useReviewTone(isReviewPass && !(isDeckDone && (toneReleased || !cardsDone)) && !(introActive && reviewPass === 1 && !introToned));

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

  const { wrappedHandleNext, pauseFlow, toggleFlow, triggerManualReveal, autoPlayAudio } = useFlashcardFlow({
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

  const { extras, isLoading: isContentLoading } = useFlashcardExtras(currentCard);
  const handlePlayExample = useCallback(() => {
    const example = groupRankedExamples(extras.examples).flatMap(group => group.examples)[0];
    if (!example) return;
    pauseFlow();
    void playSentence(example.chinese, example.audio, useAppStore.getState().characterPreference).catch(() => {});
  }, [extras.examples, pauseFlow]);
  useEffect(() => {
    if (!isContentLoading) prefetchFlashcardExtras(cards, currentIndex);
  }, [isContentLoading, cards, currentIndex]);

  const { direction, triggerSwipeRate, triggerKeyboardRate, triggerNav } = useFlashcardSwipe(
    wrappedHandleNext,
    handleNavigate,
    currentIndex,
  );

  const [showHook, setShowHook] = useState(false);

  useEffect(() => {
    setShowHook(false);
  }, [currentIndex, isFlipped]);

  const handleToggleHook = useCallback(() => {
    if (!isFlipped) {
      if (currentCard && !autoPlayAudio) triggerManualReveal();
      setIsFlipped(true);
      setShowHook(true);
    } else {
      setShowHook((prev) => !prev);
    }
  }, [autoPlayAudio, currentCard, isFlipped, setIsFlipped, triggerManualReveal]);

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
    onToggleHint: handleToggleHook,
    onToggleFlow: toggleFlow,
    onPlayExample: handlePlayExample,
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

  // The round's distinct words: the whole deck of the first pass (a review pass holds only the missed ones).
  const deckCards = isDeckDone
    ? Array.from(new Map((firstPassRef.current?.cards ?? (sessionDeck?.length ? sessionDeck : cards)).map((card) => [card.id, card])).values())
    : [];
  const reportedCards = isReviewDeck && !isExtraReview ? deckCards.filter(card => card.id in (dailyPlan?.answers ?? {})) : deckCards;
  const first = firstPassRef.current ?? { total: cards.length, correct: learnedCount, missedCards: [] as Flashcard[] };
  const sessionStats = (): SessionStats => {
    return {
      trickyCardIds: (firstPassRef.current?.trickyCards ?? trickyCards).map(card => card.id),
      words: reportedCards.map((card) => card.front),
      firstTryPct: isReviewDeck && !isExtraReview
        ? Math.round(reportedCards.filter(card => (dailyPlan?.answers[card.id] ?? 0) >= 3).length / Math.max(1, reportedCards.length) * 100)
        : Math.round((first.correct / Math.max(1, first.total)) * 100),
      startedAt: startedAtRef.current ?? Date.now(),
    };
  };

  const tricky = firstPassRef.current?.trickyCards ?? trickyCards;
  if (isDeckDone && (!onStartQuiz || practiceOnly)) {
    const stats = sessionStats();
    return (
      <SessionComplete
        words={stats.words}
        headline={practiceOnly ? 'Practice complete' : isReviewDeck ? 'Today’s review complete' : undefined}
        reviewLabel="Review missed"
        pct={stats.firstTryPct}
        pctLabel="First try"
        seconds={Math.max(1, Math.round((Date.now() - stats.startedAt) / 1000))}
        onContinue={onContinue ?? onClose ?? (() => {})}
        onReviewMissed={tricky.length > 0 ? () => practiceCards(tricky) : undefined}
        missedCount={tricky.length}
        onStudyAllAgain={studyAllAgain}
      />
    );
  }

  const shownFlipped = cardsDone ? lastFlippedRef.current : isFlipped;
  const canNavigatePrevious = !cardsDone && currentIndex > 0;
  const canNavigateNext =
    !cardsDone && (!isReviewDeck || currentIndex < maxVisitedIndex) && currentIndex < cards.length;

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

      <div ref={stageRef} className={cn('relative flex min-h-0 w-full flex-1 flex-col border-t-2 transition-colors duration-300', cardsDone ? 'border-transparent' : 'border-ui-divider')}>
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
            {/* Not mode="wait": the next card must mount even if a quick tap interrupts the previous exit (a stalled exit left no live card). */}
            <AnimatePresence initial={false} custom={direction}>
              {currentCard && (
                <DraggableFlashcard
                  key={`${currentCard.id}-${currentIndex}`}
                  card={currentCard}
                  direction={direction}
                  isFlipped={shownFlipped}
                  setActiveBreakdown={setActiveBreakdown}
                  triggerSwipeRate={triggerSwipeRate}
                  showPinyin={showPinyin}
                  toneColors={toneColors}
                  showTranslation={showTranslation}
                  simpleDefinitions={simpleDefinitions}
                  showHook={showHook}
                  onToggleHook={handleToggleHook}
                  onOpenWriting={onOpenWriting}
                  onCardTap={handleCardTap}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
        <FlashcardAnswerBar
          concealed={(introActive && !introLanded) || cardsDone}
          isFlipped={shownFlipped}
          hideFlip={isIndependentStudy}
          onFlip={handleCardTap}
          onHard={() => triggerKeyboardRate(1, 1)}
          onUnsure={() => triggerKeyboardRate(2, 1)}
          onGotIt={() => triggerKeyboardRate(3, -1)}
        />
        {cardsDone && currentCard && onStartQuiz && (
          <CardsDone
            cards={sheetCards(deckCards, currentCard, quizFirstId)}
            deck={deckCards}
            wordCount={deckCards.length}
            stageRef={stageRef}
            onTone={() => setToneReleased(true)}
            onStart={(types) => onStartQuiz(types, sessionStats())}
            onReviewAgain={() => {
              firstPassRef.current ??= { total: cards.length, correct: learnedCount, cards, missedCards, trickyCards };
              if (tricky.length) practiceCards(tricky);
              else studyAllAgain();
            }}
            missedCount={tricky.length}
          />
        )}
        {introActive && (
          <ReviewDealIntro
            key={reviewPass}
            cards={cards}
            passCards={finishedPassCards}
            pass={reviewPass}
            onHighlight={() => setIntroToned(true)}
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
