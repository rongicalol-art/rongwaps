import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PiLightbulbFill, PiGearFill } from 'react-icons/pi';
import { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { PracticeHeader } from '../../lib/widgets/PracticeHeader';
import { FeedbackBottomBar } from '../../lib/widgets/FeedbackBottomBar';
import { CharacterBreakdownOverlay } from '../../lib/widgets/CharacterBreakdownOverlay';
import { LessonComplete } from '../../lib/widgets/LessonComplete';
import { MemoryHookOverlay } from '../flashcard/MemoryHookOverlay';
import { useQuizChoices } from './hooks/useQuiz';
import { useAppStore } from '../../store/useAppStore';

interface QuizModeProps {
  cards: Flashcard[];
  onEnd: () => void;
  activeBookId: number;
  sessionKey: string;
}

interface QuizChoicesCardProps {
  currentCard: Flashcard;
  options: Flashcard[];
  selectedOption: string | null;
  isChecked: boolean;
  handleSelect: (opt: string) => void;
  activeBook: any;
}

const QuizChoicesCard: React.FC<QuizChoicesCardProps> = ({
  currentCard, options, selectedOption, isChecked, handleSelect, activeBook
}) => {
  const frontLength = currentCard?.front?.length || 1;
  const getFrontFontSize = (len: number) => {
    if (len === 1) return 'text-[90px] sm:text-[120px]';
    if (len === 2) return 'text-[70px] sm:text-[96px]';
    if (len === 3) return 'text-[54px] sm:text-[72px]';
    if (len === 4) return 'text-[44px] sm:text-[60px]';
    if (len <= 6) return 'text-[36px] sm:text-[48px]';
    return 'text-[28px] sm:text-[36px]';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col w-full"
    >
      <div className="flex flex-col items-center justify-center py-4 mb-2 w-full">
         <h2 className={`${getFrontFontSize(frontLength)} leading-tight font-chinese text-[#4B4B4B] text-center break-words w-full px-4`}>
           {currentCard.front}
         </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full pb-[120px] px-2 sm:px-0">
        {options.map((opt, i) => {
          const isSelected = selectedOption === opt.back;
          const isCorrectOption = opt.id === currentCard.id;
          
          let containerClass = "bg-white text-[#4B4B4B] hover:bg-[#F7F7F7] border-[3px] border-[#E5E5E5]";
          let activeState = "active:translate-y-[4px]";
          let dynamicStyle: any = { boxShadow: '0 4px 0 0 #E5E5E5' };
          
          if (isSelected && !isChecked) {
            containerClass = `${activeBook.bg} border-[3px] ${activeBook.accentBorder} ${activeBook.accent}`;
            dynamicStyle = { boxShadow: `0 4px 0 0 ${activeBook.accentHex}` };
          } else if (isChecked && isCorrectOption) {
            containerClass = "bg-[#D7FFB8] border-[3px] border-[#58A700] text-[#58A700] translate-y-[4px]";
            dynamicStyle = { boxShadow: "0 0px 0 0 #58A700" };
            activeState = "";
          } else if (isChecked && isSelected && !isCorrectOption) {
            containerClass = "bg-[#FFDFE0] border-[3px] border-[#EA2B2B] text-[#EA2B2B] translate-y-[4px]";
            dynamicStyle = { boxShadow: "0 0px 0 0 #EA2B2B" };
            activeState = ""; 
          } else if (isChecked) {
            containerClass = "bg-white border-[3px] border-[#E5E5E5] text-[#AFB6BB] opacity-80 translate-y-[4px]";
            dynamicStyle = { boxShadow: "0 0px 0 0 #E5E5E5" };
            activeState = "";
          }

          return (
            <button
              key={opt.id}
              disabled={isChecked}
              onClick={() => handleSelect(opt.back)}
              className={`relative w-full p-4 px-6 rounded-[16px] flex items-center transition-all duration-150 outline-none select-none ${containerClass} ${activeState}`}
              style={dynamicStyle}
            >
              <div className={`w-8 h-8 shrink-0 rounded-[8px] border-[3px] flex items-center justify-center mr-4 font-bold text-sm ${isSelected ? 'border-current bg-white/20' : 'border-[#E5E5E5] text-[#AFB6BB]'}`}>
                {i + 1}
              </div>
              <span className="flex-1 text-[19px] font-bold leading-tight text-left">
                {opt.back}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export const QuizChoices: React.FC<QuizModeProps> = ({ cards, onEnd, activeBookId, sessionKey }) => {
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [activeMemoryHook, setActiveMemoryHook] = useState<any | null>(null);
  const {
    activeCards,
    currentIndex,
    currentCard,
    options,
    selectedOption,
    setSelectedOption,
    isChecked,
    isCorrect,
    handleCheck,
    handleSkip,
    completed,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount
  } = useQuizChoices(cards, sessionKey, onEnd);

  const { setPracticeHeader, setPracticeHeaderActions } = useAppStore();

  React.useEffect(() => {
    setPracticeHeader({
      progress: activeCards.length > 0 ? (currentIndex / activeCards.length) * 100 : 0,
      currentIndex,
      totalCount: activeCards.length,
      showLightbulb: !!currentCard
    });
    setPracticeHeaderActions({
      onLightbulbClick: currentCard ? () => setActiveMemoryHook(currentCard) : undefined,
      onSettingsClick: () => {}
    });
  }, [currentIndex, activeCards.length, currentCard, setActiveMemoryHook, setPracticeHeader, setPracticeHeaderActions]);

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  if (completed) {
    return (
      <LessonComplete
        learnedCount={learnedCount}
        unlearnedCount={unlearnedCount}
        activeBook={activeBook}
        onContinue={onEnd}
        onReviewUnlearned={unlearnedCount > 0 ? reviewUnlearned : undefined}
        onResetAll={resetAll}
      />
    );
  }

  if (!currentCard) return null;

  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F7] overflow-hidden text-[#4B4B4B] font-sans pt-[72px]">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 sm:px-6 pb-[200px] overscroll-none overflow-y-auto">
        <h2 className="text-[26px] font-extrabold text-[#4B4B4B] mt-4 mb-2 tracking-tight text-left w-full px-2">
          Select the correct translation
        </h2>

        <AnimatePresence mode="wait">
          <QuizChoicesCard 
            key={currentCard.id}
            currentCard={currentCard}
            options={options}
            selectedOption={selectedOption}
            isChecked={isChecked}
            handleSelect={setSelectedOption}
            activeBook={activeBook}
          />
        </AnimatePresence>
      </div>

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
