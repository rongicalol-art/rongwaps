import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrammarExerciseQuestion } from '../src/types/models';
import {
  evaluateGrammarTextResponses,
  normalizeGrammarTextAnswer,
} from '../src/utils/grammarExercise';

const question: GrammarExerciseQuestion = {
  id: 'text-question',
  number: 1,
  responseMode: 'text',
  segments: [
    { type: 'text', traditional: 'A：現在幾點？ B：' },
    {
      type: 'blank',
      id: 'answer',
      answer: '現在十點十五分',
      answerSimplified: '现在十点十五分',
      acceptedAnswers: ['現在九點'],
      acceptedAnswersSimplified: ['现在九点'],
      hint: 'Answer with a clock time.',
    },
  ],
  tiles: [],
};

test('grammar text normalization ignores harmless spacing and punctuation', () => {
  assert.equal(normalizeGrammarTextAnswer(' 現在 十點十五分。 '), '現在十點十五分');
});

test('grammar text responses accept only authored traditional or simplified answers', () => {
  assert.deepEqual(
    evaluateGrammarTextResponses([question], { answer: '现在九点！' }),
    {
      correctBlankIds: ['answer'],
      wrongBlankIds: [],
      complete: true,
    },
  );

  assert.deepEqual(
    evaluateGrammarTextResponses([question], { answer: 'x' }),
    {
      correctBlankIds: [],
      wrongBlankIds: ['answer'],
      complete: false,
    },
  );
});
