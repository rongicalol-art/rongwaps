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
import { useQuizTyping } from './hooks/useQuiz';
import { useAppStore } from '../../store/useAppStore';

interface QuizModeProps {
  cards: Flashcard[];
  onEnd: () => void;
  activeBookId: number;
  sessionKey: string;
}

interface QuizTypingCardProps {
  currentCard: Flashcard;
  input: string;
  status: 'idle' | 'correct' | 'wrong';
  setInput: (val: string) => void;
  handleCheck: (e?: React.FormEvent) => void;
  activeBook: any;
}

const QuizTypingCard: React.FC<QuizTypingCardProps> = ({
  currentCard, input, status, setInput, handleCheck, activeBook
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
      <div className="flex flex-col items-center justify-center py-8 mb-4 w-full">
         <h2 className={`${getFrontFontSize(frontLength)} leading-tight font-chinese text-[#4B4B4B] text-center break-words w-full px-4`}>
           {currentCard.front}
         </h2>
      </div>

      <form onSubmit={handleCheck} className="w-full relative px-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={status !== 'idle'}
          className={`w-full p-6 text-[22px] font-bold text-left bg-[#F7F7F7] border-[3px] border-[#E5E5E5] rounded-[20px] outline-none transition-all duration-200 placeholder-[#AFB6BB] focus:bg-white focus:ring-[3px] focus:ring-[#E5E5E5] text-[#4B4B4B]`}
          style={{ '--tw-ring-color': activeBook.accentHex, borderColor: status === 'idle' && input ? activeBook.accentHex : undefined } as any}
          placeholder="Your answer..."
          autoFocus
        />
      </form>
    </motion.div>
  );
};

export const QuizTyping: React.FC<QuizModeProps> = ({ cards, onEnd, activeBookId, sessionKey }) => {
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [activeMemoryHook, setActiveMemoryHook] = useState<any | null>(null);
  const {
    activeCards,
    currentIndex,
    currentCard,
    input,
    setInput,
    status,
    handleCheck,
    handleSkip,
    completed,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount
  } = useQuizTyping(cards, sessionKey, onEnd);

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
        <h2 className="text-[26px] font-extrabold text-[#4B4B4B] mt-4 mb-8 tracking-tight text-left w-full px-2">
          Type the pinyin or meaning
        </h2>

        <AnimatePresence mode="wait">
          <QuizTypingCard 
            key={currentCard.id}
            currentCard={currentCard}
            input={input}
            status={status}
            setInput={setInput}
            handleCheck={handleCheck}
            activeBook={activeBook}
          />
        </AnimatePresence>
      </div>

      <FeedbackBottomBar 
        status={status}
        correctAnswer={currentCard.back}
        pinyin={currentCard.pinyin}
        onContinue={() => handleCheck()}
        onCheck={() => handleCheck()}
        isCheckDisabled={!input.trim()}
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
