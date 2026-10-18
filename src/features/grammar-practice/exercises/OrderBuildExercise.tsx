import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGroup, motion } from 'motion/react';
import { ContextualChineseText } from '../../../lib/widgets';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { ListenBuildItem, OrderBuildItem } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { checkOrderBuild } from '../../../utils/grammar/grammarPracticeSequence';
import { PracticePrompt } from '../components/PracticePrompt';
import { PracticeScene } from '../components/PracticeScene';
import { PracticeTileButton } from '../components/PracticeTileButton';
import { WORD_FLIGHT } from '../practiceMotion';
import { textIn, type PracticeExerciseProps } from '../practiceTypes';

/**
 * Build the sentence: the title says what to say, the words wait in the dock, and tapping
 * them lays them on one free line. There are no blanks, so the line never shows how many
 * words are right; tap a placed word to take it back. `listen-build` is the same line with
 * a recording above it (`children`) in place of a picture.
 */
export function OrderBuildExercise({
  item, script, status, retryKey, showPinyin, contextTokens, onOpenWord, shortcutsDisabled, trayHost, onReadyChange, checkRef, onResult, children,
}: PracticeExerciseProps<OrderBuildItem | ListenBuildItem> & { children?: ReactNode }) {
  /** Tile indexes on the line, in order. */
  const [line, setLine] = useState<number[]>([]);
  const locked = status !== 'idle';
  const ready = !locked && line.length > 0;
  const bank = item.tiles.map((_, index) => index).filter((index) => !line.includes(index));
  const layoutId = (tile: number) => `${item.id}-tile-${tile}`;
  const order = line.map((tile) => item.tiles[tile].traditional);
  const verdict = checkOrderBuild(item, order);
  const misplaced = status === 'wrong' ? new Set(verdict.positions) : null;

  useEffect(() => onReadyChange(ready), [onReadyChange, ready]);
  useEffect(() => {
    checkRef.current = ready
      ? () => {
        onResult(verdict.correct && verdict.answer
          ? { correct: true, sentence: verdict.answer.sentence, note: verdict.note }
          : { correct: false, title: verdict.title, note: verdict.note });
      }
      : null;
    return () => { checkRef.current = null; };
  });

  // Try again: the line empties back into the dock (the order is the answer, so start it fresh).
  useEffect(() => {
    if (retryKey > 0) setLine([]);
  }, [retryKey]);

  const add = (tile: number) => { if (!locked) setLine((previous) => [...previous, tile]); };
  const remove = (tile: number) => { if (!locked) setLine((previous) => previous.filter((placed) => placed !== tile)); };
  useNumberKeySelection({ items: bank, onSelect: add, disabled: locked || shortcutsDisabled });

  return (
    <LayoutGroup id={`order-${item.id}`}>
      <div className="flex flex-col gap-7">
        <PracticePrompt sub={item.sub} />
        {children}
        {item.kind === 'order-build' && item.scene && (
          <PracticeScene
            scene={item.scene}
            arrived={status === 'correct'}
            renderChinese={(text) => <ContextualChineseText text={textIn(text, script)} tokens={contextTokens} characterPreference={script} onOpenWord={onOpenWord} />}
          />
        )}
        <div
          className={cn(
            'flex min-h-24 flex-wrap items-end justify-center gap-x-1.5 border-b-[3px] pb-2 transition-colors',
            status === 'idle' && 'border-ui-divider',
            status === 'correct' && 'border-feedback-success',
            status === 'wrong' && 'border-feedback-danger',
          )}
        >
          {line.map((tile, position) => (
            <motion.button
              key={tile}
              type="button"
              layout="position"
              layoutId={layoutId(tile)}
              transition={WORD_FLIGHT}
              disabled={locked}
              onClick={() => remove(tile)}
              aria-label={`Take back ${textIn(item.tiles[tile], script)}`}
              className={cn(
                'flex select-none flex-col items-center rounded-control px-1.5 py-0.5 focus-ring-inline enabled:hover:opacity-75',
                status === 'correct' && 'text-feedback-success-edge',
                misplaced?.has(position) && 'text-feedback-danger-edge',
              )}
            >
              <span className="font-chinese text-3xl leading-[1.3] sm:text-4xl">{textIn(item.tiles[tile], script)}</span>
              {showPinyin && <span className="text-xs font-bold text-ui-muted-strong">{item.tiles[tile].pinyin}</span>}
            </motion.button>
          ))}
        </div>
      </div>
      {trayHost && createPortal(
        bank.map((tile) => (
          <PracticeTileButton key={tile} tile={item.tiles[tile]} script={script} layoutId={layoutId(tile)} disabled={locked} onClick={() => add(tile)} />
        )),
        trayHost,
      )}
    </LayoutGroup>
  );
}
