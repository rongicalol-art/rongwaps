import { useMemo } from 'react';
import type { RubyItem } from '../../../types/ruby';
import { testRubyItems } from '../testPinyin';
import { ChineseText } from './ChineseText';

const HAN = /\p{Script=Han}/u;

/** One run of ruby, the Reader's way: each character with its syllable over it, the rest as plain text. */
export function RubyRun({ items }: { items: RubyItem[] }) {
  return items.map((item, index) => (item.pinyin && HAN.test(item.char) ? (
    <ruby key={index} className="mx-px [ruby-position:over]">
      {item.char}
      <rt className="select-none pb-0.5 font-sans text-[10.5px] font-bold leading-none tracking-normal text-ui-muted-strong">{item.pinyin}</rt>
    </ruby>
  ) : item.char));
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
