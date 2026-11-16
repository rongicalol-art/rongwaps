import type { GrammarLessonExample } from '../../types/models';
import {
  grammarText,
  type GrammarLexeme,
} from './lessonTwoHelpers';

export type AnswerSpec = [
  traditional: string,
  pinyin: string,
  meaning: string,
  simplified?: string,
];

export function example(
  scope: string,
  number: number,
  traditional: string,
  simplified: string,
  pinyin: string,
  english: string,
  lexicon: GrammarLexeme[],
  teachingNote?: string,
): GrammarLessonExample {
  return {
    id: `${scope}-e${number}`,
    number,
    teachingNote,
    text: grammarText(`${scope}-e${number}`, traditional, simplified, pinyin, english, lexicon),
  };
}
