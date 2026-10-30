import { useState } from 'react';
import { FeedbackBottomBar, PracticeChoiceButton } from '../../../features/practice';
import { cn } from '../../../utils/cn';
import { GRAMMAR_ROUNDS } from '../landingContent';
import { shuffle } from './demoUtils';

const scramble = (answer: string[]) => {
  let tiles = shuffle(answer);
  while (tiles.join() === answer.join()) tiles = shuffle(answer);
  return tiles;
};

/** Put a book sentence back in order; tap a filled slot to undo. */
export function GrammarDemo() {
  const [round, setRound] = useState(0);
  const { pattern, key, english, answer } = GRAMMAR_ROUNDS[round];
  const [tiles, setTiles] = useState(() => scramble(answer));
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);

  const done = picked.length === answer.length;
  const isChecked = result !== null;

  const handleCheck = () => {
    if (!done || isChecked) return;
    const correct = picked.map((i) => tiles[i]).join('') === answer.join('');
    setResult(correct);
  };

  const advance = () => {
    if (result) {
      const next = (round + 1) % GRAMMAR_ROUNDS.length;
      setRound(next);
      setTiles(scramble(GRAMMAR_ROUNDS[next].answer));
    }
    setPicked([]);
    setResult(null);
  };

  const status = result === null ? 'idle' : result ? 'correct' : 'wrong';

  return (
    <div className="flex w-full flex-col items-center gap-4 pb-24 sm:pb-28">
      <div className="flex flex-wrap justify-center gap-1.5">
        {pattern.map((part, i) => (
          <span key={i} className={cn('rounded-xs border-2 px-2.5 py-0.5 text-sm font-black', i === key ? 'border-brand-primary font-chinese text-base text-brand-primary-text' : 'border-dashed border-ui-border text-ui-muted-strong')}>
            {part}
          </span>
        ))}
      </div>
      <p className="text-center text-xl font-black text-ui-ink-strong">{english}</p>
      <button type="button" aria-label="Undo the last word" onClick={() => !isChecked && setPicked(picked.slice(0, -1))} className="flex min-h-16 flex-wrap justify-center gap-2">
        {answer.map((_, i) => (
          <span
            key={i}
            className={cn(
              'flex h-14 min-w-14 items-center justify-center rounded-control border-2 px-3 font-chinese text-2xl text-ui-ink-strong',
              picked[i] === undefined ? 'border-dashed border-ui-border' : !isChecked ? 'border-ui-border bg-ui-canvas' : result ? 'border-feedback-success bg-feedback-success-surface' : 'border-feedback-danger bg-feedback-danger-surface',
            )}
          >
            {picked[i] === undefined ? '' : tiles[picked[i]]}
          </span>
        ))}
      </button>
      <div className="flex flex-wrap justify-center gap-2">
        {tiles.map((tile, i) => (
          <PracticeChoiceButton key={`${round}-${i}`} compact className={cn('w-auto', picked.includes(i) && 'invisible')} onClick={() => !isChecked && !done && setPicked([...picked, i])} aria-label={`Use ${tile}`}>
            <span className="min-w-8 font-chinese text-2xl font-semibold text-ui-ink-strong">{tile}</span>
          </PracticeChoiceButton>
        ))}
      </div>

      <FeedbackBottomBar
        status={status}
        layout="stacked"
        correctAnswer={answer.join('')}
        showCheck={!isChecked}
        isCheckDisabled={!done}
        onCheck={handleCheck}
        onContinue={advance}
      />
    </div>
  );
}
