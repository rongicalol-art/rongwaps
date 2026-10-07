import type { RubyItem } from '../../types/ruby';
import { PUNCTUATION_REGEX, PINYIN_STRIP_REGEX, stripTones } from '../../data/pinyinTables';
import { splitPinyinToSyllables, splitPinyinWordToSyllables } from './pinyinSyllables';

/**
 * Pairs each Chinese character 1-to-1 with its Pinyin syllable
 * while preserving natural punctuation and handling numeric tokens.
 */
export function alignRubyPinyin(text: string, pinyinStr: string): RubyItem[] {
  if (!text) return [];
  const syllables = splitPinyinToSyllables(pinyinStr);

  const items: RubyItem[] = [];
  let sylIndex = 0;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (PUNCTUATION_REGEX.test(char)) {
      items.push({
        char,
        isPunctuation: true,
      });
      i++;
    } else if (/[0-9]/.test(char)) {
      // Group contiguous digits (e.g. "101")
      let numStr = '';
      while (i < text.length && /[0-9]/.test(text[i])) {
        numStr += text[i];
        i++;
      }
      // Consume the digit token from syllables if present
      if (sylIndex < syllables.length && /^[0-9]+$/.test(syllables[sylIndex])) {
        sylIndex++;
      }
      items.push({
        char: numStr,
        pinyin: undefined,
        isPunctuation: false,
      });
    } else {
      const pinyin = sylIndex < syllables.length ? syllables[sylIndex] : undefined;
      sylIndex++;
      items.push({
        char,
        pinyin,
        isPunctuation: false,
      });
      i++;
    }
  }

  return items;
}

/**
 * rubyItems partition the line text: every non-digit character is its own
 * item, while a run of digits is a single item whose `char` holds the whole
 * run. So an item's array index is NOT its character offset once a digit run
 * appears (e.g. "台北101大樓" groups "101" into one item and the rest of the
 * array shifts by two). Alignment words are indexed by character offset into
 * the authored text, so slices must be computed from each item's character
 * span rather than from raw array indexes.
 */
export function itemCharStarts(rubyItems: RubyItem[]): number[] {
  const starts: number[] = [];
  let pos = 0;
  for (const item of rubyItems) {
    starts.push(pos);
    pos += item.char.length;
  }
  return starts;
}

/** Items fully contained in the character range [from, to). */
export function sliceItemsByCharRange(
  rubyItems: RubyItem[],
  starts: number[],
  from: number,
  to: number,
): RubyItem[] {
  const out: RubyItem[] = [];
  for (let i = 0; i < rubyItems.length; i += 1) {
    const item = rubyItems[i];
    if (starts[i] >= from && starts[i] + item.char.length <= to) out.push(item);
  }
  return out;
}

/** Absolute indexes of the items fully contained in [from, to). */
export function containedItemIndexes(
  rubyItems: RubyItem[],
  starts: number[],
  from: number,
  to: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < rubyItems.length; i += 1) {
    const item = rubyItems[i];
    if (starts[i] >= from && starts[i] + item.char.length <= to) out.push(i);
  }
  return out;
}

/** True for every ruby item that begins an authored pinyin word. */
export function buildWordStartFlags(rubyItems: RubyItem[], pinyinStr: string): boolean[] {
  const flags = rubyItems.map(() => false);
  const words = pinyinStr
    .replace(PINYIN_STRIP_REGEX, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^['‘’]+|['‘’]+$/g, ''))
    .filter(Boolean);

  let wordIndex = 0;
  let queue: string[] = [];
  let queuePos = 0;

  const loadWord = (): boolean => {
    while (wordIndex < words.length) {
      const word = words[wordIndex];
      wordIndex += 1;
      if (/^[0-9]+$/.test(word)) continue;
      const syllables = splitPinyinWordToSyllables(word);
      if (syllables.length > 0) {
        queue = syllables.map((syllable) => stripTones(syllable));
        queuePos = 0;
        return true;
      }
    }
    queue = [];
    queuePos = 0;
    return false;
  };

  for (let i = 0; i < rubyItems.length; i += 1) {
    const item = rubyItems[i];
    if (item.isPunctuation) continue;

    if (/^[0-9]+$/.test(item.char)) {
      if (wordIndex < words.length && /^[0-9]+$/.test(words[wordIndex])) {
        flags[i] = true;
        wordIndex += 1;
      }
      continue;
    }

    if (queuePos >= queue.length) {
      if (!loadWord()) continue;
      flags[i] = true;
    }

    const actual = stripTones(item.pinyin ?? '');
    if (queue[queuePos] !== undefined && actual === queue[queuePos]) {
      queuePos += 1;
    }
  }
  return flags;
}
