import type { RubyItem, PhraseChunk } from '../../types/ruby';
import { PUNCTUATION_REGEX } from '../../data/pinyinTables';
import { alignRubyPinyin } from './rubyAlignment';
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
