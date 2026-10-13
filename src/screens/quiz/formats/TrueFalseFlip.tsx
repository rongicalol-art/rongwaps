import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import { SAMPLE_BOOKS } from '../../../data/books';
import { PracticeChoiceButton, getPracticeChoiceState, type PracticeChoiceState } from '../../../features/practice';
import { AppIcon } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import { cn } from '../../../utils/cn';
import { CARD_SURFACE_CLASS } from '../../flashcard';
import { QuizHanziPrompt } from '../QuizShell';
import { useQuizShuffle, type QuizHandoff } from '../quizShuffle';
import { PromptAudioButton, useAudioOnMount } from './PickOne';
import { useAppStore } from '../../../store/useAppStore';

interface TrueFalseFlipProps {
  card: Flashcard;
  /** The word whose meaning is shown: the card itself or a distractor. */
  shown: Flashcard;
  isChecked: boolean;
  /** `confusedWithId`: the word mistaken for this one (a wrong Yes). */
  onAnswer: (correct: boolean, confusedWithId?: string) => void;
  onOpenBreakdown: (index: number) => void;
  breakdownOpen: boolean;
  activeBook: (typeof SAMPLE_BOOKS)[number];
  handoff: QuizHandoff | null;
}

type YesNo = 'no' | 'yes';
const ANSWERS: YesNo[] = ['no', 'yes'];

/** Icon and label ink: plain before the answer, then the button's own result colour. */
const INK: Record<PracticeChoiceState, string> = {
  idle: 'text-ui-ink',
  selected: 'text-ui-ink',
  correct: 'text-feedback-success-edge',
  wrong: 'text-feedback-danger-edge',
  muted: 'text-ui-muted',
};

/**
 * Does this hanzi mean this? No or Yes, one tap. The feedback bar then shows the real meaning, and a wrong
 * meaning that was shown is struck through.
 */
export const TrueFalseFlip: React.FC<TrueFalseFlipProps> = ({
  card, shown, isChecked, onAnswer, onOpenBreakdown, breakdownOpen, activeBook, handoff,
}) => {
  const [answer, setAnswer] = useState<YesNo | null>(null);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const reduceMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const landing = useQuizShuffle(handoff, gridRef, promptRef);
  useAudioOnMount(card, !isChecked && !breakdownOpen && !landing);
  const shownIsRight = shown.id === card.id;
  const struck = isChecked && !shownIsRight;
  const selectedClassName = `${activeBook.bg} ${activeBook.accentBorder} ${activeBook.accent}`;

  const choose = (value: YesNo) => {
    if (answer || isChecked) return;
    setAnswer(value);
    onAnswer((value === 'yes') === shownIsRight, value === 'yes' && !shownIsRight ? shown.id : undefined);
  };
  useNumberKeySelection({
    items: ANSWERS,
    onSelect: choose,
    disabled: isChecked || breakdownOpen || landing,
    onDebugAnswer: () => choose(shownIsRight ? 'yes' : 'no'),
  });

  return (
    <motion.div
      initial={handoff || reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="flex w-full flex-col gap-4 will-change-transform"
    >
      <div
        ref={promptRef}
        data-quiz-card
        className={cn(CARD_SURFACE_CLASS, 'relative flex h-50 w-full flex-col items-center justify-center gap-3 sm:h-60 [@media(min-height:960px)]:md:h-70')}
      >
        <QuizHanziPrompt front={card.front} onOpenBreakdown={onOpenBreakdown} className="" />
        <span aria-hidden="true" className="h-0.5 w-24 rounded-full bg-ui-divider" />
        <span className={cn('px-6 text-center text-2xl font-extrabold leading-snug sm:text-3xl', struck ? 'text-ui-muted line-through' : 'text-ui-ink')}>
          {(simpleDefinitions && shown.simple) ? shown.simple : shown.back}
        </span>
        {card.audio && <PromptAudioButton card={card} className="absolute right-2 top-2" />}
      </div>

      <div ref={gridRef} className={cn('grid w-full grid-cols-2 gap-3', landing && 'pointer-events-none')}>
        {ANSWERS.map((value) => {
          const state = getPracticeChoiceState(answer === value, isChecked, (value === 'yes') === shownIsRight);
          return (
            <PracticeChoiceButton
              key={value}
              compact
              state={state}
              disabled={isChecked}
              onClick={() => choose(value)}
              aria-label={value === 'yes' ? 'Yes, it means this' : 'No, it does not'}
              selectedClassName={selectedClassName}
              selectedEdgeColor={activeBook.accentHex}
            >
              <span className={cn('flex items-center justify-center gap-2.5 py-1 font-black', INK[state])}>
                <AppIcon name={value === 'yes' ? 'answerYes' : 'answerNo'} size={26} />
                {value === 'yes' ? 'Yes' : 'No'}
              </span>
            </PracticeChoiceButton>
          );
        })}
      </div>
    </motion.div>
  );
};
