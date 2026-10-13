import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../../data/books';
import { PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import type { MeasureWord } from '../../../utils/vocabulary/quizDirector';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';

const NO_NUMBER_OPTIONS: readonly MeasureWord[] = [];
const ignoreMeasureSelection = () => {};

interface MeasureWordFollowUpProps {
  noun: string;
  answer: MeasureWord;
  choices: MeasureWord[];
  activeBook: (typeof SAMPLE_BOOKS)[number];
  /** Called once a tile is tapped; the follow-up never counts toward progress or SRS. */
  onDone: () => void;
}

/** Bonus after a correct noun: "一 __ 書". Continue skips it. */
export const MeasureWordFollowUp: React.FC<MeasureWordFollowUpProps> = ({ noun, answer, choices, activeBook, onDone }) => {
  const [pickedHanzi, setPickedHanzi] = useState<string | null>(null);
  const pick = (choice: MeasureWord) => {
    if (pickedHanzi) return;
    setPickedHanzi(choice.hanzi);
    onDone();
  };
  useNumberKeySelection({
    items: NO_NUMBER_OPTIONS,
    onSelect: ignoreMeasureSelection,
    disabled: Boolean(pickedHanzi),
    onDebugAnswer: () => pick(answer),
  });
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-md flex-col items-center gap-3"
    >
      <p className="font-chinese text-3xl font-bold text-ui-ink">一 <span className="text-ui-muted">＿＿</span> {noun}</p>
      <div className="grid w-full grid-cols-3 gap-3">
        {choices.map((choice) => (
          <PracticeChoiceButton
            key={choice.hanzi}
            compact
            state={getPracticeChoiceState(pickedHanzi === choice.hanzi, pickedHanzi !== null, choice.hanzi === answer.hanzi)}
            disabled={pickedHanzi !== null}
            onClick={() => pick(choice)}
            selectedClassName={`${activeBook.bg} ${activeBook.accentBorder} ${activeBook.accent}`}
            selectedEdgeColor={activeBook.accentHex}
          >
            <span className="font-chinese text-3xl font-bold">{choice.hanzi}</span>
          </PracticeChoiceButton>
        ))}
      </div>
    </motion.div>
  );
};
