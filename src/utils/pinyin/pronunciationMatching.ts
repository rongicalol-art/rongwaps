import { ALL_VALID_BASES, stripTones } from '../../data/pinyinTables';
import { numberToToneMarks } from './pinyin';
import { splitPinyinWordToSyllables } from './pinyinSyllables';
import type { Flashcard } from '../../data/flashcards';

/** Conservative recording identity. Never discard tones, ü or syllable boundaries. */
export function pronunciationKey(pinyin?: string | null): string | null {
  if (!pinyin?.trim()) return null;
  const marked = numberToToneMarks(pinyin.toLowerCase().normalize('NFC')
    .replace(/u:/g, 'ü').replace(/v/g, 'ü').replace(/0/g, '5')
    .replace(/([1-5])(?=[a-zü])/g, '$1 '));
  // Alternatives/optional readings need an explicit selection before reuse.
  if (!/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s'’‘]+$/u.test(marked)) return null;
  const syllables = marked.trim().split(/\s+/).flatMap(splitPinyinWordToSyllables);
  const keys: string[] = [];
  for (const syllable of syllables) {
    const base = stripTones(syllable);
    if (!ALL_VALID_BASES.has(base) && base !== 'r') return null;
    const accents = syllable.normalize('NFD').match(/[\u0304\u0301\u030c\u0300]/g) || [];
    if (accents.length > 1) return null;
    const tone = accents.length ? ['\u0304', '\u0301', '\u030c', '\u0300'].indexOf(accents[0] || '') + 1 : 5;
    keys.push(`${base}${tone}`);
  }
  return keys.length ? keys.join(' ') : null;
}

export function recordingLookupKey(word: string, pinyin?: string | null): string | null {
  const reading = pronunciationKey(pinyin);
  return reading && word.trim() ? `${word.trim()}\u0000${reading}` : null;
}

export function matchesRecording(card: Flashcard, word: string, pinyin?: string | null): boolean {
  const reading = pronunciationKey(pinyin);
  return Boolean(reading && reading === pronunciationKey(card.pinyin)
    && [card.front, card.traditional, card.simplified].some((form) => form?.trim() === word.trim()));
}

/** Supports the existing spelling lookup map as well as its reading-specific keys. */
export function findReadingMatch(map: Map<string, Flashcard>, words: string[], pinyin?: string | null): Flashcard | undefined {
  for (const word of words.filter(Boolean)) {
    const key = recordingLookupKey(word, pinyin);
    const candidate = (key ? map.get(key) : undefined) || map.get(word);
    if (candidate && matchesRecording(candidate, word, pinyin)) return candidate;
  }
  return undefined;
}

/** Tones 一 and 不 take before other syllables (yí bèi, bú shì); the book writes these, CEDICT writes yī/bù. */
const SANDHI_TONES: Record<string, { base: string; tones: string }> = { 一: { base: 'yi', tones: '124' }, 不: { base: 'bu', tones: '24' } };

/**
 * "Does this entry belong to this reading?" across the Taiwan book and CEDICT:
 * a neutral tone inside a multi-syllable word matches any tone (要是 yàoshì = yào shi),
 * and 一/不 match their sandhi tones when `word` lines up with the syllables.
 * Two different full tones still differ (行 háng ≠ xíng). `allowNeutral: false` keeps only the 一/不 tolerance.
 * Never use it for identity or storage keys.
 */
export function sameReading(a?: string | null, b?: string | null, word?: string, allowNeutral = true): boolean {
  const left = pronunciationKey(a)?.split(' ');
  const right = pronunciationKey(b)?.split(' ');
  if (!left || !right || left.length !== right.length) return false;
  const characters = word ? Array.from(word.trim()) : [];
  return left.every((syllable, i) => {
    const other = right[i];
    if (syllable === other) return true;
    const base = syllable.slice(0, -1);
    if (base !== other.slice(0, -1)) return false;
    if (allowNeutral && left.length > 1 && (syllable.endsWith('5') || other.endsWith('5'))) return true;
    const sandhi = characters.length === left.length ? SANDHI_TONES[characters[i]] : undefined;
    return Boolean(sandhi && sandhi.base === base && sandhi.tones.includes(syllable.slice(-1)) && sandhi.tones.includes(other.slice(-1)));
  });
}
