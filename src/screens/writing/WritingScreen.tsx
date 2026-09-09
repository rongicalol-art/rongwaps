import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../data/books';
import { LessonComplete } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { ActionButton, AppIcon, ScreenLayout, ScreenSkeleton } from '../../lib/widgets';
import { useWriting } from './hooks/useWriting';
import { SingleChar } from './HanziCanvas';
import { WritingDock } from './components/WritingDock';
import { FlashcardBackFace } from '../flashcard/components/FlashcardBackFace';
import { getCardHeight, getCardWidth } from '../flashcard/components/DraggableFlashcard';
import { useCurriculumExamples } from '../flashcard/hooks/useCurriculumExamples';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import { numberToToneMarks } from '../../utils/pinyin';
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

export function WritingScreen({ activeBookId, selectedLessons = [], isLibraryDeck = false, isReviewDeck = false, onClose, onContinue, continueLabel }: WritingScreenProps) {
  const [activeBreakdown, setActiveBreakdown] = React.useState<string | null>(null);
  const {
    screenState,
    playlist,
    currentCard,
    chars,
    currentIndex,
    activeCharIndex,
    status,
    completedChars,
    canvasSize,
    showOutline,
    toggleOutline,
    resetCounter,
    handlePrev,
    handleNext,
    handleCharComplete,
    isLoading,
    handleRetry,
    restartCurrentChar,
    handlePrevChar,
    jumpToChar,
    animateStrokesSignal,
    isAnimatingStrokes,
    setIsAnimatingStrokes,
    triggerAnimateStrokes,
    loadError,
    restartRound,
    isShuffled,
    toggleShuffle,
  } = useWriting(activeBookId, selectedLessons, onClose, isLibraryDeck, isReviewDeck);

  const reduceMotion = useReducedMotion();
  const [cardHeight, setCardHeight] = React.useState(getCardHeight);
  const [cardWidth, setCardWidth] = React.useState(getCardWidth);

  React.useEffect(() => {
    const handleResize = () => {
      setCardHeight(getCardHeight());
      setCardWidth(getCardWidth());
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);
  const showTranslation = usePracticePreferencesStore((state) => state.showTranslation);
  const { examples: curriculumExamples, isLoading: areExamplesLoading } = useCurriculumExamples(
    currentCard,
    status === 'correct' || activeCharIndex >= chars.length,
  );

  const handleCurrentCharComplete = React.useCallback(() => {
    handleCharComplete(activeCharIndex);
  }, [handleCharComplete, activeCharIndex]);

  const handleAnimStart = React.useCallback(() => {
    setIsAnimatingStrokes(true);
  }, [setIsAnimatingStrokes]);

  const handleAnimEnd = React.useCallback(() => {
    setIsAnimatingStrokes(false);
  }, [setIsAnimatingStrokes]);

  const partSegments = React.useMemo(
    () => (isShuffled || isReviewDeck || isLibraryDeck ? [] : buildPracticePartSegments(playlist)),
    [isLibraryDeck, isReviewDeck, isShuffled, playlist],
  );

  usePracticeHeaderRegistration({
    currentIndex,
    totalCount: playlist.length,
    showLightbulb: false,
    partSegments,
    onShuffleClick: toggleShuffle,
    onRestartClick: restartRound,
    isShuffled,
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) handlePrev();
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < playlist.length - 1) handleNext();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (status === 'correct') {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, handleNext, handlePrev, playlist.length, status]);

  const handleScreenTap = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Ignore clicks on buttons, inputs, canvas, or dialogs
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'button, [role="button"], [role="switch"], [role="dialog"], [role="menu"], [data-canvas-container], input, textarea',
        )
      ) {
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const horizontalPosition = (event.clientX - bounds.left) / bounds.width;

      if (horizontalPosition <= 0.4) {
        if (currentIndex > 0) {
          handlePrev();
        }
        return;
      }

      if (horizontalPosition >= 0.6) {
        if (currentIndex < playlist.length - 1) {
          handleNext();
        }
        return;
      }
    },
    [currentIndex, handleNext, handlePrev, playlist.length],
  );

  if (isLoading) {
    return <ScreenSkeleton type="writing" />;
  }

  if (loadError) {
    return (
      <div className="absolute inset-0 w-full h-full flex flex-col justify-center items-center overflow-hidden overscroll-none">
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-feedback-danger-surface flex items-center justify-center mb-6">
            <AppIcon name="pencil" size={48} className="text-feedback-danger" />
          </div>
          <h2 className="text-2xl font-extrabold text-ui-ink tracking-normal">Something went wrong</h2>
          <p className="text-ui-muted text-[15px] font-bold mt-2 max-w-[280px]">
            We couldn't load the writing data. Please try again.
          </p>
          <div className="mt-8 flex gap-3">
            <ActionButton
              variant="primary"
              size="lg"
              onClick={handleRetry}
              className="uppercase tracking-wider"
            >
              TRY AGAIN
            </ActionButton>
            {onClose && (
              <ActionButton
                variant="secondary"
                size="lg"
                onClick={onClose}
                className="uppercase tracking-wider"
              >
                GO BACK
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
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

  // Empty state: no cards available for writing practice
  if (playlist.length === 0 || !currentCard) {
    return (
      <div className="absolute inset-0 w-full h-full flex flex-col justify-center items-center overflow-hidden overscroll-none">
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-ui-surface border-b-[length:var(--depth-md)] border-ui-border flex items-center justify-center mb-6">
            <AppIcon name="pencil" size={44} className={activeBook.accent} />
          </div>
          <h2 className="text-2xl font-extrabold text-ui-ink tracking-normal">No characters to write yet</h2>
          <p className="text-ui-muted text-[15px] font-bold mt-2 max-w-[280px]">
            We couldn't find any cards for this selection. Try choosing different lessons or adding cards to your library.
          </p>
          {onClose && (
            <div className="mt-8">
              <ActionButton
                variant="primary"
                size="lg"
                onClick={onClose}
                className={activeBook.accentBg}
              >
                GO BACK
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleScreenTap}
      className="absolute inset-0 z-[100] flex flex-col bg-transparent overflow-hidden text-ui-ink font-sans pt-[72px]"
    >
      {/* Edge Navigation Buttons for instant, reliable card switching */}
      <button
        type="button"
        aria-label="Previous card"
        disabled={currentIndex <= 0}
        onClick={(e) => {
          e.stopPropagation();
          handlePrev();
        }}
        className="absolute bottom-[90px] left-0 top-[72px] z-10 w-[20%] max-w-[130px] bg-transparent outline-none cursor-pointer disabled:pointer-events-none"
      />
      <button
        type="button"
        aria-label="Next card"
        disabled={currentIndex >= playlist.length - 1}
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        className="absolute bottom-[90px] right-0 top-[72px] z-10 w-[20%] max-w-[130px] bg-transparent outline-none cursor-pointer disabled:pointer-events-none"
      />

      <ScreenLayout maxWidth="xl" className="flex-1 mb-[120px] justify-center items-center overflow-hidden overscroll-none px-0 sm:px-0 flex-col relative w-full pointer-events-auto">
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 gap-2 sm:gap-4 pb-2 pt-2">
          <AnimatePresence mode="wait" initial={false}>
            {activeCharIndex < chars.length ? (
              <motion.div
                key={`quizzing-${currentCard.id}`}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -8 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="flex flex-col items-center w-full max-h-full"
              >
                {/* Meaning Above */}
                <div className="w-full flex-shrink-0 flex flex-col items-center justify-center px-4 mb-3 sm:mb-6 mt-4 select-none cursor-pointer">
                  <p className="text-[20px] sm:text-[24px] font-extrabold text-ui-ink text-center leading-tight">
                    {currentCard.back}
                  </p>
                </div>

                <motion.div
                  key={`char-canvas-${currentCard.id}-${activeCharIndex}-${resetCounter}`}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0.7, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="pointer-events-auto"
                >
                  <SingleChar 
                    char={chars[activeCharIndex]} 
                    status={completedChars.has(activeCharIndex) ? 'completed' : 'quizzing'} 
                    onComplete={handleCurrentCharComplete} 
                    size={canvasSize}
                    showOutline={showOutline}
                    animateSignal={animateStrokesSignal}
                    onAnimationStart={handleAnimStart}
                    onAnimationEnd={handleAnimEnd}
                    accentHex={activeBook.accentHex}
                  />
                </motion.div>
                
                {/* Bottom area of Canvas: Pinyin and indicator */}
                <div className="mt-4 sm:mt-6 flex flex-col items-center gap-3 h-[40px]">
                  {currentCard.pinyin && (
                    <p className="text-[17px] sm:text-[20px] font-bold text-ui-muted tracking-widest select-none">
                      {numberToToneMarks(currentCard.pinyin)}
                    </p>
                  )}
                  {chars.length > 1 && (
                    <div className="flex flex-row items-center justify-center gap-2 mt-1">
                      {chars.map((_, index) => {
                        const isFinished = completedChars.has(index);
                        const isCurrent = index === activeCharIndex;
                        const isClickable = index < activeCharIndex;
                        return (
                          <button
                            key={`dot-${index}`}
                            type="button"
                            disabled={!isClickable}
                            onClick={() => jumpToChar(index)}
                            title={isClickable ? `Go back to character ${index + 1}` : undefined}
                            aria-label={`Character ${index + 1}`}
                            className={`h-2.5 rounded-full transition-all duration-300 ease-out focus-ring-inline ${
                              isFinished ? `w-8 sm:w-10 ${activeBook.accentBg}` : 
                              isCurrent ? `w-12 sm:w-14 ${activeBook.accentBg}` : 
                              'w-8 sm:w-10 bg-brand-primary-track'
                            } ${isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`finished-${currentCard.id}`}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -14 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 360, damping: 28, mass: 0.8 }
                }
                className="flex flex-col items-center w-full max-h-full"
              >
                {/* Study mode back card */}
                <div
                  data-canvas-container="true"
                  className="relative mx-auto flex flex-col rounded-feature border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-6 pb-10 sm:p-8 sm:pb-10 shadow-ambient-sm pointer-events-auto select-none"
                  style={{ width: cardWidth, height: cardHeight }}
                >
                  <FlashcardBackFace
                    card={currentCard}
                    setActiveBreakdown={(char) => setActiveBreakdown(char)}
                    showPinyin={showPinyin}
                    showTranslation={showTranslation}
                    examples={curriculumExamples}
                    isExamplesLoading={areExamplesLoading}
                  />
                </div>

                {/* Text-only continue action beneath the card */}
                <motion.div
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.15, duration: 0.2 }}
                  className="mt-4 flex flex-col items-center justify-center"
                >
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-sm sm:text-base font-black uppercase tracking-wider text-ui-muted-strong hover:text-ui-ink active:scale-95 transition-all focus-ring rounded-control select-none"
                  >
                    Continue
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScreenLayout>

      {/* Floating Writing Dock remains visible throughout writing mode */}
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

      <CharacterBreakdownOverlay activeBreakdown={activeBreakdown} onClose={() => setActiveBreakdown(null)} activeBook={activeBook} />

    </div>
  );
}
