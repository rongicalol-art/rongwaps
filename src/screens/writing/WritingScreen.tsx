import React from 'react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar, LessonComplete } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { ActionButton, EdgeNavButtons, EmptyState, ScreenLayout, ScreenSkeleton } from '../../lib/widgets';
import { useWriting } from './hooks/useWriting';
import { WritingDock } from './components/WritingDock';
import { WritingQuizzingCanvas } from './components/WritingQuizzingCanvas';
import { WritingCompletedCard } from './components/WritingCompletedCard';
import { getCardWidth, useCurriculumExamples } from '../../features/flashcards';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { buildPracticePartSegments } from '../../utils/practicePartSegments';

interface WritingScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

export function WritingScreen({
  activeBookId,
  selectedLessons = [],
  isLibraryDeck = false,
  isReviewDeck = false,
  onClose,
  onContinue,
  continueLabel,
}: WritingScreenProps) {
  const [activeBreakdown, setActiveBreakdown] = React.useState<string | null>(null);
  const writing = useWriting(activeBookId, selectedLessons, onClose, isLibraryDeck, isReviewDeck);
  const {
    screenState, playlist, currentCard, chars, currentIndex, activeCharIndex,
    status, completedChars, canvasSize, showOutline, toggleOutline, resetCounter,
    handlePrev, handleNext, handleCharComplete, isLoading, handleRetry,
    restartCurrentChar, handlePrevChar, jumpToChar, animateStrokesSignal,
    isAnimatingStrokes, setIsAnimatingStrokes, triggerAnimateStrokes,
    loadError, restartRound, isShuffled, toggleShuffle, progressInfo,
  } = writing;

  const reduceMotion = useReducedMotion();
  const [cardWidth, setCardWidth] = React.useState(getCardWidth);

  React.useEffect(() => {
    const handleResize = () => setCardWidth(getCardWidth());
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showPinyin = useAppStore((state) => state.showPinyin);
  const showTranslation = useAppStore((state) => state.showTranslation);
  const isCardFinished = activeCharIndex >= chars.length && chars.length > 0;
  const { examples: curriculumExamples, isLoading: areExamplesLoading } = useCurriculumExamples(
    currentCard,
    status === 'correct' || isCardFinished
  );

  const partSegments = React.useMemo(
    () => (isReviewDeck || isLibraryDeck ? [] : buildPracticePartSegments(playlist)),
    [isLibraryDeck, isReviewDeck, playlist]
  );

  usePracticeHeaderRegistration({
    currentIndex: progressInfo.displayIndex,
    totalCount: progressInfo.totalCount,
    showLightbulb: false,
    partSegments,
    isRetry: progressInfo.isRetry,
    cleanupPhase: progressInfo.cleanupPhase,
    onShuffleClick: toggleShuffle,
    onRestartClick: restartRound,
    isShuffled,
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && currentIndex > 0) handlePrev();
      else if (e.key === 'ArrowRight' && currentIndex < playlist.length - 1) handleNext();
      else if (e.key === ' ' && status === 'correct') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, handleNext, handlePrev, playlist.length, status]);

  const handleScreenTap = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, [role="button"], [role="switch"], [role="dialog"], [role="menu"], [data-canvas-container], input, textarea')) {
        return;
      }
      const bounds = event.currentTarget.getBoundingClientRect();
      const pos = (event.clientX - bounds.left) / bounds.width;
      if (pos <= 0.4 && currentIndex > 0) handlePrev();
      else if (pos >= 0.6 && currentIndex < playlist.length - 1) handleNext();
    },
    [currentIndex, handleNext, handlePrev, playlist.length]
  );

  if (isLoading) return <ScreenSkeleton type="writing" />;

  const activeBook = SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0];

  if (loadError || playlist.length === 0 || !currentCard) {
    const title = loadError ? 'Something went wrong' : 'No characters to write yet';
    const desc = loadError
      ? "We couldn't load the writing data. Please try again."
      : "We couldn't find any cards for this selection. Try choosing different lessons or adding cards to your library.";

    return (
      <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center overflow-hidden overscroll-none">
        <EmptyState
          icon="pencil"
          iconBg={loadError ? 'bg-feedback-danger-surface' : 'bg-ui-surface'}
          iconColor={loadError ? 'text-feedback-danger' : activeBook.accent}
          title={title}
          description={desc}
          action={
            <div className="flex gap-3">
              {loadError && (
                <ActionButton variant="primary" size="lg" onClick={handleRetry} className="uppercase tracking-wider">
                  TRY AGAIN
                </ActionButton>
              )}
              {onClose && (
                <ActionButton
                  variant={loadError ? 'secondary' : 'primary'}
                  size="lg"
                  onClick={onClose}
                  className={loadError ? 'uppercase tracking-wider' : activeBook.accentBg}
                >
                  GO BACK
                </ActionButton>
              )}
            </div>
          }
        />
      </div>
    );
  }

  if (screenState === 'complete') {
    return (
      <LessonComplete
        accuracy={100}
        onContinue={onContinue ?? onClose}
        continueLabel={onContinue ? continueLabel : undefined}
        onResetAll={restartRound}
      />
    );
  }

  return (
    <div
      onClick={handleScreenTap}
      className="absolute inset-0 z-content flex flex-col overflow-hidden bg-transparent pt-[72px] font-sans text-ui-ink"
    >
      <EdgeNavButtons
        width="edge"
        bottomOffset="bottom-[90px]"
        zIndex="z-10"
        onPrevious={handlePrev}
        onNext={handleNext}
        canNavigatePrevious={currentIndex > 0}
        canNavigateNext={currentIndex < playlist.length - 1}
      />

      <ScreenLayout
        maxWidth="xl"
        className={cn(
          'relative flex flex-1 w-full flex-col items-center justify-center overflow-hidden overscroll-none px-2 pointer-events-auto sm:px-4',
          isCardFinished ? 'pb-[140px] md:pb-[130px]' : 'pb-[90px] md:pb-[100px]'
        )}
      >
        <div className="flex flex-1 w-full flex-col items-center justify-center gap-2 pb-2 pt-2 sm:gap-4">
          <AnimatePresence mode="wait" initial={false}>
            {activeCharIndex < chars.length && currentCard ? (
              <WritingQuizzingCanvas
                currentCard={currentCard}
                chars={chars}
                activeCharIndex={activeCharIndex}
                completedChars={completedChars}
                resetCounter={resetCounter}
                canvasSize={canvasSize}
                showOutline={showOutline}
                animateStrokesSignal={animateStrokesSignal}
                activeBook={activeBook}
                reduceMotion={reduceMotion}
                onCharComplete={() => handleCharComplete(activeCharIndex)}
                onAnimationStart={() => setIsAnimatingStrokes(true)}
                onAnimationEnd={() => setIsAnimatingStrokes(false)}
                jumpToChar={jumpToChar}
              />
            ) : currentCard ? (
              <WritingCompletedCard
                card={currentCard}
                cardWidth={cardWidth}
                reduceMotion={reduceMotion}
                showPinyin={showPinyin}
                showTranslation={showTranslation}
                examples={curriculumExamples}
                isExamplesLoading={areExamplesLoading}
                onSelectBreakdown={(char) => setActiveBreakdown(char)}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </ScreenLayout>

      <AnimatePresence>
        {!isCardFinished && (
          <WritingDock
            onRestartChar={restartCurrentChar}
            onPrevChar={handlePrevChar}
            canGoPrevChar={activeCharIndex > 0}
            hasMultipleChars={chars.length > 1}
            onAnimateStrokes={triggerAnimateStrokes}
            showOutline={showOutline}
            onToggleOutline={toggleOutline}
            onExit={onClose}
            isAnimatingStrokes={isAnimatingStrokes}
          />
        )}
      </AnimatePresence>

      <FeedbackBottomBar
        status={isCardFinished ? 'correct' : 'idle'}
        onContinue={handleNext}
        onRetry={handleRetry}
        showCheck={false}
        keyboardShortcutDisabled={Boolean(activeBreakdown)}
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />
    </div>
  );
}
