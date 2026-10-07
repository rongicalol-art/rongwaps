import { useMemo } from 'react';
import { useLevels } from './useLevels';
import { useKnownCharacters } from './useKnownCharacters';
import { computeTocflReadiness, type TocflReadiness } from '../utils/lesson/tocflReadiness';

/** TOCFL readiness from passed course words; null until vocabulary and level data loads. */
export function useTocflReadiness(): TocflReadiness | null {
  const levels = useLevels();
  const { courseCards, learnedIds } = useKnownCharacters();
  return useMemo(
    () => (levels && courseCards ? computeTocflReadiness(levels.tbcl.chars, courseCards, learnedIds) : null),
    [levels, courseCards, learnedIds],
  );
}
