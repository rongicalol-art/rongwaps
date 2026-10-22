import type { SentenceSegment } from '../../types/sentenceLookup';

export const HAN_CHARACTER = /\p{Script=Han}/u;
let segmenter: Intl.Segmenter | undefined;

/** Authored word boundaries win; highlighting never changes lookup boundaries. */
export function sentenceSegments(text: string, authoredWords: string[] = []): SentenceSegment[] {
  const words = [...new Set(authoredWords.filter(Boolean))].sort((a, b) => b.length - a.length);
  const result: SentenceSegment[] = [];
  let index = 0;
  while (index < text.length) {
    const authored = words.find(word => text.startsWith(word, index));
    if (authored) {
      result.push({ segment: authored, index, input: text, isWordLike: HAN_CHARACTER.test(authored) });
      index += authored.length;
      continue;
    }
    let end = index + (text.codePointAt(index)! > 0xffff ? 2 : 1);
    while (end < text.length && !words.some(word => text.startsWith(word, end))) {
      end += text.codePointAt(end)! > 0xffff ? 2 : 1;
    }
    const run = text.slice(index, end);
    try {
      segmenter ??= new Intl.Segmenter('zh-TW', { granularity: 'word' });
      for (const part of segmenter.segment(run)) {
        result.push({ ...part, index: index + part.index, input: text });
      }
    } catch {
      let offset = index;
      for (const char of run) {
        result.push({ segment: char, index: offset, input: text, isWordLike: HAN_CHARACTER.test(char) });
        offset += char.length;
      }
    }
    index = end;
  }
  return result;
}

/** Candidates include subwords so an unknown phrase doesn't destroy known compounds. */
export function sentenceCandidates(segments: SentenceSegment[]): string[] {
  const candidates = new Set<string>();
  for (const { segment, isWordLike } of segments) {
    if (!isWordLike || !HAN_CHARACTER.test(segment)) continue;
    const chars = Array.from(segment);
    for (let start = 0; start < chars.length; start++) {
      for (let length = 2; length <= chars.length - start; length++) {
        candidates.add(chars.slice(start, start + length).join(''));
      }
    }
  }
  return [...candidates];
}

export function validatedSentenceSegments(segments: SentenceSegment[], valid: ReadonlySet<string>): SentenceSegment[] {
  return segments.flatMap(part => {
    if (!part.isWordLike || !HAN_CHARACTER.test(part.segment) || valid.has(part.segment)) return [part];
    const chars = Array.from(part.segment);
    const result: SentenceSegment[] = [];
    let offset = part.index;
    for (let start = 0; start < chars.length;) {
      let length = chars.length - start;
      while (length > 1 && !valid.has(chars.slice(start, start + length).join(''))) length--;
      const word = chars.slice(start, start + length).join('');
      result.push({ ...part, segment: word, index: offset });
      offset += word.length;
      start += length;
    }
    return result;
  });
}
