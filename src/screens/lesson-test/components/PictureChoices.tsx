import { PracticeChoiceButton, getPracticeChoiceState, type PracticeChoiceState } from '../../../features/practice';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { LessonTestQuestion } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { testPicture } from '../testPictures';

const BADGE: Record<PracticeChoiceState, string> = {
  idle: 'border-ui-divider text-ui-muted',
  selected: 'border-current text-current',
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

/** Three pictures: a row on wider screens, a column on phones. The letter sits under (or beside) the picture, never on it. */
export function PictureChoices({ question, order, selected, checked, onSelect }: PictureChoicesProps) {
  const choices = question.choices ?? [];
  useNumberKeySelection({ items: order, onSelect, disabled: checked });
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
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
            className="[&>span:last-child]:!px-3 [&>span:last-child]:!py-2.5"
          >
            <span className="flex w-full items-center gap-3 sm:flex-col sm:gap-2">
              <span className={cn('order-first flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-xs border-2 text-xs font-black sm:order-last', BADGE[state])}>
                {'ABCD'[shown]}
              </span>
              <img
                src={testPicture(choice.picture)}
                alt=""
                draggable={false}
                className="h-28 min-w-0 flex-1 rounded-sm object-contain sm:aspect-[4/5] sm:h-auto sm:w-full"
              />
            </span>
          </PracticeChoiceButton>
        );
      })}
    </div>
  );
}
