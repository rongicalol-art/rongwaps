import { useMemo, useState, useEffect } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar, LessonComplete, BreakdownExpandPanel } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { ActionButton, AppIcon, ScreenSkeleton, ScreenLayout } from '../../lib/widgets';
import { useListening } from './hooks/useListening';
import { AudioControls } from './AudioControls';
import { ListeningOptions } from './ListeningOptions';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticeAnswerAutomation } from '../../hooks/usePracticeAnswerAutomation';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import { buildPracticePartSegments } from '../../utils/practicePartSegments';
import { useNumberKeySelection } from '../../hooks/useNumberKeySelection';

interface ListeningScreenProps {
  activeBookId?: number;
  selectedLessons?: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose?: () => void;
}

export function ListeningScreen({ activeBookId = 1, selectedLessons = [], isLibraryDeck = false, isReviewDeck = false, onClose }: ListeningScreenProps) {
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const {
    screenState,
    currentIndex,
    playlist,
    currentCard,
    options,
    isPlaying,
    playAudio,
    selectedOption,
    handleSelect,
    isChecked,
    handleCheck,
    retryAnswer,
    isCorrect,
    isLoading,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle
  } = useListening(activeBookId, selectedLessons, isLibraryDeck, isReviewDeck);

  usePracticeAnswerAutomation({
    status: !isChecked ? 'idle' : isCorrect ? 'correct' : 'wrong',
    onAdvance: handleCheck,
    advanceWrong: false,
    blocked: Boolean(activeBreakdown),
  });

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);
  const autoAdvanceCorrect = usePracticePreferencesStore((state) => state.autoAdvanceCorrect);
  const autoAdvance = isCorrect ? autoAdvanceCorrect : false;

  // The inline breakdown panel is per-card; close it when the card changes.
  useEffect(() => {
    setBreakdownOpen(false);
  }, [currentCard?.id]);
  const partSegments = useMemo(
    () => (isShuffled ? [] : buildPracticePartSegments(playlist)),
    [isShuffled, playlist],
  );

  usePracticeHeaderRegistration({
    currentIndex,
    totalCount: playlist.length,
    showLightbulb: false,
    partSegments,
    onShuffleClick: toggleShuffle,
    onRestartClick: resetAll,
    isShuffled,
  });

  useNumberKeySelection({
    items: options,
    onSelect: handleSelect,
    disabled: screenState === 'complete' || isChecked || Boolean(activeBreakdown),
  });

  if (isLoading) {
    return <ScreenSkeleton type="listening" />;
  }

  if (screenState === 'complete') {
    return (
      <LessonComplete
        learnedCount={learnedCount}
        unlearnedCount={unlearnedCount}
        onContinue={onClose}
        onReviewUnlearned={unlearnedCount > 0 ? reviewUnlearned : undefined}
        onResetAll={resetAll}
      />
    );
  }

  // Empty state: no cards available for listening practice
  if (!currentCard) {
    return (
      <div className="absolute inset-0 w-full h-full bg-transparent flex flex-col justify-center items-center overflow-hidden overscroll-none">
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-ui-border bg-ui-surface">
            <AppIcon name="audio" size={48} className={activeBook.accent} />
          </div>
          <h2 className="text-2xl font-extrabold text-ui-ink tracking-normal">No audio cards yet</h2>
          <p className="text-ui-muted text-[15px] font-bold mt-2 max-w-[280px]">
            We couldn't find any cards with audio for this selection. Try choosing different lessons or adding cards to your library.
          </p>
          {onClose && (
            <div className="mt-8">
              <ActionButton
                variant="primary"
                onClick={onClose}
                className={`${activeBook.accentBg} ${activeBook.buttonEdge} px-8 py-4 text-lg tracking-wider`}
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
    <div className="absolute inset-0 z-[100] w-full h-full bg-transparent flex flex-col overflow-hidden text-ui-ink font-sans pt-[72px]">
      
      <ScreenLayout maxWidth="xl" className="pb-[200px] overscroll-none overflow-y-auto">
        <div className="mt-4 flex w-full items-center">
          <h2 className="text-[24px] font-extrabold text-ui-ink sm:text-[26px]">
            Select the meaning
          </h2>
        </div>
        
        <AudioControls 
          isPlaying={isPlaying} 
          playAudio={playAudio} 
          activeBook={activeBook} 
        />

        <ListeningOptions 
          options={options}
          selectedOption={selectedOption}
          onSelect={handleSelect}
          isChecked={isChecked}
          currentCard={currentCard}
          activeBook={activeBook}
        />

      </ScreenLayout>

      <FeedbackBottomBar 
        status={!isChecked ? 'idle' : (isCorrect ? 'correct' : 'wrong')}
        correctAnswer={currentCard.back}
        pinyin={showPinyin ? currentCard.pinyin : undefined}
        onContinue={isCorrect ? handleCheck : retryAnswer}
        showCheck={false}
        hideWhenAutoAdvance={autoAdvance && isChecked}
        showContinueOnWrong
        keyboardShortcutDisabled={Boolean(activeBreakdown)}
        onBreakdown={() => setBreakdownOpen((open) => !open)}
        breakdownOpen={breakdownOpen}
        breakdownPanel={
          <BreakdownExpandPanel
            front={currentCard.front}
            pinyin={showPinyin ? currentCard.pinyin : undefined}
            meaning={currentCard.back}
          />
        }
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay activeBreakdown={activeBreakdown} onClose={() => setActiveBreakdown(null)} activeBook={activeBook} />

    </div>
  );
}
