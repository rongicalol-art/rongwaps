import React from 'react';
import { motion } from 'motion/react';
import { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { PracticeChoiceButton, type PracticeChoiceState } from '../../features/practice';
import { useQuizChoices } from './hooks/useQuiz';
import { QuizHanziPrompt, QuizShell, type QuizModeProps } from './QuizShell';
import { useAppStore, type QuizQuestionType, type QuizChoiceType } from '../../store/useAppStore';
import { useNumberKeySelection } from '../../hooks/useNumberKeySelection';
import { getCardChoiceTarget } from '../../utils/vocabulary/meaningChoices';

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
}

const QuizChoicesCard: React.FC<QuizChoicesCardProps> = ({
  currentCard, options, selectedOption, isChecked, handleSelect, activeBook, onOpenBreakdown, breakdownOpen, questionType, choiceType,
}) => {
  useNumberKeySelection({
    items: options,
    onSelect: (option) => handleSelect(getCardChoiceTarget(option, choiceType)),
    disabled: isChecked || breakdownOpen,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="flex w-full flex-col will-change-transform"
    >
      {questionType === 'hanzi' && (
        <QuizHanziPrompt front={currentCard.front} onOpenBreakdown={onOpenBreakdown} className="py-4 mb-2" />
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
  const activeBook = SAMPLE_BOOKS.find((b) => b.id === shell.activeBookId) || SAMPLE_BOOKS[0];

  return (
    <QuizShell
      {...shell}
      sessionKey={sessionKey}
      session={session}
      mode="quiz-choices"
      title={CHOICE_TITLES[quizChoiceType]}
      wide
      status={!isChecked ? 'idle' : isCorrect ? 'correct' : 'wrong'}
      correctAnswer={currentCard ? getCardChoiceTarget(currentCard, quizChoiceType) : ''}
      pinyin={showPinyin ? currentCard?.pinyin : undefined}
      isCheckDisabled={!selectedOption}
    >
      {({ openBreakdown, breakdownOpen }) => (
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
        />
      )}
    </QuizShell>
  );
};
