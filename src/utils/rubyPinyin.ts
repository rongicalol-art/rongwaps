import type { RubyItem, PhraseChunk } from '../types/ruby';
import {
  PUNCTUATION_REGEX,
  PHRASE_TERMINATORS,
  MAX_PHRASE_CHARS,
} from '../data/pinyinTables';
import {
  alignRubyPinyin,
  itemCharStarts,
  sliceItemsByCharRange,
  containedItemIndexes,
  buildWordStartFlags,
} from './rubyAlignment';
import { getWordChunks } from './pinyinWordChunks';
import {
  splitPinyinWordToSyllables,
  splitPinyinToSyllables,
} from './pinyinSyllables';

export type { RubyItem, PhraseChunk };
export {
  PUNCTUATION_REGEX,
  alignRubyPinyin,
  getWordChunks,
  splitPinyinWordToSyllables,
  splitPinyinToSyllables,
};

function charCountOf(seg: RubyItem[]): number {
  return seg.reduce((n, item) => n + item.char.length, 0);
}

/**
 * Packs pinyin words (a run of items split at `boundaries`) into phrase
 * chunks of at most MAX_PHRASE_CHARS characters, cutting only between words.
 */
function packWords(items: RubyItem[], boundaries: number[]): RubyItem[][] {
  const starts = [0, ...boundaries];
  const words: RubyItem[][] = [];
  for (let w = 0; w < starts.length; w += 1) {
    const from = starts[w];
    const to = w + 1 < starts.length ? starts[w + 1] : items.length;
    words.push(items.slice(from, to));
  }

  const parts: RubyItem[][] = [];
  let current: RubyItem[] = [];
  let currentChars = 0;
  for (const word of words) {
    const wordChars = charCountOf(word);
    if (currentChars > 0 && currentChars + wordChars > MAX_PHRASE_CHARS) {
      parts.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(...word);
    currentChars += wordChars;
  }
  if (current.length) parts.push(current);
  return parts;
}

/**
 * Splits an aligned word chunk into tappable phrase chunks when Whisper
 * merged several clauses into a single "word".
 */
function splitPhraseWord(
  chunk: PhraseChunk,
  wordStarts?: ReadonlySet<number>,
): PhraseChunk[] {
  const { start, end, rubyItems } = chunk;
  if (typeof start !== 'number' || typeof end !== 'number' || rubyItems.length === 0) {
    return [chunk];
  }

  type Group = { items: RubyItem[]; wordStarts: number[] };
  const raw: Group[] = [];
  let current: RubyItem[] = [];
  let i = 0;
  while (i < rubyItems.length) {
    const groupStart = i;
    while (i < rubyItems.length && !PHRASE_TERMINATORS.has(rubyItems[i].char)) {
      current.push(rubyItems[i]);
      i += 1;
    }
    while (i < rubyItems.length && PHRASE_TERMINATORS.has(rubyItems[i].char)) {
      current.push(rubyItems[i]);
      i += 1;
    }
    if (current.length) {
      const groupWordStarts: number[] = [];
      for (let k = 1; k < current.length; k += 1) {
        if (wordStarts?.has(groupStart + k)) groupWordStarts.push(groupStart + k);
      }
      raw.push({ items: current, wordStarts: groupWordStarts });
      current = [];
    }
  }

  if (raw.length > 1 && raw[0].items.every((item) => item.isPunctuation)) {
    const lead = raw[0];
    const next = raw[1];
    next.items = [...lead.items, ...next.items];
    next.wordStarts = [...lead.wordStarts, ...next.wordStarts];
    raw.shift();
  }

  const parts: RubyItem[][] = [];
  let cursor = 0;
  for (const group of raw) {
    const groupStart = cursor;
    cursor += group.items.length;
    const spokenChars = group.items
      .filter((item) => !item.isPunctuation)
      .reduce((n, item) => n + item.char.length, 0);
    if (spokenChars > MAX_PHRASE_CHARS) {
      const boundaries: number[] = [];
      for (const pos of group.wordStarts) {
        const local = pos - groupStart;
        if (local > 0 && local < group.items.length) boundaries.push(local);
      }
      if (boundaries.length > 0) {
        parts.push(...packWords(group.items, boundaries));
        continue;
      }
    }
    parts.push(group.items);
  }

  if (parts.length === 1 && parts[0] === rubyItems) return [chunk];

  const totalChars = parts.reduce((sum, seg) => sum + charCountOf(seg), 0) || 1;
  const duration = Math.max(0, end - start);
  let consumed = 0;
  return parts.map((seg) => {
    const segStart = start + (consumed / totalChars) * duration;
    consumed += charCountOf(seg);
    const segEnd = start + (consumed / totalChars) * duration;
    return {
      text: seg.map((item) => item.char).join(''),
      isPunctuation: false as const,
      rubyItems: seg,
      start: segStart,
      end: segEnd,
    };
  });
}

/**
 * Groups a line of dialogue into interactive, tappable phrase chunks
 * using Whisper alignment timestamps.
 */
export function getPhraseChunks(
  text: string,
  pinyinStr: string,
  lineAlignment?: { words: Array<{ charStart?: number; charEnd?: number; start: number; end: number }> }
): PhraseChunk[] {
  const rubyItems = alignRubyPinyin(text, pinyinStr);
  if (!lineAlignment || !lineAlignment.words || lineAlignment.words.length === 0) {
    return [{
      text,
      isPunctuation: false,
      rubyItems,
    }];
  }

  const chunks: PhraseChunk[] = [];
  const itemStarts = itemCharStarts(rubyItems);
  const wordStartFlags = buildWordStartFlags(rubyItems, pinyinStr);
  let charIdx = 0;

  for (const word of lineAlignment.words) {
    if (typeof word.charStart !== 'number' || typeof word.charEnd !== 'number') continue;

    if (charIdx < word.charStart) {
      const beforeText = text.slice(charIdx, word.charStart);
      const beforeRuby = sliceItemsByCharRange(rubyItems, itemStarts, charIdx, word.charStart);
      chunks.push({
        text: beforeText,
        isPunctuation: true,
        rubyItems: beforeRuby,
      });
    }

    const wordText = text.slice(word.charStart, word.charEnd);
    const wordIndexes = containedItemIndexes(rubyItems, itemStarts, word.charStart, word.charEnd);
    const wordRuby = wordIndexes.map((index) => rubyItems[index]);
    const firstWordIndex = wordIndexes[0];
    const wordStartsInChunk = new Set<number>();
    for (const index of wordIndexes) {
      if (wordStartFlags[index]) wordStartsInChunk.add(index - firstWordIndex);
    }
    chunks.push(...splitPhraseWord({
      text: wordText,
      start: word.start,
      end: word.end,
      isPunctuation: false,
      rubyItems: wordRuby,
    }, wordStartsInChunk));
    charIdx = word.charEnd;
  }

  if (charIdx < text.length) {
    const trailingText = text.slice(charIdx);
    const trailingRuby = sliceItemsByCharRange(rubyItems, itemStarts, charIdx, text.length);
    const last = chunks[chunks.length - 1];
    const canMerge = PUNCTUATION_REGEX.test(trailingText)
      && Boolean(last && !last.isPunctuation);
    if (canMerge) {
      last!.text += trailingText;
      last!.rubyItems.push(...trailingRuby);
    } else {
      chunks.push({
        text: trailingText,
        isPunctuation: true,
        rubyItems: trailingRuby,
      });
    }
  }

  return chunks;
}
