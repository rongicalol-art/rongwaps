import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { FeedbackBottomBar, LessonComplete, PracticeChoiceButton, PracticeFormatMenu, type PracticeChoiceState } from '../../features/practice';
import { CharacterBreakdownOverlay } from '../../features/character-breakdown';
import { MemoryHookCharacter } from '../../features/character-memory-hooks';
import { useQuizChoices } from './hooks/useQuiz';
import { usePracticeHeaderRegistration } from '../../hooks/usePracticeHeaderRegistration';
import { usePracticeAnswerAutomation } from '../../hooks/usePracticeAnswerAutomation';
import { usePracticePreferencesStore, type QuizQuestionType, type QuizChoiceType } from '../../store/usePracticePreferencesStore';
import { buildPracticePartSegments } from '../../utils/practicePartSegments';
import { isHanziChar } from '../../utils/hanzi';
import { useNumberKeySelection } from '../../hooks/useNumberKeySelection';
import { getCardChoiceTarget } from '../../utils/meaningChoices';

interface QuizModeProps {
  cards: Flashcard[];
  onEnd: () => void;
  onContinue?: () => void;
  continueLabel?: string;
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
  onOpenBreakdown: (index: number) => void;
  questionType: QuizQuestionType;
  choiceType: QuizChoiceType;
}

const QuizChoicesCard: React.FC<QuizChoicesCardProps> = ({
  currentCard, options, selectedOption, isChecked, handleSelect, activeBook, onOpenBreakdown, questionType, choiceType,
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
      {questionType === 'hanzi' && (
        <div className="flex w-full flex-wrap items-center justify-center gap-x-1 py-4 mb-2 px-4">
          {Array.from(currentCard.front).map((char, i) =>
            isHanziChar(char) ? (
              <MemoryHookCharacter
                key={i}
                char={char}
                label={`Open character breakdown for ${char}`}
                onOpen={() => onOpenBreakdown(i)}
                glyphClassName={`${getFrontFontSize(frontLength)} leading-tight text-ui-ink text-center`}
                className="px-1.5 py-1"
              />
            ) : (
              <span key={i} className={`${getFrontFontSize(frontLength)} font-chinese leading-tight text-ui-ink`}>
                {char}
              </span>
            ),
          )}
        </div>
      )}

      {questionType === 'pinyin' && (
        <div className="flex w-full items-center justify-center py-8 mb-2 px-4">
          <span className="text-4xl sm:text-5xl font-extrabold text-ui-ink tracking-normal text-center">
            {currentCard.pinyin}
          </span>
        </div>
      )}

      {questionType === 'meaning' && (
        <div className="flex w-full items-center justify-center py-8 mb-2 px-4">
          <span className="text-2xl sm:text-3xl font-extrabold text-ui-ink text-center leading-snug">
            {currentCard.back}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 w-full pb-4 px-2 sm:px-0">
        {options.map((opt, i) => {
          const optionValue = getCardChoiceTarget(opt, choiceType);
          const isSelected = selectedOption === optionValue;
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
              onClick={() => handleSelect(optionValue)}
              selectedClassName={`${activeBook.bg} ${activeBook.accentBorder} ${activeBook.accent}`}
              selectedEdgeColor={activeBook.accentHex}
            >
              <span className={choiceType === 'hanzi' ? 'font-chinese text-2xl font-bold sm:text-3xl' : ''}>
                {optionValue}
              </span>
            </PracticeChoiceButton>
          );
        })}
      </div>
    </motion.div>
  );
};

export const QuizChoices: React.FC<QuizModeProps> = ({ cards, onEnd, onContinue, continueLabel, activeBookId, sessionKey }) => {
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [breakdownIndex, setBreakdownIndex] = useState(0);
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

  const quizQuestionType = usePracticePreferencesStore((state) => state.quizQuestionType);
  const quizChoiceType = usePracticePreferencesStore((state) => state.quizChoiceType);

  useNumberKeySelection({
    items: options,
    onSelect: (option) => handleSelect(getCardChoiceTarget(option, quizChoiceType)),
    disabled: completed || isChecked || Boolean(activeBreakdown),
  });

  usePracticeAnswerAutomation({
    status: !isChecked ? 'idle' : isCorrect ? 'correct' : 'wrong',
    onAdvance: handleCheck,
    advanceWrong: false,
    blocked: Boolean(activeBreakdown),
  });
  const isNonCurriculum = sessionKey.includes('review') || sessionKey.includes('library');
  const partSegments = useMemo(
    () => (isShuffled || isNonCurriculum ? [] : buildPracticePartSegments(activeCards)),
    [activeCards, isNonCurriculum, isShuffled],
  );

  usePracticeHeaderRegistration({
    currentIndex,
    totalCount: activeCards.length,
    showLightbulb: false,
    partSegments,
    onShuffleClick: toggleShuffle,
    onRestartClick: resetAll,
    isShuffled,
  });

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];
  const showPinyin = usePracticePreferencesStore((state) => state.showPinyin);

  const choiceTitleMap: Record<QuizChoiceType, string> = {
    meaning: 'Select the meaning',
    hanzi: 'Select the character',
    pinyin: 'Select the pinyin',
  };

  if (completed) {
    return (
      <LessonComplete
        learnedCount={learnedCount}
        unlearnedCount={unlearnedCount}
        onContinue={onContinue ?? onEnd}
        continueLabel={onContinue ? continueLabel : undefined}
        onReviewUnlearned={unlearnedCount > 0 ? reviewUnlearned : undefined}
        onResetAll={resetAll}
      />
    );
  }

  if (!currentCard) return null;

  return (
    <div className="relative flex-1 flex flex-col bg-transparent overflow-hidden text-ui-ink font-sans pt-[72px]">
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 sm:px-6 pb-[240px] overscroll-none overflow-y-auto">
        <div className="mt-4 flex w-full items-center gap-2.5 px-2">
          <PracticeFormatMenu mode="quiz-choices" />
          <h2 className="text-xl font-extrabold text-ui-ink sm:text-[26px]">
            {choiceTitleMap[quizChoiceType]}
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
          onOpenBreakdown={(index) => {
            setBreakdownIndex(index);
            setActiveBreakdown(currentCard.front);
          }}
          questionType={quizQuestionType}
          choiceType={quizChoiceType}
        />
      </div>

      <FeedbackBottomBar 
        status={!isChecked ? 'idle' : (isCorrect ? 'correct' : 'wrong')}
        correctAnswer={getCardChoiceTarget(currentCard, quizChoiceType)}
        pinyin={showPinyin ? currentCard.pinyin : undefined}
        onContinue={isCorrect ? handleCheck : retryAnswer}
        showCheck={false}
        isCheckDisabled={!selectedOption}
        hideWhenAutoAdvance={autoAdvance && isChecked}
        showContinueOnWrong
        keyboardShortcutDisabled={Boolean(activeBreakdown)}
        onBreakdown={() => {
          setBreakdownIndex(0);
          setActiveBreakdown(currentCard.front);
        }}
        activeBook={activeBook}
      />

      <CharacterBreakdownOverlay
        activeBreakdown={activeBreakdown}
        initialCharIndex={breakdownIndex}
        onClose={() => setActiveBreakdown(null)}
        activeBook={activeBook}
      />

    </div>
  );
}
