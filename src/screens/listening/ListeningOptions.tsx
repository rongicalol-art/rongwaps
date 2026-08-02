import { PracticeChoiceButton, type PracticeChoiceState } from '../../lib/widgets';
import type { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface ListeningOptionsProps {
  options: string[];
  selectedOption: string | null;
  onSelect: (opt: string) => void;
  isChecked: boolean;
  currentCard: Flashcard;
  activeBook: CourseBook;
}

export function ListeningOptions({
  options,
  selectedOption,
  onSelect,
  isChecked,
  currentCard,
  activeBook
}: ListeningOptionsProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((opt, i) => {
        const isSelected = selectedOption === opt;
        const isCorrectOption = opt === currentCard.back;

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
            key={i}
            index={i}
            state={state}
            disabled={isChecked}
            onClick={() => onSelect(opt)}
            selectedClassName={`${activeBook.bg} ${activeBook.accentBorder} ${activeBook.accent}`}
            selectedEdgeColor={activeBook.accentHex}
          >
            {opt}
          </PracticeChoiceButton>
        )
      })}
    </div>
  );
}
