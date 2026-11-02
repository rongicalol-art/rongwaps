import { PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { LessonTestQuestion } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { ChineseText } from './ChineseText';
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
  const longest = Math.max(...choices.map((choice) => [...choiceText(choice, script)].length));
  useNumberKeySelection({ items: order, onSelect, disabled: checked });

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <p className="text-balance text-center font-chinese text-2xl leading-loose text-ui-ink-strong md:text-3xl">
        <ChineseText text={before} />
        <span
          className={cn(
            'mx-1 inline-block min-w-12 border-b-3 px-1 text-center align-baseline leading-tight',
            !checked && 'border-brand-primary text-brand-primary-text',
            checked && !wrong && 'border-feedback-success text-feedback-success-text',
            wrong && 'border-feedback-danger text-feedback-danger-text',
          )}
        >
          {wrong ? <><s className="opacity-60">{filled}</s> <span className="text-feedback-success-text">{choiceText(choices[question.key], script)}</span></> : filled || ' '}
        </span>
        <ChineseText text={afterMain} />
        {/* A reply (authored after ——) is its own line: a dash there read as a second blank. */}
        {reply.length > 0 && <span className="block text-ui-muted-strong"><ChineseText text={reply.join(' ')} /></span>}
      </p>
      {/* Three across with the letter and word centred together; on phones, words over two characters (prices, phrases) stack as a list. */}
      <div className={cn('grid w-full gap-3 sm:grid-cols-3', longest > 3 ? 'max-w-2xl' : 'max-w-md', longest > 2 ? 'grid-cols-1' : 'grid-cols-3')}>
        {order.map((original, shown) => (
          <PracticeChoiceButton
            key={original}
            index={shown}
            badge="letter"
            align={longest > 2 ? 'start' : 'center'}
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
