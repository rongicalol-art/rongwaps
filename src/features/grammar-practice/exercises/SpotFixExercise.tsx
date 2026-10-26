import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { SpotFixItem } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { checkSpotFix } from '../../../utils/grammar/grammarPracticePicks';
import { PracticeChoiceButton } from '../../practice';
import { PracticePrompt } from '../components/PracticePrompt';
import { PracticeTileButton } from '../components/PracticeTileButton';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

/** Find the word first, then repair it. The corrected sentence appears only in feedback. */
export function SpotFixExercise({
  item, script, status, retryKey, shortcutsDisabled, trayHost, onResult,
}: PracticeExerciseProps<SpotFixItem>) {
  const [picked, setPicked] = useState<number | null>(null);
  const locked = status !== 'idle';
  const repairing = picked === item.wrong;

  useEffect(() => {
    if (retryKey > 0) setPicked((current) => current === item.wrong ? current : null);
  }, [item.wrong, retryKey]);

  const chooseWord = (index: number) => {
    if (locked) return;
    setPicked(index);
    if (index !== item.wrong) onResult(checkSpotFix(item, index, null));
  };
  const repair = (choice: string | null) => {
    if (locked || !repairing) return;
    const verdict = checkSpotFix(item, picked, choice);
    onResult(verdict.correct ? { ...verdict, sentence: item.result } : verdict);
  };
  const choices = [...item.tiles.map((tile) => tile.traditional), null];
  useNumberKeySelection<string | number | null>({
    items: repairing ? choices : item.chunks.map((_, index) => index),
    onSelect: (choice) => typeof choice === 'number' ? chooseWord(choice) : repair(choice),
    disabled: locked || shortcutsDisabled,
  });

  return (
    <div className="flex flex-col gap-6">
      <PracticePrompt sub={item.sub} />
      <p className="text-sm font-extrabold text-ui-muted-strong">
        {repairing ? 'Choose a replacement, or take the word out.' : 'Tap the word that needs fixing.'}
      </p>
      <div className="flex flex-wrap items-baseline justify-center gap-x-1 gap-y-3 font-chinese text-2xl font-semibold leading-relaxed text-ui-ink-strong sm:text-3xl">
        {item.chunks.map((chunk, index) => (
          <Fragment key={index}>
            <button
              type="button"
              disabled={locked}
              onClick={() => chooseWord(index)}
              aria-label={`Fix ${textIn(chunk, script)}`}
              aria-pressed={picked === index}
              className={cn(
                'rounded-xs border-b-2 px-1.5 py-1 focus-ring-inline enabled:hover:bg-ui-hover',
                picked === index ? 'border-brand-primary bg-brand-primary-soft text-brand-primary-deep' : 'border-ui-divider',
                picked === index && status === 'wrong' && 'border-feedback-danger text-feedback-danger-edge',
              )}
            >
              {textIn(chunk, script)}
            </button>
            {chunk.tail && <span>{chunk.tail}</span>}
          </Fragment>
        ))}
      </div>
      {trayHost && repairing && !locked && createPortal(
        <>
          {item.tiles.map((tile, index) => (
            <PracticeTileButton key={index} tile={tile} script={script} onClick={() => repair(tile.traditional)} />
          ))}
          <PracticeChoiceButton compact onClick={() => repair(null)} className="w-auto">
            Take it out
          </PracticeChoiceButton>
        </>,
        trayHost,
      )}
    </div>
  );
}
