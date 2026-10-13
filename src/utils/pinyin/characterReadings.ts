import { pronunciationKey } from './pronunciationMatching';

export interface CharacterReadings {
  characters: string[];
  /** Multiple values mean an explicitly authored alternative, never a guessed reading. */
  readings: string[][];
}

const stripSeparators = (word: string) => word.replace(/[\s，,。.!！?？…、·]/g, '');
const expanded = (text: string) => text.replace(/[()（）]/g, '');
const omitted = (text: string) => text.replace(/\([^)]*\)|（[^）]*）/g, '');

/** Align authored aliases/optional syllables without changing displayed content or recording identity. */
export function characterReadings(word: string, pinyin?: string, sourceWord = word): CharacterReadings | null {
  const plainWord = stripSeparators(word);
  const characters = Array.from(plainWord);
  if (!characters.length || !pinyin) return null;
  if (!characters.every((char) => /^[\u3400-\u9fff]$/u.test(char))) {
    // Authored spaced groups keep Han readings aligned beside Latin/numeric names (台北101, 卡拉OK).
    const groups = plainWord.match(/[\u3400-\u9fff]+|[a-z0-9]+/gi) ?? [];
    const sounds = pinyin.trim().split(/\s+/);
    if (groups.join('') !== plainWord || groups.length !== sounds.length) return null;
    const aligned: CharacterReadings = { characters: [], readings: [] };
    for (let i = 0; i < groups.length; i++) {
      if (!/^[\u3400-\u9fff]+$/u.test(groups[i])) continue;
      const part = characterReadings(groups[i], sounds[i]);
      if (!part) return null;
      aligned.characters.push(...part.characters);
      aligned.readings.push(...part.readings);
    }
    return aligned;
  }
  const forms = sourceWord.split('/');
  const alternatives = pinyin.split('/');
  const matching = forms.flatMap((form, i) => stripSeparators(expanded(form)) === characters.join('')
    || stripSeparators(omitted(form)) === characters.join('') ? [i] : []);
  const selected = forms.length > 1 && forms.length === alternatives.length && matching.length
    ? matching.map((i) => alternatives[i]) : alternatives;
  const candidates: string[][] = [];
  for (const alternative of selected) {
    const sourceForm = forms[matching[0] ?? 0];
    const optionalWord = /[()（）]/.test(sourceForm);
    const normalized = alternative.replace(/[，,。.!！?？…、·]/g, ' ');
    const pinyins = optionalWord
      ? [stripSeparators(expanded(sourceForm)) === characters.join('') ? expanded(normalized) : omitted(normalized)]
      : [normalized, omitted(normalized), ...Array.from(normalized.matchAll(/\(([^)]+)\)|（([^）]+)）/g), (m) => m[1] || m[2])];
    let aligned = false;
    for (const value of pinyins) {
      const syllables = pronunciationKey(value)?.split(' ');
      if (syllables?.length !== characters.length) continue;
      candidates.push(syllables);
      aligned = true;
    }
    // A malformed alternative must not disappear and make the remaining one look certain.
    if (!aligned) return null;
  }
  if (!candidates.length) return null;
  return { characters, readings: characters.map((_, i) => [...new Set(candidates.map((readings) => readings[i]))]) };
}
