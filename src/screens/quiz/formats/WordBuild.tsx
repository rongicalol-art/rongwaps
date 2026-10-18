import React, { useEffect, useState, type MutableRefObject } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import type { Flashcard } from '../../../data/flashcards';
import { SAMPLE_BOOKS } from '../../../data/books';
import { PracticeChoiceButton } from '../../../features/practice';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import { useWordBuildAudio } from '../hooks/useWordBuildAudio';
import { cn } from '../../../utils/cn';
import { CARD_SURFACE_CLASS } from '../../flashcard';
import { useAppStore } from '../../../store/useAppStore';

interface WordBuildProps {
  card: Flashcard;
  /** The answer's characters plus distractors, shuffled (from the director). */
  tiles: string[];
  isChecked: boolean;
  breakdownOpen: boolean;
  activeBook: (typeof SAMPLE_BOOKS)[number];
  onAnswer: (correct: boolean) => void;
  /** Every slot is filled: the feedback bar's Check lights up. */
  onReadyChange: (ready: boolean) => void;
  /** Set to this question's check, which the feedback bar's Check calls. */
  checkRef: MutableRefObject<(() => void) | null>;
}

/** Meaning on the card; tap tiles to fill the word's slots, tap a filled slot to send it back. */
export const WordBuild: React.FC<WordBuildProps> = ({
  card, tiles, isChecked, breakdownOpen, activeBook, onAnswer, onReadyChange, checkRef,
}) => {
  const reduceMotion = useReducedMotion();
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const answer = Array.from(card.front);
  /** Tile index in each slot (null = empty). */
  const [slots, setSlots] = useState<Array<number | null>>(() => answer.map(() => null));
  const ready = slots.every((slot) => slot !== null);
  const nextEmpty = slots.indexOf(null);
  const { playTile, cancelTileAudio, audioError, clearAudioError } = useWordBuildAudio(card, tiles, !isChecked && !breakdownOpen);

  useEffect(() => {
    checkRef.current = ready && !isChecked
      ? () => {
        cancelTileAudio(); // Let the parent's full-word completion playback take over.
        onAnswer(slots.map((tile) => tiles[tile as number]).join('') === card.front);
      }
      : null;
    return () => { checkRef.current = null; };
  }, [cancelTileAudio, card.front, checkRef, isChecked, onAnswer, ready, slots, tiles]);

  const place = (tile: number) => {
    if (isChecked || breakdownOpen || slots.includes(tile)) return;
    const empty = slots.indexOf(null);
    if (empty < 0) return;
    clearAudioError();
    playTile(tiles[tile]);
    const nextSlots = slots.map((slot, i) => (i === empty ? tile : slot));
    setSlots(nextSlots);
    onReadyChange(nextSlots.every((slot) => slot !== null));
  };
  const clear = (slot: number) => {
    if (isChecked) return;
    cancelTileAudio();
    const nextSlots = slots.map((tile, i) => (i === slot ? null : tile));
    setSlots(nextSlots);
    onReadyChange(false);
  };
  const debugAnswer = () => {
    if (isChecked || breakdownOpen) return;
    const used = new Set<number>();
    const solution = answer.map((character) => {
      const index = tiles.findIndex((tile, tileIndex) => tile === character && !used.has(tileIndex));
      if (index >= 0) used.add(index);
      return index;
    });
    if (solution.some((index) => index < 0)) return;
    cancelTileAudio();
    clearAudioError();
    setSlots(solution);
    onReadyChange(true);
    onAnswer(true);
  };
  useNumberKeySelection({
    items: tiles.map((_, i) => i),
    onSelect: place,
    disabled: isChecked || breakdownOpen,
    onDebugAnswer: debugAnswer,
  });
  const tileId = (tile: number) => `word-build-${card.id}-${tile}`;
  const move = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 620, damping: 36, mass: 0.7 };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="flex w-full flex-col items-center gap-4"
    >
      <div className={cn(CARD_SURFACE_CLASS, 'flex min-h-28 w-full items-center justify-center rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border py-6 sm:min-h-32')}>
        <span className="px-6 text-center text-2xl font-extrabold leading-snug text-ui-ink sm:text-3xl">
          {(simpleDefinitions && card.simple) ? card.simple : card.back}
        </span>
      </div>

      <LayoutGroup id={`word-build-${card.id}`}>
        <div className="flex justify-center gap-3" aria-label="Your word">
          {slots.map((tile, i) => {
            const filled = tile !== null;
            const right = filled && tiles[tile] === answer[i];
            return (
              <div
                key={i}
                className={cn(
                  'h-19 w-17 rounded-control sm:h-21 sm:w-19',
                  !filled && 'border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface',
                  !filled && i === nextEmpty && !isChecked && 'border-brand-primary',
                )}
              >
                {filled && (
                  // Same layoutId as its tray tile: the tile flies into the slot and back.
                  <motion.div layoutId={tileId(tile)} transition={move} className="h-full w-full">
                    <button
                      type="button"
                      onClick={() => clear(i)}
                      disabled={isChecked}
                      aria-label={`Remove ${tiles[tile]}`}
                      className={cn(
                        'flex h-full w-full items-center justify-center rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface font-chinese text-4xl font-bold text-ui-ink-strong focus-ring',
                        isChecked && (right
                          ? 'border-feedback-success bg-feedback-success-surface'
                          : 'border-feedback-danger bg-feedback-danger-surface'),
                      )}
                    >
                      {tiles[tile]}
                    </button>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Placed tiles leave the tray; the rest slide together to close the gap. */}
        <div className="flex min-h-21 max-w-130 flex-wrap justify-center gap-3">
          {tiles.map((char, i) => (slots.includes(i) ? null : (
            <motion.div key={i} layout layoutId={tileId(i)} transition={move}>
              <PracticeChoiceButton
                compact
                data-quiz-launch-target={i === 0 ? '' : undefined}
                disabled={isChecked}
                onClick={() => place(i)}
                selectedClassName={`${activeBook.bg} ${activeBook.accentBorder} ${activeBook.accent}`}
                selectedEdgeColor={activeBook.accentHex}
                className="w-17 sm:w-19"
              >
                <span className="font-chinese text-3xl font-bold sm:text-4xl">{char}</span>
              </PracticeChoiceButton>
            </motion.div>
          )))}
        </div>
      </LayoutGroup>
      {audioError && <span role="status" className="text-sm text-ui-muted-strong">{audioError}</span>}
    </motion.div>
  );
};
