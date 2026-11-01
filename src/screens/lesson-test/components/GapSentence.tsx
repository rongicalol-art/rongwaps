import { PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { LessonTestQuestion } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { choiceText, type Script } from './ChoiceList';

interface GapSentenceProps {
  question: LessonTestQuestion;
  order: number[];
  selected: number | undefined;
  checked: boolean;
  script: Script;
  onSelect: (original: number) => void;
}

/** A sentence with one blank (＿＿); the picked word drops into it. 選詞填空. */
export function GapSentence({ question, order, selected, checked, script, onSelect }: GapSentenceProps) {
  const choices = question.choices ?? [];
  const prompt = question.prompt?.[script] ?? question.prompt?.traditional ?? '';
  const [before, after = ''] = prompt.split('＿＿');
  const [afterMain, ...reply] = after.split('——');
  const filled = selected !== undefined ? choiceText(choices[selected], script) : '';
  const wrong = checked && selected !== question.key;
  const long = choices.some((choice) => choiceText(choice, script).length > 3);
  useNumberKeySelection({ items: order, onSelect, disabled: checked });

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <p className="text-center font-chinese text-2xl leading-[1.9] text-ui-ink-strong md:text-[28px]">
        {before}
        <span
          className={cn(
            'mx-1 inline-block min-w-[2.2em] border-b-[3px] px-1 text-center align-baseline leading-tight',
            !checked && 'border-brand-primary text-brand-primary-text',
            checked && !wrong && 'border-feedback-success text-feedback-success-text',
            wrong && 'border-feedback-danger text-feedback-danger-text',
          )}
        >
          {wrong ? <><s className="opacity-60">{filled}</s> {choiceText(choices[question.key], script)}</> : filled || ' '}
        </span>
        {afterMain}
        {reply.length > 0 && <span className="block text-ui-muted-strong">—— {reply.join('——')}</span>}
      </p>
      {/* Words longer than three characters (prices, phrases) stack on phones instead of breaking letter by letter. */}
      <div className={cn('grid w-full gap-3', long ? 'max-w-2xl grid-cols-1 sm:grid-cols-3' : 'max-w-md grid-cols-3')}>
        {order.map((original, shown) => (
          <PracticeChoiceButton
            key={original}
            index={shown}
            badge="letter"
            state={getPracticeChoiceState(selected === original, checked, original === question.key)}
            disabled={checked}
            onClick={() => onSelect(original)}
            className="[&>span:last-child]:!px-4"
          >
            <span className="whitespace-nowrap font-chinese text-2xl font-normal text-ui-ink-strong">{choiceText(choices[original], script)}</span>
          </PracticeChoiceButton>
        ))}
      </div>
    </div>
  );
}
