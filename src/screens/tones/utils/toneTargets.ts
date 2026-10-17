import type { Flashcard } from '../../../data/flashcards';
import { alignWordSyllables, type PinyinTone } from '../../../utils/pinyin/pinyinTones';
import { stripPinyinTones } from '../../../utils/pinyin/pinyinNormalize';

/** Longer words make the columns too narrow to draw in on a phone. */
export const MAX_TONE_SYLLABLES = 4;

export interface ToneTarget {
  char: string;
  /** The syllable as authored, tone-marked. */
  syllable: string;
  /** The syllable without its tone mark (shown until the tone is drawn). */
  base: string;
  /** The tone as written in the dictionary. */
  written: PinyinTone;
  /** The tone as it is said in this word (after tone sandhi): the one the learner draws. */
  spoken: PinyinTone;
}

/**
 * Tone sandhi, applied to written tones: a third tone before another third tone is said rising
 * (老虎 lǎohǔ → láohǔ); 不 before a fourth tone rises (不要 búyào); 一 rises before a fourth tone
 * and falls before the others (一定 yídìng, 一起 yìqǐ). Already-changed spellings are left alone.
 */
export function spokenTones(chars: readonly string[], written: readonly PinyinTone[]): PinyinTone[] {
  return written.map((tone, i) => {
    const next = written[i + 1];
    if (next === undefined) return tone;
    if (tone === 3 && next === 3) return 2;
    if (chars[i] === '不' && tone === 4 && next === 4) return 2;
    if (chars[i] === '一' && tone === 1 && next !== 5) return next === 4 ? 2 : 4;
    return tone;
  });
}

/** One target per character, or null when the word cannot be drawn (no clean pinyin, non-hanzi, too long). */
export function toneTargets(card: Pick<Flashcard, 'front' | 'pinyin'>): ToneTarget[] | null {
  const aligned = alignWordSyllables(card.front, card.pinyin);
  if (!aligned || aligned.length > MAX_TONE_SYLLABLES || aligned.some((s) => !s || s.text.includes('/'))) return null;
  const chars = Array.from(card.front);
  const syllables = aligned as { text: string; tone: PinyinTone }[];
  const spoken = spokenTones(chars, syllables.map((s) => s.tone));
  return syllables.map((s, i) => ({
    char: chars[i],
    syllable: s.text,
    base: stripPinyinTones(s.text),
    written: s.tone,
    spoken: spoken[i],
  }));
}
