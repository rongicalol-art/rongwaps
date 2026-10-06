import { useMemo } from 'react';
import { useCharBreakdownState } from '../../../hooks/useCharBreakdown';
import { useParts } from '../../../hooks/useParts';
import { usePronunciation } from '../../../hooks/usePronunciation';
import { resolveSoundClue, type SoundClue } from '../../../utils/parts';
import { allReadings, soundPair } from '../../../utils/pronunciation';
import { formatSoundShift } from '../utils/soundShift';

/**
 * Sound parts that survive only inside a sibling tile (辛 is the top of 亲, so
 * 新 and 親 show no 辛 tile). The tile that carries them gets the sound mark.
 */
const HIDDEN_SOUND_CARRIERS: Record<string, { part: string; carrier: string }> = {
  新: { part: '辛', carrier: '亲' },
  親: { part: '辛', carrier: '亲' },
};

export interface ResolvedSoundClue extends SoundClue {
  /** Tile to mark as the sound in the breakdown tree: the part, or the tile hiding it. */
  treeGlyph: string;
  /** Label for that tile: the shift, prefixed with the part when the tile is a carrier (`辛 xīn → qīn`). */
  treeShift?: string;
  /** The part's reading that explains the sound, once known. */
  partPinyin?: string;
  /** `zhuī → shuí`, shown on the part's tile in the breakdown tree and in the sound family. */
  shift?: string;
  /** The character's usual reading when the clue explains another one (誰 shéi, clue shuí). */
  usualReading?: string;
}

/**
 * "Gets" mode: the part this character borrows its sound from (媽 ← 馬), its
 * sound-alike siblings, and the pinyin shift — using whichever of the
 * character's and the part's readings sound closest (誰 shéi/shuí ← 隹 zhuī
 * explains shuí). Null when the character has no graded sound part.
 */
export function useSoundClue(character: string, charPinyin?: string | null): ResolvedSoundClue | null {
  const parts = useParts();
  const readings = usePronunciation();
  const clue = useMemo(() => (parts && character ? resolveSoundClue(character, parts) : null), [parts, character]);
  const partData = useCharBreakdownState(clue?.part ?? '').data;
  return useMemo(() => {
    if (!clue) return null;
    const charReadings = allReadings(character, readings).map((reading) => reading.pinyin);
    const partReadings = allReadings(clue.part, readings).map((reading) => reading.pinyin);
    const pair = soundPair(
      charReadings.length > 0 ? charReadings : [charPinyin ?? ''].filter(Boolean),
      partReadings.length > 0 ? partReadings : (partData?.pinyin ?? []),
    );
    const usual = charReadings[0];
    const shift = formatSoundShift(pair.part, pair.char);
    const hidden = HIDDEN_SOUND_CARRIERS[character];
    const carrier = hidden?.part === clue.part ? hidden.carrier : undefined;
    return {
      ...clue,
      treeGlyph: carrier ?? clue.part,
      treeShift: carrier && shift ? `${clue.part} ${shift}` : shift,
      partPinyin: pair.part,
      shift,
      usualReading: usual && pair.char && usual !== pair.char ? usual : undefined,
    };
  }, [clue, character, readings, partData, charPinyin]);
}
