import { useState, useEffect } from 'react';
import { PiHeadphonesFill, PiLightbulbFill, PiGearFill } from 'react-icons/pi';
import { SAMPLE_BOOKS } from '../../data/books';
import { LessonComplete } from '../../lib/widgets/LessonComplete';
import { FeedbackBottomBar } from '../../lib/widgets/FeedbackBottomBar';
import { CharacterBreakdownOverlay } from '../../lib/widgets/CharacterBreakdownOverlay';
import { ScreenSkeleton, ScreenLayout } from '../../lib/widgets';
import { MemoryHookOverlay } from '../flashcard/MemoryHookOverlay';
import { useListening } from './hooks/useListening';
import { AudioControls } from './AudioControls';
import { ListeningOptions } from './ListeningOptions';
import { useAppStore } from '../../store/useAppStore';

interface ListeningScreenProps {
  activeBookId?: number;
  selectedLessons?: number[];
  isLibraryDeck?: boolean;
  isReviewDeck?: boolean;
  onClose?: () => void;
}

export function ListeningScreen({ activeBookId = 1, selectedLessons = [], isLibraryDeck = false, isReviewDeck = false, onClose }: ListeningScreenProps) {
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [activeMemoryHook, setActiveMemoryHook] = useState<any | null>(null);
  const {
    screenState,
    currentIndex,
    playlist,
    currentCard,
    options,
    isPlaying,
    playAudio,
    selectedOption,
    setSelectedOption,
    isChecked,
    handleCheck,
    handleSkip,
    isCorrect,
    isLoading,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount
  } = useListening(activeBookId, selectedLessons, isLibraryDeck, isReviewDeck);

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  const { setPracticeHeader, setPracticeHeaderActions } = useAppStore();

  useEffect(() => {
    setPracticeHeader({
      progress: playlist.length > 0 ? (currentIndex / playlist.length) * 100 : 0,
      currentIndex,
      totalCount: playlist.length,
      showLightbulb: !!currentCard
    });
    setPracticeHeaderActions({
      onLightbulbClick: currentCard ? () => setActiveMemoryHook(currentCard) : undefined,
      onSettingsClick: () => {}
    });
  }, [currentIndex, playlist.length, currentCard, setActiveMemoryHook, setPracticeHeader, setPracticeHeaderActions]);

  if (isLoading) {
    return <ScreenSkeleton type="listening" />;
  }

  if (screenState === 'complete') {
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

  // Empty state: no cards available for listening practice
  if (!currentCard) {
    return (
      <div className="absolute inset-0 w-full h-full bg-white flex flex-col justify-center items-center overflow-hidden overscroll-none">
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-white shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-[#E5E5E5] flex items-center justify-center mb-6">
            <PiHeadphonesFill size={48} className={activeBook.accent} />
          </div>
          <h2 className="text-2xl font-extrabold text-[#4B4B4B] tracking-tight">No audio cards yet</h2>
          <p className="text-[#AFB6BB] text-[15px] font-bold mt-2 max-w-[280px]">
            We couldn't find any cards with audio for this selection. Try choosing different lessons or adding cards to your library.
          </p>
          {onClose && (
            <div className="mt-8">
              <button
                onClick={onClose}
                className={`px-8 py-4 rounded-[24px] font-black text-white text-lg tracking-wider border-b-[6px] active:border-b-0 active:translate-y-[6px] transition-all ${activeBook.accentBg} ${activeBook.buttonEdge || 'border-b-[rgba(0,0,0,0.15)]'}`}
              >
                GO BACK
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[100] w-full h-full bg-[#F7F7F7] flex flex-col overflow-hidden text-[#4B4B4B] font-sans pt-[72px]">
      
      <ScreenLayout maxWidth="xl" className="pb-[200px] overscroll-none overflow-y-auto">
        
        <h2 className="text-[26px] font-extrabold text-[#4B4B4B] mt-4 mb-4 tracking-tight text-left w-full px-2">
          What do you hear?
        </h2>

        <AudioControls 
          isPlaying={isPlaying} 
          playAudio={playAudio} 
          activeBook={activeBook} 
        />

        <ListeningOptions 
          options={options}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
          isChecked={isChecked}
          currentCard={currentCard}
          activeBook={activeBook}
        />

      </ScreenLayout>

      <FeedbackBottomBar 
        status={!isChecked ? 'idle' : (isCorrect ? 'correct' : 'wrong')}
        correctAnswer={currentCard.back}
        onContinue={handleCheck}
        onCheck={handleCheck}
        isCheckDisabled={!selectedOption}
        onSkip={handleSkip}
        onBreakdown={() => setActiveBreakdown(currentCard.front)}
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay 
        activeBreakdown={activeBreakdown}
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

