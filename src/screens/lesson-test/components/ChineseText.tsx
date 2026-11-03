import { createContext, useContext, useMemo } from 'react';
import { sentenceSegments } from '../../../utils/vocabulary/sentenceSegments';

/** Words to keep whole that the segmenter would split: the lesson's names (`allowWords`, e.g. 中明). */
export const TestWords = createContext<string[]>([]);

/** Chinese that wraps between words, never inside one (博物館 and 小姐 stay on one line). Inline, so it fits any text element. */
export function ChineseText({ text }: { text: string }) {
  const words = useContext(TestWords);
  const parts = useMemo(() => sentenceSegments(text, words), [text, words]);
  return parts.map(({ segment, index }) => (
    segment.length > 1 ? <span key={index} className="whitespace-nowrap">{segment}</span> : segment
  ));
}

const CLOSING = /^[，。、！？；：」』）]+/;

/** Punctuation that can't start a line, split off the front of the text after a blank, so it stays on the blank's line. */
export function splitClosing(text: string): [closing: string, rest: string] {
  const closing = CLOSING.exec(text)?.[0] ?? '';
  return [closing, text.slice(closing.length)];
}
