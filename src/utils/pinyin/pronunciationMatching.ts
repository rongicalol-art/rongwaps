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
