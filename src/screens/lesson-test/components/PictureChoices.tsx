import { PracticeChoiceButton, getPracticeChoiceState, type PracticeChoiceState } from '../../../features/practice';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { LessonTestQuestion } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { testPicture } from '../testPictures';

const BADGE: Record<PracticeChoiceState, string> = {
  idle: 'border-ui-divider text-ui-muted',
  selected: 'border-brand-primary bg-brand-primary text-brand-on-primary',
  correct: 'border-feedback-success text-feedback-success',
  wrong: 'border-feedback-danger text-feedback-danger',
  muted: 'border-ui-divider text-ui-muted',
};

interface PictureChoicesProps {
  question: LessonTestQuestion;
  order: number[];
  selected: number | undefined;
  checked: boolean;
  onSelect: (original: number) => void;
}

/** Three pictures side by side at every size (they are compared at a glance). The letter sits under the picture, never on it. */
export function PictureChoices({ question, order, selected, checked, onSelect }: PictureChoicesProps) {
  const choices = question.choices ?? [];
  useNumberKeySelection({ items: order, onSelect, disabled: checked });
  return (
    <div className="grid w-full grid-cols-3 gap-2.5 sm:gap-5">
      {order.map((original, shown) => {
        const choice = choices[original];
        const state = getPracticeChoiceState(selected === original, checked, original === question.key);
        return (
          <PracticeChoiceButton
            key={original}
            compact
            state={state}
            disabled={checked}
            aria-label={`${'ABCD'[shown]}: ${choice.alt ?? ''}`}
            onClick={() => onSelect(original)}
            className="[&>span:last-child]:!px-1.5 [&>span:last-child]:!pb-2.5 [&>span:last-child]:!pt-1.5 sm:[&>span:last-child]:!px-2 sm:[&>span:last-child]:!pt-2"
          >
            <span className="flex w-full flex-col items-center gap-2">
              <img src={testPicture(choice.picture)} alt="" draggable={false} className="block h-auto w-full select-none rounded-sm" />
              <span className={cn('flex size-5.5 shrink-0 items-center justify-center rounded-xs border-2 text-xs font-black', BADGE[state])}>
                {'ABCD'[shown]}
              </span>
            </span>
          </PracticeChoiceButton>
        );
      })}
    </div>
  );
}
