import { useEffect, useState } from 'react';
import { loadHanziCharacterData } from '../../services/contentAssetService';

const cache = new Map<string, string[]>();

export interface CharacterStrokesState {
  /** SVG path per stroke, in writing order; null while loading or when unavailable. */
  strokes: string[] | null;
  failed: boolean;
}

/** Stroke outlines for one character (the same data the writing screen draws with). */
export function useCharacterStrokes(char: string): CharacterStrokesState {
  const [state, setState] = useState<{ char: string } & CharacterStrokesState>({ char, strokes: cache.get(char) ?? null, failed: false });

  useEffect(() => {
    if (cache.has(char)) return;
    let active = true;
    loadHanziCharacterData(char)
      .then((data) => {
        cache.set(char, data.strokes);
        if (active) setState({ char, strokes: data.strokes, failed: false });
      })
      .catch(() => {
        if (active) setState({ char, strokes: null, failed: true });
      });
    return () => { active = false; };
  }, [char]);

  if (state.char === char && (state.strokes || state.failed)) return state;
  return { strokes: cache.get(char) ?? null, failed: false };
}
