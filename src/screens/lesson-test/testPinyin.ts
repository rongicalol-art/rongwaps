import type { RubyItem } from '../../types/ruby';
import { alignRubyPinyin, splitPinyinToSyllables } from '../../utils/pinyin/rubyPinyin';

const HAN = /\p{Script=Han}/u;
const DIGITS = /^[0-9]+$/;

/**
 * The text's characters with their syllables, or null when the pinyin doesn't fit them one to one (a notice that
 * spells its numbers out, 18:30 → shíbā diǎn sānshí): a wrong syllable over a character is worse than none.
 */
export function testRubyItems(text: string, pinyin: string): RubyItem[] | null {
  const items = alignRubyPinyin(text, pinyin);
  const characters = [...text].filter((char) => HAN.test(char)).length;
  const syllables = splitPinyinToSyllables(pinyin).filter((syllable) => !DIGITS.test(syllable)).length;
  if (syllables !== characters || items.some((item) => HAN.test(item.char) && !item.pinyin)) return null;
  return items;
}
