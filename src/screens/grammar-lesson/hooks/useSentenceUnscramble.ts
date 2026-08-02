import { useMemo, useState } from 'react';
import type { GrammarUnscrambleExercise } from '../../../types/models';

type UnscrambleStatus = 'idle' | 'needs-repair' | 'complete';

export function useSentenceUnscramble(exercise: GrammarUnscrambleExercise) {
  const [orderedTileIds, setOrderedTileIds] = useState<string[]>([]);
  const [status, setStatus] = useState<UnscrambleStatus>('idle');
  const availableTiles = useMemo(
    () => exercise.tiles.filter((tile) => !orderedTileIds.includes(tile.id)),
    [exercise.tiles, orderedTileIds],
  );
  const allTilesPlaced = orderedTileIds.length === exercise.correctOrder.length;

  const addTile = (tileId: string) => {
    setOrderedTileIds((current) => current.includes(tileId) ? current : [...current, tileId]);
    setStatus('idle');
  };

  const removeTile = (tileId: string) => {
    setOrderedTileIds((current) => current.filter((id) => id !== tileId));
    setStatus('idle');
  };

  const moveTile = (tileId: string, targetIndex: number) => {
    setOrderedTileIds((current) => {
      const sourceIndex = current.indexOf(tileId);
      if (sourceIndex === -1) return current;
      const next = current.filter((id) => id !== tileId);
      next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, tileId);
      return next;
    });
    setStatus('idle');
  };

  const checkAnswer = () => {
    const isCorrect = exercise.correctOrder.every((tileId, index) => orderedTileIds[index] === tileId);
    setStatus(isCorrect ? 'complete' : 'needs-repair');
  };

  const reset = () => {
    setOrderedTileIds([]);
    setStatus('idle');
  };

  return {
    orderedTileIds,
    availableTiles,
    allTilesPlaced,
    status,
    addTile,
    removeTile,
    moveTile,
    checkAnswer,
    reset,
  };
}
