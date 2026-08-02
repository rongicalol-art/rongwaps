import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar } from '../../lib/widgets/FeedbackBottomBar';
import { CharacterBreakdownOverlay } from '../../lib/widgets/CharacterBreakdownOverlay';
import { LessonComplete } from '../../lib/widgets/LessonComplete';
import { MemoryHookOverlay } from '../flashcard/MemoryHookOverlay';
import { useQuizChoices } from './hooks/useQuiz';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticeAnswerAutomation } from '../../hooks/usePracticeAnswerAutomation';
import { usePracticePreferencesStore } from '../../store/usePracticePreferencesStore';
import { buildPracticePartSegments } from '../../utils/practicePartSegments';
import { PracticeChoiceButton, type PracticeChoiceState } from '../../lib/widgets';
import { useNumberKeySelection } from '../../hooks/useNumberKeySelection';

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
  activeBook: (typeof SAMPLE_BOOKS)[number];
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="flex w-full flex-col will-change-transform"
    >
      <div className="flex flex-col items-center justify-center py-4 mb-2 w-full">
         <h2 className={`${getFrontFontSize(frontLength)} leading-tight font-chinese text-ui-ink text-center break-words w-full px-4`}>
           {currentCard.front}
         </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full pb-[120px] px-2 sm:px-0">
        {options.map((opt, i) => {
          const isSelected = selectedOption === opt.back;
          const isCorrectOption = opt.id === currentCard.id;
          
          let state: PracticeChoiceState = 'idle';
          if (isSelected && !isChecked) {
            state = 'selected';
          } else if (isChecked && isCorrectOption) {
            state = 'correct';
          } else if (isChecked && isSelected && !isCorrectOption) {
            state = 'wrong';
          } else if (isChecked) {
            state = 'muted';
          }

          return (
            <PracticeChoiceButton
              key={opt.id}
              index={i}
              state={state}
              disabled={isChecked}
              onClick={() => handleSelect(opt.back)}
              selectedClassName={`${activeBook.bg} ${activeBook.accentBorder} ${activeBook.accent}`}
              selectedEdgeColor={activeBook.accentHex}
            >
              {opt.back}
            </PracticeChoiceButton>
          );
        })}
      </div>
    </motion.div>
  );
};

export const QuizChoices: React.FC<QuizModeProps> = ({ cards, onEnd, activeBookId, sessionKey }) => {
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [activeMemoryHook, setActiveMemoryHook] = useState<Flashcard | null>(null);
  const {
    activeCards,
    currentIndex,
    currentCard,
    options,
    selectedOption,
    handleSelect,
    isChecked,
    isCorrect,
    handleCheck,
    retryAnswer,
    completed,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount,
    isShuffled,
    toggleShuffle
  } = useQuizChoices(cards, sessionKey);

  const autoAdvanceCorrect = usePracticePreferencesStore((state) => state.autoAdvanceCorrect);
  const autoAdvance = isCorrect ? autoAdvanceCorrect : false;

  useNumberKeySelection({
    items: options,
    onSelect: (option) => handleSelect(option.back),
    disabled: isChecked || Boolean(activeBreakdown || activeMemoryHook),
  });

  usePracticeAnswerAutomation({
    status: !isChecked ? 'idle' : isCorrect ? 'correct' : 'wrong',
    onAdvance: handleCheck,
    advanceWrong: false,
    blocked: Boolean(activeBreakdown || activeMemoryHook),
  });
  const partSegments = useMemo(
    () => (isShuffled ? [] : buildPracticePartSegments(activeCards)),
    [activeCards, isShuffled],
  );

  usePracticeHeaderRegistration({
    currentIndex,
    totalCount: activeCards.length,
    showLightbulb: !!currentCard,
    partSegments,
    onLightbulbClick: currentCard ? () => setActiveMemoryHook(currentCard) : undefined,
    onShuffleClick: toggleShuffle,
    onRestartClick: resetAll,
    isShuffled,
  });

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);

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
    <div className="relative flex-1 flex flex-col bg-transparent overflow-hidden text-ui-ink font-sans pt-[72px]">
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 sm:px-6 pb-[200px] overscroll-none overflow-y-auto">
        <div className="mt-4 flex w-full items-center justify-start px-2">
          <h2 className="text-[24px] font-extrabold text-ui-ink sm:text-[26px]">
            Select the meaning
          </h2>
        </div>

        <QuizChoicesCard
          key={`${currentIndex}:${currentCard.id}`}
          currentCard={currentCard}
          options={options}
          selectedOption={selectedOption}
          isChecked={isChecked}
          handleSelect={handleSelect}
          activeBook={activeBook}
        />
      </div>

      <FeedbackBottomBar 
        status={!isChecked ? 'idle' : (isCorrect ? 'correct' : 'wrong')}
        correctAnswer={currentCard.back}
        pinyin={showPinyin ? currentCard.pinyin : undefined}
        onContinue={isCorrect ? handleCheck : retryAnswer}
        showCheck={false}
        isCheckDisabled={!selectedOption}
        hideWhenAutoAdvance={autoAdvance && isChecked}
        showContinueOnWrong
        keyboardShortcutDisabled={Boolean(activeBreakdown || activeMemoryHook)}
        onBreakdown={() => setActiveBreakdown(currentCard.front)}
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay activeBreakdown={activeBreakdown} onClose={() => setActiveBreakdown(null)} activeBook={activeBook} />

      <MemoryHookOverlay 
        activeMemoryHook={activeMemoryHook}
        setActiveMemoryHook={setActiveMemoryHook}
        activeBook={activeBook}
      />
    </div>
  );
}
