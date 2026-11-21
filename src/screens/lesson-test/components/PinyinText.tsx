import { useContext, useMemo } from 'react';
import type { RubyItem } from '../../../types/ruby';
import { testRubyItems } from '../testPinyin';
import { ChineseText, TestWords } from './ChineseText';
import { LookupWords, useTestLookup, useWordSegments, type Lookup } from './TestLookup';

const HAN = /\p{Script=Han}/u;

/** Each character with its syllable over it, the rest as plain text. */
function RubyChars({ items }: { items: RubyItem[] }) {
  return items.map((item, index) => (item.pinyin && HAN.test(item.char) ? (
    <ruby key={index} className="mx-px [ruby-position:over]">
      {item.char}
      <rt className="select-none pb-0.5 font-sans text-[10.5px] font-bold leading-none tracking-normal text-ui-muted-strong">{item.pinyin}</rt>
    </ruby>
  ) : item.char));
}

/** The ruby grouped into words to look up: each word takes the characters that start inside it. */
function LookupRuby({ items, lookup }: { items: RubyItem[]; lookup: Lookup }) {
  const words = useContext(TestWords);
  const segments = useWordSegments(items.map((item) => item.char).join(''), words);
  const starts: number[] = [];
  items.reduce((at, item) => { starts.push(at); return at + item.char.length; }, 0);
  const inSegment = (index: number, length: number) => items.filter((_, at) => starts[at] >= index && starts[at] < index + length);
  return <LookupWords segments={segments} lookup={lookup} piece={({ index, segment }) => <RubyChars items={inSegment(index, segment.length)} />} />;
}

/** One run of ruby, the Reader's way: each character with its syllable over it. Under a `TestLookup`, word by word. */
export function RubyRun({ items }: { items: RubyItem[] }) {
  const lookup = useTestLookup();
  return lookup ? <LookupRuby items={items} lookup={lookup} /> : <RubyChars items={items} />;
}

/**
 * Chinese with its pinyin over the characters when `show` is on (as the Reader shows it); off, it is the test's own
 * Chinese text, wrapping between words. Pinyin that can't be matched to the characters goes on a line of its own.
 */
export function PinyinText({ text, pinyin, show }: { text: string; pinyin?: string; show: boolean }) {
  const items = useMemo(() => (show && pinyin ? testRubyItems(text, pinyin) : null), [show, text, pinyin]);
  if (!show || !pinyin) return <ChineseText text={text} />;
  if (!items) {
    return (
      <>
        <ChineseText text={text} />
        <span className="block font-sans text-[15px] font-bold leading-snug text-ui-muted-strong">{pinyin}</span>
      </>
    );
  }
  return <RubyRun items={items} />;
}
