import { ALL_VALID_BASES, stripTones } from '../data/pinyinTables';
import { numberToToneMarks } from './pinyin';
import { splitPinyinWordToSyllables } from './pinyinSyllables';
import { isHanziChar } from './hanzi';

/** 1–4 = marked tones, 5 = neutral (no mark). */
export type PinyinTone = 1 | 2 | 3 | 4 | 5;

const TONE_BY_MARK: Record<string, PinyinTone> = {};
for (const [tone, marks] of [
  [1, 'āēīōūǖĀĒĪŌŪǕ'],
  [2, 'áéíóúǘÁÉÍÓÚǗ'],
  [3, 'ǎěǐǒǔǚǍĚǏǑǓǙ'],
  [4, 'àèìòùǜÀÈÌÒÙǛ'],
] as const) {
  for (const mark of marks) TONE_BY_MARK[mark] = tone;
}

/** Tone of one tone-marked syllable, read from its mark (unmarked = neutral). */
export function getPinyinTone(syllable: string): PinyinTone {
  for (const ch of syllable.normalize('NFC')) {
    const tone = TONE_BY_MARK[ch];
    if (tone) return tone;
  }
  return 5;
}

const isErhua = (syllable: string) => syllable.toLowerCase() === 'r';

/** A syllable we can trust: a real Mandarin base, or the erhua "r". */
const isKnownSyllable = (syllable: string) =>
  isErhua(syllable) || ALL_VALID_BASES.has(stripTones(syllable));

export interface PinyinToneSegment {
  text: string;
  /** Present only on a recognised syllable; separators and unknown runs have none. */
  tone?: PinyinTone;
}

const LETTER_RUN = /([A-Za-z\u00C0-\u024F]+)/;

/**
 * Splits displayable pinyin into syllable segments tagged with their tone,
 * keeping spaces, slashes and parentheses as untagged text so the joined
 * segments always equal the input. A letter run that does not split into
 * known syllables stays untagged (rendered plain) rather than guessed.
 */
export function segmentPinyinTones(pinyin: string): PinyinToneSegment[] {
  const display = numberToToneMarks(pinyin).normalize('NFC');
  const segments: PinyinToneSegment[] = [];
  for (const part of display.split(LETTER_RUN)) {
    if (!part) continue;
    if (!LETTER_RUN.test(part)) {
      segments.push({ text: part });
      continue;
    }
    const syllables = splitPinyinWordToSyllables(part);
    if (syllables.join('') !== part || !syllables.every(isKnownSyllable)) {
      segments.push({ text: part });
      continue;
    }
    for (const syllable of syllables) segments.push({ text: syllable, tone: getPinyinTone(syllable) });
  }
  return segments;
}

export interface WordSyllable {
  text: string;
  tone: PinyinTone;
}

/** Syllables of one pinyin variant, or null if any run is unrecognised. */
function variantSyllables(variant: string): (WordSyllable & { erhua: boolean })[] | null {
  const tones: (WordSyllable & { erhua: boolean })[] = [];
  for (const segment of segmentPinyinTones(variant)) {
    if (segment.tone) {
      tones.push({ text: segment.text, tone: segment.tone, erhua: isErhua(segment.text) });
    } else if (/[A-Za-z\u00C0-\u024F]/.test(segment.text)) {
      return null;
    }
  }
  return tones;
}

/**
 * Per-character syllables for a word, aligned to `Array.from(word)`: the
 * syllable (text + tone) for each hanzi, null for anything else. Returns
 * null whenever the pairing is not certain, so callers render plain.
 *
 * Authored forms may list "/" alternatives. When `authoredForm` has as many
 * variants as the pinyin, the pinyin variant at the word's position is used
 * (相片/照片 + xiàngpiàn/zhàopiàn). Otherwise every pinyin variant whose
 * syllable count fits the word must agree on every tone; differing spellings
 * of one syllable are kept as "zhè/zhèi".
 * Erhua: a trailing "r" pairs with 兒/儿 when the word writes it, and is
 * ignored when it doesn't.
 */
export function alignWordSyllables(
  word: string,
  pinyin: string | null | undefined,
  authoredForm?: string,
): (WordSyllable | null)[] | null {
  if (!word || !pinyin) return null;
  const chars = Array.from(word);
  const hanzi = chars.filter(isHanziChar);
  if (hanzi.length === 0) return null;

  let variants = pinyin.split('/');
  const forms = authoredForm?.split('/') ?? [];
  if (variants.length > 1 && forms.length === variants.length) {
    const position = forms.findIndex((form) => Array.from(form).filter(isHanziChar).join('') === hanzi.join(''));
    if (position === -1) return null;
    variants = [variants[position]];
  }

  let agreed: WordSyllable[] | null = null;
  for (const variant of variants) {
    const tones = variantSyllables(variant);
    if (!tones) continue;
    let candidate = tones;
    if (candidate.length !== hanzi.length) candidate = tones.filter((t) => !t.erhua);
    if (candidate.length !== hanzi.length) continue;
    // An "r" may only sit on 兒/儿, never on another character.
    if (candidate.some((t, i) => t.erhua && hanzi[i] !== '兒' && hanzi[i] !== '儿')) continue;
    if (!agreed) {
      agreed = candidate.map(({ text, tone }) => ({ text, tone }));
      continue;
    }
    if (candidate.some((t, i) => t.tone !== agreed![i].tone)) return null;
    // Same tones, different spelling (zhèxiē/zhèixiē): keep both on that syllable.
    agreed = agreed.map((s, i) =>
      s.text.split('/').includes(candidate[i].text) ? s : { ...s, text: `${s.text}/${candidate[i].text}` },
    );
  }
  if (!agreed) return null;

  let next = 0;
  return chars.map((char) => (isHanziChar(char) ? agreed![next++] : null));
}
