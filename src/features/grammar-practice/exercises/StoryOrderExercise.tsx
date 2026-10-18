import { useEffect, useState } from 'react';
import type { StoryOrderItem } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { checkStoryOrder } from '../../../utils/grammar/grammarPracticeSequence';
import { PracticeChoiceButton, type PracticeChoiceState } from '../../practice';
import { PracticePrompt } from '../components/PracticePrompt';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

/**
 * Story order: short sentences in a column; tap them in the order they happen and each
 * takes the next number. Tap a numbered sentence to take it back (later ones move up).
 * Check once every sentence has its number.
 */
export function StoryOrderExercise({
  item, script, status, retryKey, showPinyin, showTranslation, onReadyChange, checkRef, onResult,
}: PracticeExerciseProps<StoryOrderItem>) {
  /** Step indexes in the order they were tapped. */
  const [chosen, setChosen] = useState<number[]>([]);
  const locked = status !== 'idle';
  const ready = !locked && chosen.length === item.steps.length;

  useEffect(() => onReadyChange(ready), [onReadyChange, ready]);
  useEffect(() => {
    checkRef.current = ready
      ? () => {
        const verdict = checkStoryOrder(item, chosen);
        onResult(verdict.correct ? { correct: true, note: item.successNote } : { correct: false, note: verdict.note });
      }
      : null;
    return () => { checkRef.current = null; };
  });

  // Try again: the numbers clear (the order is the answer, so start it fresh).
  useEffect(() => {
    if (retryKey > 0) setChosen([]);
  }, [retryKey]);

  const tap = (step: number) => {
    if (locked) return;
    setChosen((previous) => (previous.includes(step) ? previous.filter((other) => other !== step) : [...previous, step]));
  };
  const stateOf = (step: number): PracticeChoiceState => {
    const position = chosen.indexOf(step);
    if (position === -1) return 'idle';
    if (status === 'idle') return 'selected';
    return item.answer[position] === step ? 'correct' : 'wrong';
  };

  return (
    <div className="flex flex-col gap-7">
      <PracticePrompt sub={item.sub} />
      <div className="flex flex-col gap-2">
        {item.steps.map((step, index) => {
          const position = chosen.indexOf(index);
          return (
            <PracticeChoiceButton key={index} state={stateOf(index)} disabled={locked} onClick={() => tap(index)}>
              <span className="flex items-center gap-4">
                <span
                  className={cn(
                    'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-xs border-2 text-xs font-black',
                    position === -1 ? 'border-ui-divider' : 'border-current',
                  )}
                >
                  {position === -1 ? '' : position + 1}
                </span>
                <span className="flex flex-col">
                  <span className="font-chinese text-xl leading-snug text-balance">{textIn(step, script)}</span>
                  {showPinyin && <span className="text-xs font-bold text-ui-muted-strong">{step.pinyin}</span>}
                  {showTranslation && <span className="text-xs font-bold text-ui-muted-strong">{step.english}</span>}
                </span>
              </span>
            </PracticeChoiceButton>
          );
        })}
      </div>
    </div>
  );
}
