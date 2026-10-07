import type { RubyItem, PhraseChunk } from '../../types/ruby';
import { alignRubyPinyin, buildWordStartFlags } from './rubyAlignment';

interface InternalUnit {
  text: string;
  isPunctuation: boolean;
  rubyItems: RubyItem[];
  charStart: number;
  charEnd: number;
  start?: number;
  end?: number;
}

/**
 * Groups a line of text into individual word chunks (and separate punctuation chunks),
 * matching authored pinyin word boundaries and Whisper alignment timestamps.
 * When hovering or tapping, each word is an independent interactive token.
 */
export function getWordChunks(
  text: string,
  pinyinStr: string,
  lineAlignment?: {
    start?: number;
    end?: number;
    words?: Array<{ charStart?: number; charEnd?: number; start: number; end: number }>;
    chars?: Array<{ charStart: number; charEnd: number; start: number; end: number }>;
  } | null,
): PhraseChunk[] {
  const rubyItems = alignRubyPinyin(text, pinyinStr);
  if (rubyItems.length === 0) return [];

  let flags = buildWordStartFlags(rubyItems, pinyinStr);
  const spokenCount = rubyItems.filter((r) => !r.isPunctuation).length;
  const flagCount = flags.filter(Boolean).length;

  // Fall back to Intl.Segmenter if authored pinyin lacked word spaces or boundary flags
  if (flagCount <= 1 && spokenCount > 1 && typeof Intl !== 'undefined' && Intl.Segmenter) {
    flags = rubyItems.map(() => false);
    const segs = Array.from(new Intl.Segmenter('zh-TW', { granularity: 'word' }).segment(text));
    let charOffset = 0;
    const itemStarts: number[] = [];
    for (const r of rubyItems) {
      itemStarts.push(charOffset);
      charOffset += r.char.length;
    }
    for (const seg of segs) {
      if (seg.isWordLike) {
        const itemIdx = itemStarts.indexOf(seg.index);
        if (itemIdx >= 0) flags[itemIdx] = true;
      }
    }
  }

  const units: InternalUnit[] = [];
  let currentWord: RubyItem[] = [];
  let currentWordStart = 0;
  let charPos = 0;

  for (let i = 0; i < rubyItems.length; i += 1) {
    const item = rubyItems[i];
    const itemStart = charPos;
    charPos += item.char.length;

    if (item.isPunctuation) {
      if (currentWord.length > 0) {
        units.push({
          text: currentWord.map((r) => r.char).join(''),
          isPunctuation: false,
          rubyItems: currentWord,
          charStart: currentWordStart,
          charEnd: itemStart,
        });
        currentWord = [];
      }
      const lastUnit = units[units.length - 1];
      if (lastUnit && lastUnit.isPunctuation) {
        lastUnit.text += item.char;
        lastUnit.rubyItems.push(item);
        lastUnit.charEnd = charPos;
      } else {
        units.push({
          text: item.char,
          isPunctuation: true,
          rubyItems: [item],
          charStart: itemStart,
          charEnd: charPos,
        });
      }
    } else {
      if (flags[i] && currentWord.length > 0) {
        units.push({
          text: currentWord.map((r) => r.char).join(''),
          isPunctuation: false,
          rubyItems: currentWord,
          charStart: currentWordStart,
          charEnd: itemStart,
        });
        currentWord = [];
      }
      if (currentWord.length === 0) currentWordStart = itemStart;
      currentWord.push(item);
    }
  }
  if (currentWord.length > 0) {
    units.push({
      text: currentWord.map((r) => r.char).join(''),
      isPunctuation: false,
      rubyItems: currentWord,
      charStart: currentWordStart,
      charEnd: charPos,
    });
  }

  // Assign timestamps
  if (lineAlignment) {
    const alignChars = lineAlignment.chars?.filter(
      (c) => typeof c.charStart === 'number' && typeof c.charEnd === 'number' && typeof c.start === 'number' && typeof c.end === 'number',
    ) ?? [];

    if (alignChars.length > 0) {
      for (const u of units) {
        if (u.isPunctuation) continue;
        const matching = alignChars.filter(
          (c) => c.charStart < u.charEnd && c.charEnd > u.charStart,
        );
        if (matching.length > 0) {
          u.start = matching[0].start;
          u.end = matching[matching.length - 1].end;
        }
      }
    } else {
      const alignWords = lineAlignment.words?.filter(
        (w) => typeof w.charStart === 'number' && typeof w.charEnd === 'number' && typeof w.start === 'number' && typeof w.end === 'number',
      ) ?? [];

      if (alignWords.length > 0) {
        for (const w of alignWords) {
          const matchingUnits = units.filter(
            (u) => !u.isPunctuation && u.charStart < w.charEnd! && u.charEnd > w.charStart!,
          );
          if (matchingUnits.length > 0) {
            const totalChars = matchingUnits.reduce((acc, u) => acc + u.text.length, 0) || 1;
            const duration = Math.max(0, w.end - w.start);
            let elapsed = 0;
            for (const u of matchingUnits) {
              u.start = w.start + (elapsed / totalChars) * duration;
              elapsed += u.text.length;
              u.end = w.start + (elapsed / totalChars) * duration;
            }
          }
        }
      }
    }

    if (typeof lineAlignment.start === 'number' && typeof lineAlignment.end === 'number') {
      const unaligned = units.filter((u) => !u.isPunctuation && u.start === undefined);
      if (unaligned.length > 0) {
        const totalChars = unaligned.reduce((acc, u) => acc + u.text.length, 0) || 1;
        const duration = Math.max(0, lineAlignment.end - lineAlignment.start);
        let elapsed = 0;
        for (const u of unaligned) {
          u.start = lineAlignment.start + (elapsed / totalChars) * duration;
          elapsed += u.text.length;
          u.end = lineAlignment.start + (elapsed / totalChars) * duration;
        }
      }
    }
  }

  return units.map(({ text: uText, isPunctuation, rubyItems: uRuby, start, end }) => ({
    text: uText,
    isPunctuation,
    rubyItems: uRuby,
    start,
    end,
  }));
}
