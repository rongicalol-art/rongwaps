import React from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar, LessonComplete } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { ActionButton, AppIcon, ScreenLayout, ScreenSkeleton } from '../../lib/widgets';
import { motion, AnimatePresence } from 'motion/react';
import { useWriting } from './hooks/useWriting';
import { SingleChar } from './HanziCanvas';
import { numberToToneMarks } from '../../utils/pinyin';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticeAnswerAutomation } from '../../hooks/usePracticeAnswerAutomation';
import { buildPracticePartSegments } from '../../utils/practicePartSegments';

interface WritingScreenProps {
  activeBookId: number;
  selectedLessons?: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose: () => void;
}

export function WritingScreen({ activeBookId, selectedLessons = [], isLibraryDeck = false, isReviewDeck = false, onClose }: WritingScreenProps) {
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
    resetCounter,
    handlePrev,
    handleNext,
    handleCharComplete,
    isLoading,
    handleRetry,
    loadError,
    restartRound,
    isShuffled,
    toggleShuffle,
  } = useWriting(activeBookId, selectedLessons, onClose, isLibraryDeck, isReviewDeck);

  usePracticeAnswerAutomation({
    status: status === 'correct' ? 'correct' : 'idle',
    onAdvance: handleNext,
    blocked: Boolean(activeBreakdown),
  });
  const partSegments = React.useMemo(
    () => (isShuffled ? [] : buildPracticePartSegments(playlist)),
    [isShuffled, playlist],
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

  if (isLoading) {
    return <ScreenSkeleton type="writing" />;
  }

  if (loadError) {
    return (
      <div className="absolute inset-0 w-full h-full bg-ui-canvas flex flex-col justify-center items-center overflow-hidden overscroll-none">
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
        score={15}
        accuracy={100}
        onContinue={onClose}
        onResetAll={restartRound}
      />
    );
  }

  // Empty state: no cards available for writing practice
  if (playlist.length === 0 || !currentCard) {
    return (
      <div className="absolute inset-0 w-full h-full bg-ui-canvas flex flex-col justify-center items-center overflow-hidden overscroll-none">
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider flex items-center justify-center mb-6">
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
    <div className="absolute inset-0 z-[100] flex flex-col bg-transparent overflow-hidden text-ui-ink font-sans pt-[72px]">
      <ScreenLayout maxWidth="xl" className="flex-1 mb-[120px] justify-center items-center overflow-hidden overscroll-none px-0 sm:px-0 flex-col relative w-full pointer-events-none">
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 gap-2 sm:gap-4 pb-2 pt-2">
           <AnimatePresence mode="wait">
             {activeCharIndex < chars.length ? (
               <motion.div
                 key={`quizzing-${currentCard.id}-${activeCharIndex}-${resetCounter}`}
                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: -10, scale: 0.95 }}
                 transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                 className="flex flex-col items-center w-full max-h-full"
               >
                 {/* Meaning Above */}
                 <div className="w-full flex-shrink-0 flex flex-col items-center justify-center px-4 mb-3 sm:mb-6 mt-4 pointer-events-auto">
                   <p className="text-[20px] sm:text-[24px] font-extrabold text-ui-ink text-center leading-tight">
                     {currentCard.back}
                   </p>
                 </div>

                 <div className="pointer-events-auto">
                   <SingleChar 
                     char={chars[activeCharIndex]} 
                     status={completedChars.has(activeCharIndex) ? 'completed' : 'quizzing'} 
                     onComplete={() => handleCharComplete(activeCharIndex)} 
                     size={canvasSize}
                     showOutline={showOutline}
                     accentHex={activeBook.accentHex}
                     accentBorder={activeBook.accentBorder}
                     textAccent={activeBook.accent}
                     bgAccent={activeBook.bg}
                   />
                 </div>
                 
                 {/* Bottom area of Canvas: Pinyin and indicator */}
                 <div className="mt-4 sm:mt-6 flex flex-col items-center gap-3 h-[60px] pointer-events-auto">
                    {currentCard.pinyin && (
                      <p className="text-[17px] sm:text-[20px] font-bold text-ui-muted tracking-widest">
                        {numberToToneMarks(currentCard.pinyin)}
                      </p>
                    )}
                    {chars.length > 1 && (
                      <div className="flex flex-row items-center justify-center gap-2 mt-1">
                        {chars.map((_, index) => {
                          const isFinished = completedChars.has(index);
                          const isCurrent = index === activeCharIndex;
                          return (
                            <div 
                              key={`dot-${index}`}
                              className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                                isFinished ? `w-2.5 ${activeBook.accentBg}` : 
                                isCurrent ? `w-6 ${activeBook.accentBg}` : 
                                'w-2.5 bg-brand-primary-track'
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}
                    {currentIndex > 0 && (
                      <ActionButton variant="quiet" size="sm" onClick={handlePrev}>
                        <AppIcon name="back" size={16} />
                        Previous card
                      </ActionButton>
                    )}
                 </div>

               </motion.div>
             ) : (
               <motion.div
                 key="success"
                 initial={{ scale: 0.9, opacity: 0, y: 10 }}
                 animate={{ scale: 1, opacity: 1, y: 0 }}
                 transition={{ type: 'spring', bounce: 0.5 }}
                 className="flex flex-col items-center justify-center text-ui-ink w-full gap-4 sm:gap-6 pointer-events-auto"
               >
                 <div className="flex flex-col items-center gap-1">
                   {currentCard.pinyin && (
                     <span className={`text-[20px] sm:text-[24px] font-bold ${activeBook.accent} tracking-widest`}>
                       {numberToToneMarks(currentCard.pinyin)}
                     </span>
                   )}
                   <span style={{ fontSize: chars.length > 2 ? '72px' : '96px' }} className={`font-chinese text-center leading-none ${activeBook.accent}`}>
                     {currentCard.front}
                   </span>
                 </div>
                 
                 <div className="h-[2px] w-16 bg-ui-border rounded-full my-2" />
                 
                 <p className="text-[20px] sm:text-[24px] font-extrabold text-ui-ink text-center leading-tight max-w-[80%] mx-auto">
                   {currentCard.back}
                 </p>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </ScreenLayout>

      {/* Always render, let AnimatePresence inside FeedbackBottomBar handle the entrance/exit */}
      <FeedbackBottomBar 
        status={status === 'correct' ? 'correct' : 'idle'}
        correctAnswer={currentCard.front}
        pinyin={""}
        onContinue={handleNext}
        onCheck={() => {}}
        isCheckDisabled={status !== 'correct'}
        onRetry={handleRetry}
        keyboardShortcutDisabled={Boolean(activeBreakdown)}
        onBreakdown={() => setActiveBreakdown(currentCard.front)}
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay activeBreakdown={activeBreakdown} onClose={() => setActiveBreakdown(null)} activeBook={activeBook} />

    </div>
  );
}
