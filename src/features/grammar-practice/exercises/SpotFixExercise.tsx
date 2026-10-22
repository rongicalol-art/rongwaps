import { useEffect, useMemo, useState } from 'react';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { SpotFixItem } from '../../../types/models';
import { PracticeChoiceButton, type PracticeChoiceState } from '../../practice';
import { PracticePrompt } from '../components/PracticePrompt';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

/**
 * Spot the mistake as one tap: the friend's sentence beside the corrected one, in a fixed but
 * mixed order. A right tap is the answer; the wrong one says what is off with it.
 */
export function SpotFixExercise({
  item, script, status, retryKey, shortcutsDisabled, onResult,
}: PracticeExerciseProps<SpotFixItem>) {
  const [picked, setPicked] = useState<number | null>(null);
  const locked = status !== 'idle';
  const written = item.chunks.map((chunk) => textIn(chunk, script) + (chunk.tail ?? '')).join('');
  // Which side the right sentence sits on follows the item, so a retry shows the same layout.
  const options = useMemo(() => {
    const right = { text: textIn(item.result, script), correct: true };
    const wrong = { text: written, correct: false };
    return [...item.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0 ? [right, wrong] : [wrong, right];
  }, [item.id, item.result, script, written]);

  useEffect(() => { if (retryKey > 0) setPicked(null); }, [retryKey]);

  const choose = (index: number) => {
    if (locked) return;
    setPicked(index);
    onResult(options[index].correct
      ? { correct: true, sentence: item.result, note: item.successNote }
      : { correct: false, title: 'Not quite', note: item.hint });
  };
  useNumberKeySelection({ items: [0, 1], onSelect: choose, disabled: locked || shortcutsDisabled });

  const stateOf = (index: number): PracticeChoiceState => {
    if (picked !== index) return 'idle';
    return options[index].correct ? 'correct' : 'wrong';
  };

  return (
    <div className="flex flex-col gap-6">
      <PracticePrompt sub={item.sub} />
      <div className="flex flex-col gap-3">
        {options.map((option, index) => (
          <PracticeChoiceButton key={index} index={index} state={stateOf(index)} disabled={locked} onClick={() => choose(index)}>
            <span className="flex min-h-14 w-full items-center px-3 py-2 font-chinese text-2xl leading-snug sm:text-3xl">{option.text}</span>
          </PracticeChoiceButton>
        ))}
      </div>
    </div>
  );
}
