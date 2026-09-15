import { PracticeChoiceButton, type PracticeChoiceState } from '../../features/practice';
import type { Flashcard } from '../../data/flashcards';
import { SAMPLE_BOOKS } from '../../data/books';
import { getCardChoiceTarget } from '../../utils/meaningChoices';
import type { ListeningChoiceType } from '../../store/usePracticePreferencesStore';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface ListeningOptionsProps {
  options: string[];
  selectedOption: string | null;
  onSelect: (opt: string) => void;
  isChecked: boolean;
  currentCard: Flashcard;
  activeBook: CourseBook;
  choiceType?: ListeningChoiceType;
}

export function ListeningOptions({
  options,
  selectedOption,
  onSelect,
  isChecked,
  currentCard,
  activeBook,
  choiceType = 'meaning',
}: ListeningOptionsProps) {
  const correctTarget = getCardChoiceTarget(currentCard, choiceType);

  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((opt, i) => {
        const isSelected = selectedOption === opt;
        const isCorrectOption = opt === correctTarget;

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
            <span className={choiceType === 'hanzi' ? 'font-chinese text-2xl font-bold sm:text-3xl' : ''}>
              {opt}
            </span>
          </PracticeChoiceButton>
        );
      })}
    </div>
  );
}
