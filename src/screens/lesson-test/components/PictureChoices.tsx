import { PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { LessonTestQuestion } from '../../../types/lessonTest';
import { testPicture } from '../testPictures';

interface PictureChoicesProps {
  question: LessonTestQuestion;
  order: number[];
  selected: number | undefined;
  checked: boolean;
  onSelect: (original: number) => void;
}

/** Three pictures side by side at every size (they are compared at a glance), with no letters: nothing reads them out. Keys 1–3 still pick. */
export function PictureChoices({ question, order, selected, checked, onSelect }: PictureChoicesProps) {
  const choices = question.choices ?? [];
  useNumberKeySelection({ items: order, onSelect, disabled: checked });
  return (
    <div className="grid w-full grid-cols-3 gap-2.5 sm:gap-5">
      {order.map((original) => {
        const choice = choices[original];
        return (
          <PracticeChoiceButton
            key={original}
            compact
            state={getPracticeChoiceState(selected === original, checked, original === question.key)}
            disabled={checked}
            aria-label={choice.alt}
            onClick={() => onSelect(original)}
            className="[&>span:last-child]:!p-1.5 sm:[&>span:last-child]:!p-2"
          >
            <img src={testPicture(choice.picture)} alt="" draggable={false} className="block h-auto w-full select-none rounded-sm" />
          </PracticeChoiceButton>
        );
      })}
    </div>
  );
}
