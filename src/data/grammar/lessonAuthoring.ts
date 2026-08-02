import type {
  GrammarExerciseQuestion,
  GrammarLessonExample,
  GrammarPatternRow,
} from '../../types/models';
import {
  answerTile,
  grammarText,
  grammarToken,
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

export function fillQuestion(
  scope: string,
  number: number,
  sectionLabel: string,
  before: string,
  answer: AnswerSpec,
  after: string,
  distractors: AnswerSpec[],
  correctFeedback: string,
  repairFeedback: string,
): GrammarExerciseQuestion {
  const choices = [answer, ...distractors];
  return {
    id: `${scope}-q${number}`,
    number,
    sectionLabel,
    segments: [
      ...(before ? [{ type: 'text' as const, traditional: before }] : []),
      {
        type: 'blank',
        id: `${scope}-q${number}-blank`,
        answer: answer[0],
        answerSimplified: answer[3],
        hint: repairFeedback,
      },
      ...(after ? [{ type: 'text' as const, traditional: after }] : []),
    ],
    tiles: choices.map(([traditional, pinyin, meaning, simplified], index) =>
      answerTile(`${scope}-q${number}-tile${index + 1}`, traditional, pinyin, meaning, simplified)),
    correctFeedback,
    repairFeedback,
  };
}

export function patternRow(
  scope: string,
  number: number,
  lexicon: GrammarLexeme[],
  subject: string[],
  grammar: string[],
  complement: string[],
  english: string,
): GrammarPatternRow {
  const makeTokens = (words: string[], group: string) =>
    words.map((word, index) =>
      grammarToken(`${scope}-p${number}-${group}${index + 1}`, lexicon, word, {
        ...(group === 'c' && index === words.length - 1 ? { suffix: '。' } : {}),
      }));

  return {
    id: `${scope}-p${number}`,
    subject: makeTokens(subject, 's'),
    grammar: makeTokens(grammar, 'g'),
    complement: makeTokens(complement, 'c'),
    english,
  };
}
