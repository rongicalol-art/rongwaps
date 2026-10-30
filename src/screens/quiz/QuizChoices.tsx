import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { PracticeChoiceButton, getPracticeChoiceState } from '../../features/practice';
import { useQuizChoices } from './hooks/useQuiz';
import { QuizHanziPrompt, QuizShell, type QuizModeProps } from './QuizShell';
import { useAppStore, type QuizQuestionType, type QuizChoiceType } from '../../store/useAppStore';
import { useNumberKeySelection } from '../../hooks/useNumberKeySelection';
import { getCardChoiceTarget } from '../../utils/vocabulary/meaningChoices';
import { useQuizShuffle, type QuizHandoff } from './quizShuffle';
import { CARD_SURFACE_CLASS } from '../flashcard';
import { cn } from '../../utils/cn';

interface QuizChoicesCardProps {
  currentCard: Flashcard;
  options: Flashcard[];
  selectedOption: string | null;
  isChecked: boolean;
  handleSelect: (opt: string) => void;
  activeBook: (typeof SAMPLE_BOOKS)[number];
  onOpenBreakdown: (index: number) => void;
  breakdownOpen: boolean;
  questionType: QuizQuestionType;
  choiceType: QuizChoiceType;
  /** Set only on the first question after Cards done or a review intro: lands that ghost card instead of the entrance. */
  handoff: QuizHandoff | null;
}

const QuizChoicesCard: React.FC<QuizChoicesCardProps> = ({
  currentCard, options, selectedOption, isChecked, handleSelect, activeBook, onOpenBreakdown, breakdownOpen, questionType, choiceType, handoff,
}) => {
  const reduceMotion = useReducedMotion();
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const gridRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const landing = useQuizShuffle(handoff, gridRef, promptRef);
  useNumberKeySelection({
    items: options,
    onSelect: (option) => handleSelect(getCardChoiceTarget(option, choiceType, simpleDefinitions)),
    disabled: isChecked || breakdownOpen || landing,
    onDebugAnswer: () => {
      const correctOption = options.find((option) => option.id === currentCard.id);
      if (correctOption) handleSelect(getCardChoiceTarget(correctOption, choiceType, simpleDefinitions));
    },
  });

  return (
    <motion.div
      initial={handoff || reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="flex w-full flex-col gap-5"
    >
      {/* The word lives on a flashcard-style card: the shuffle's top card lands on it. */}
      <div
        ref={promptRef}
        data-quiz-card
        className={cn(CARD_SURFACE_CLASS, 'flex h-[176px] w-full items-center justify-center sm:h-[220px] [@media(min-height:960px)]:md:h-[260px]')}
      >
        {questionType === 'hanzi' && (
          <QuizHanziPrompt front={currentCard.front} onOpenBreakdown={onOpenBreakdown} className="" />
        )}
        {questionType === 'pinyin' && (
          <span className="px-4 text-center text-4xl font-extrabold tracking-normal text-ui-ink sm:text-5xl">{currentCard.pinyin}</span>
        )}
        {questionType === 'meaning' && (
          <span className="px-6 text-center text-2xl font-extrabold leading-snug text-ui-ink sm:text-3xl">
            {(simpleDefinitions && currentCard.simple) ? currentCard.simple : currentCard.back}
          </span>
        )}
      </div>

      <div ref={gridRef} className={`grid w-full grid-cols-1 gap-3${landing ? ' pointer-events-none' : ''}`}>
        {options.map((opt, i) => {
          const optionValue = getCardChoiceTarget(opt, choiceType, simpleDefinitions);
          const isSelected = selectedOption === optionValue;
          const isCorrectOption = opt.id === currentCard.id;

          const state = getPracticeChoiceState(isSelected, isChecked, isCorrectOption);

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

const CHOICE_TITLES: Record<QuizChoiceType, string> = {
  meaning: 'Select the meaning',
  hanzi: 'Select the character',
  pinyin: 'Select the pinyin',
};

export const QuizChoices: React.FC<QuizModeProps> = ({ cards, sessionKey, ...shell }) => {
  const session = useQuizChoices(cards, sessionKey);
  const { currentCard, options, selectedOption, handleSelect, isChecked, isCorrect } = session;
  const quizQuestionType = useAppStore((state) => state.quizQuestionType);
  const quizChoiceType = useAppStore((state) => state.quizChoiceType);
  const showPinyin = useAppStore((state) => state.showPinyin);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const activeBook = SAMPLE_BOOKS.find((b) => b.id === shell.activeBookId) || SAMPLE_BOOKS[0];

  return (
    <QuizShell
      {...shell}
      session={session}
      mode="quiz-choices"
      title={CHOICE_TITLES[quizChoiceType]}
      wide
      status={!isChecked ? 'idle' : isCorrect ? 'correct' : 'wrong'}
      correctAnswer={currentCard ? getCardChoiceTarget(currentCard, quizChoiceType, simpleDefinitions) : ''}
      pinyin={showPinyin ? currentCard?.pinyin : undefined}
      word={currentCard ? { hanzi: currentCard.front, pinyin: currentCard.pinyin, meaning: currentCard.back, simple: simpleDefinitions ? currentCard.simple : undefined } : undefined}
      isCheckDisabled={!selectedOption}
      landsReviewGhost
    >
      {({ openBreakdown, breakdownOpen, reviewHandoff, isReviewPass }) => (
        <QuizChoicesCard
          currentCard={currentCard}
          options={options}
          selectedOption={selectedOption}
          isChecked={isChecked}
          handleSelect={handleSelect}
          activeBook={activeBook}
          onOpenBreakdown={openBreakdown}
          breakdownOpen={breakdownOpen}
          questionType={quizQuestionType}
          choiceType={quizChoiceType}
          handoff={isReviewPass ? reviewHandoff : null}
        />
      )}
    </QuizShell>
  );
};
