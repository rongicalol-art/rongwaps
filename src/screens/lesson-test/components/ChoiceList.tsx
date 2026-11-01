import { PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { LessonTestQuestion, TestChoice } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';

export type Script = 'traditional' | 'simplified';

/** Bars standing in for an answer that is only heard; they light up while it is read. */
export function WaveBars({ seed, active }: { seed: number; active: boolean }) {
  return (
    <span aria-hidden className="flex h-7 flex-1 items-center gap-[3px]">
      {Array.from({ length: 22 }, (_, index) => (
        <span
          key={index}
          style={{ height: `${30 + Math.round(60 * Math.abs(Math.sin((index + seed * 7) * 1.7)))}%` }}
          className={cn('w-[4px] rounded-full transition-colors duration-200', active ? 'bg-brand-primary' : 'bg-ui-border')}
        />
      ))}
    </span>
  );
}

export const choiceText = (choice: TestChoice, script: Script) => choice[script] ?? choice.traditional ?? '';

interface ChoiceListProps {
  question: LessonTestQuestion;
  order: number[];
  selected: number | undefined;
  checked: boolean;
  /** Spoken answers show as sound bars until the question is checked. */
  spoken: boolean;
  /** Display position being read aloud. */
  mark: number | null;
  script: Script;
  onSelect: (original: number) => void;
}

/** A/B/C answers in their shuffled order (TOCFL letters; keys 1–4 still pick them). */
export function ChoiceList({ question, order, selected, checked, spoken, mark, script, onSelect }: ChoiceListProps) {
  const choices = question.choices ?? [];
  useNumberKeySelection({ items: order, onSelect, disabled: checked });
  return (
    <div className="grid w-full grid-cols-1 gap-3">
      {order.map((original, shown) => {
        const choice = choices[original];
        const state = getPracticeChoiceState(selected === original, checked, original === question.key);
        const reveal = !spoken || checked;
        return (
          <PracticeChoiceButton
            key={original}
            index={shown}
            badge="letter"
            state={state}
            disabled={checked}
            aria-label={reveal ? undefined : `Answer ${'ABCD'[shown]}`}
            onClick={() => onSelect(original)}
          >
            {reveal ? (
              <span className="font-chinese text-[21px] font-normal leading-snug text-ui-ink-strong">{choiceText(choice, script)}</span>
            ) : (
              <WaveBars seed={shown} active={mark === shown} />
            )}
          </PracticeChoiceButton>
        );
      })}
    </div>
  );
}
