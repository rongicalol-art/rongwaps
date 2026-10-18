import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { SpotFixItem } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { checkSpotFix } from '../../../utils/grammar/grammarPracticePicks';
import { PracticeChoiceButton } from '../../practice';
import { PracticePrompt } from '../components/PracticePrompt';
import { PracticeTileButton } from '../components/PracticeTileButton';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

/** The choice that takes the tapped word out of the sentence (every other choice is a tile index). */
const TAKE_OUT = -1;

/**
 * Spot the mistake: a friend's sentence, one word wrong. Tap that word and it lifts; the
 * dock offers replacements plus "Take it out" (always, so it never hints at an extra word).
 * Check says whether the right word was found and whether the fix is right.
 */
export function SpotFixExercise({
  item, script, status, retryKey, shortcutsDisabled, trayHost, onReadyChange, checkRef, onResult,
}: PracticeExerciseProps<SpotFixItem>) {
  const [pick, setPick] = useState<number | null>(null);
  /** A tile index, TAKE_OUT, or null while nothing is chosen. */
  const [choice, setChoice] = useState<number | null>(null);
  const locked = status !== 'idle';
  const ready = !locked && pick !== null && choice !== null;
  const choices = [...item.tiles.keys(), TAKE_OUT];

  useEffect(() => onReadyChange(ready), [onReadyChange, ready]);
  useEffect(() => {
    checkRef.current = ready
      ? () => {
        const verdict = checkSpotFix(item, pick, choice === TAKE_OUT ? null : item.tiles[choice].traditional);
        onResult(verdict.correct
          ? { correct: true, sentence: item.result, note: verdict.note }
          : { correct: false, title: verdict.title, note: verdict.note });
      }
      : null;
    return () => { checkRef.current = null; };
  });

  // Try again: the fix goes back to the dock; the word stays lifted only if it was the right one.
  useEffect(() => {
    if (retryKey === 0) return;
    setChoice(null);
    setPick((previous) => (previous === item.wrong ? previous : null));
  }, [item.wrong, retryKey]);

  const tap = (index: number) => {
    if (locked) return;
    setPick((previous) => (previous === index ? null : index));
    setChoice(null);
  };
  useNumberKeySelection({ items: choices, onSelect: setChoice, disabled: locked || shortcutsDisabled || pick === null });

  return (
    <>
      <div className="flex flex-col gap-7">
        <PracticePrompt sub={item.sub} />
        <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 font-chinese text-3xl leading-normal text-ui-ink-strong sm:text-4xl">
          {item.chunks.map((chunk, index) => {
            const lifted = pick === index;
            const replaced = lifted && choice !== null ? choice : null;
            return (
              <span key={index} className="whitespace-nowrap">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => tap(index)}
                  aria-pressed={lifted}
                  className={cn(
                    'rounded-control border-2 px-2 py-0.5 transition-colors focus-ring-inline',
                    !lifted && 'border-transparent enabled:hover:bg-ui-hover',
                    lifted && status === 'idle' && 'border-brand-primary bg-brand-primary-soft',
                    lifted && status === 'correct' && 'border-feedback-success bg-feedback-success-surface',
                    lifted && status === 'wrong' && 'border-feedback-danger bg-feedback-danger-surface',
                    replaced === TAKE_OUT && 'text-ui-muted line-through decoration-[3px]',
                  )}
                >
                  {replaced !== null && replaced !== TAKE_OUT ? textIn(item.tiles[replaced], script) : textIn(chunk, script)}
                </button>
                {chunk.tail && <span className="-ml-2">{chunk.tail}</span>}
              </span>
            );
          })}
        </p>
      </div>
      {trayHost && pick !== null && createPortal(
        <>
          {item.tiles.map((tile, index) => (
            <PracticeTileButton key={tile.traditional} tile={tile} script={script} disabled={locked} selected={choice === index} onClick={() => setChoice(index)} />
          ))}
          <div className="shrink-0 select-none">
            <PracticeChoiceButton compact disabled={locked} state={choice === TAKE_OUT ? 'selected' : 'idle'} onClick={() => setChoice(TAKE_OUT)} className="w-auto">
              <span className="text-base font-extrabold leading-none">Take it out</span>
            </PracticeChoiceButton>
          </div>
        </>,
        trayHost,
      )}
    </>
  );
}
