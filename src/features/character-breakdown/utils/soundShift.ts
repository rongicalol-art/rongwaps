import { numberToToneMarks } from '../../../utils/pinyin';

/**
 * The reading shift of a sound clue: `mǎ → mā` when the character reads
 * differently from its sound part, just `mǎ` when they read alike. Undefined
 * until the part's pinyin is known.
 */
export function formatSoundShift(partPinyin: string | null | undefined, charPinyin: string | null | undefined): string | undefined {
  const part = numberToToneMarks(partPinyin?.trim());
  if (!part) return undefined;
  const char = numberToToneMarks(charPinyin?.trim());
  return !char || char === part ? part : `${part} → ${char}`;
}
