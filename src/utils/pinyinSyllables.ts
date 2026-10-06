import { ALL_VALID_BASES, stripTones, PINYIN_STRIP_REGEX } from '../data/pinyinTables';

/**
 * Splits compound pinyin words into individual syllables using official Mandarin phonotactics
 * (e.g. "kuànián" -> ["kuà", "nián"], "rènao" -> ["rè", "nao"], "piàoliàng" -> ["piào", "liàng"])
 */
export function splitPinyinWordToSyllables(word: string): string[] {
  if (!word) return [];
  if (/^[0-9]+$/.test(word)) return [word];
  if (word.includes("'") || word.includes("’") || word.includes("‘")) {
    return word.split(/['’‘]/).flatMap(splitPinyinWordToSyllables).filter(Boolean);
  }

  // Handle Erhua: e.g. "diǎnr" -> ["diǎn", "r"]
  if (word.toLowerCase().endsWith('r') && word.length > 2 && !word.toLowerCase().startsWith('r') && !word.toLowerCase().startsWith('er')) {
    const withoutR = word.slice(0, -1);
    return [...splitPinyinWordToSyllables(withoutR), 'r'];
  }

  // `strict`: a non-initial syllable may not start with a vowel — standard
  // orthography writes an apostrophe there (xī'ān), so "dàngāo" is dàn-gāo
  // and "kěnéng" is kě-néng. Retried loosely for text that drops apostrophes.
  function solve(sub: string, strict: boolean): string[] | null {
    if (!sub) return [];

    for (let len = Math.min(sub.length, 7); len >= 1; len--) {
      const candidate = sub.slice(0, len);
      const base = stripTones(candidate);
      if (ALL_VALID_BASES.has(base)) {
        const rest = sub.slice(len);
        if (!rest) return [candidate];

        if (strict && /^[aeiouüv]/.test(stripTones(rest[0]).toLowerCase())) continue;

        const restSolution = solve(rest, strict);
        if (restSolution !== null) {
          return [candidate, ...restSolution];
        }
      }
    }
    return null;
  }

  const res = solve(word, true) ?? solve(word, false);
  return res ?? [word];
}

/** Extracts all individual syllables from a pinyin sentence */
export function splitPinyinToSyllables(pinyinStr: string): string[] {
  if (!pinyinStr) return [];
  const clean = pinyinStr.replace(PINYIN_STRIP_REGEX, ' ');
  const words = clean
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^['‘’]+|['‘’]+$/g, ''))
    .filter(Boolean);
  const syllables: string[] = [];

  for (const word of words) {
    syllables.push(...splitPinyinWordToSyllables(word));
  }

  return syllables;
}
