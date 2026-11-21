import { createContext, useContext, useMemo } from 'react';
import { sentenceSegments } from '../../../utils/vocabulary/sentenceSegments';
import { LookupWords, useTestLookup, useWordSegments, type Lookup } from './TestLookup';

/** Words to keep whole that the segmenter would split: the lesson's names (`allowWords`, e.g. 中明). */
export const TestWords = createContext<string[]>([]);

/** A word longer than one character never breaks across lines. */
const wordPiece = ({ segment, index }: { segment: string; index: number }) => (
  segment.length > 1 ? <span key={index} className="whitespace-nowrap">{segment}</span> : segment
);

/** Words to look up (review): each Chinese word a button. */
function LookupText({ text, words, lookup }: { text: string; words: string[]; lookup: Lookup }) {
  return <LookupWords segments={useWordSegments(text, words)} lookup={lookup} piece={wordPiece} />;
}

/**
 * Chinese that wraps between words, never inside one (博物館 and 小姐 stay on one line). Inline, so it fits any text
 * element. Under a `TestLookup` (review) each word can be looked up.
 */
export function ChineseText({ text }: { text: string }) {
  const words = useContext(TestWords);
  const lookup = useTestLookup();
  const parts = useMemo(() => (lookup ? [] : sentenceSegments(text, words)), [lookup, text, words]);
  if (lookup) return <LookupText text={text} words={words} lookup={lookup} />;
  return parts.map(wordPiece);
}

const CLOSING = /^[，。、！？；：」』）]+/;

/** Punctuation that can't start a line, split off the front of the text after a blank, so it stays on the blank's line. */
export function splitClosing(text: string): [closing: string, rest: string] {
  const closing = CLOSING.exec(text)?.[0] ?? '';
  return [closing, text.slice(closing.length)];
}
