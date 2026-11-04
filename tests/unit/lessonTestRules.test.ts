import assert from 'node:assert/strict';
import test from 'node:test';
import type { DialogueItem, LessonTestLesson, LessonTestQuestion, TestLine } from '../../src/types/lessonTest';
import { loadLessonTestContext, runProblems, structureProblems } from '../../scripts/content/lessonTestRules';

/** TOCFL Band B rules (content/lesson-tests/README.md): printed choices read aloud, one play, groups, short choices, review of the book before. */

const ctx = loadLessonTestContext();
const text = (traditional: string) => ({ traditional, simplified: traditional, pinyin: 'x', english: 'x' });
const say = (speaker: TestLine['speaker'], traditional: string): TestLine => ({ speaker, ...text(traditional) });
const B3L01_POINTS = ['B3L01-G01-P29', 'B3L01-G02-P30', 'B3L01-G03-P32', 'B3L01-G04-P38', 'B3L01-G05-P40', 'B3L01-G06-P42'];

const question = (id: string, extra: Partial<LessonTestQuestion> = {}): LessonTestQuestion => ({
  id,
  key: 0,
  why: 'Because.',
  focus: { zh: '夢想', en: 'dream' },
  lesson: 1,
  wordIds: ['B3L01-1-01'],
  prompt: say('N', '他想做什麼？'),
  choices: ['當導演', '當演員', '當律師', '當市長'].map((choice) => say('N', choice)),
  ...extra,
});

const dialogue = (id: string, questions: LessonTestQuestion[], extra: Partial<DialogueItem> = {}): DialogueItem => ({
  id,
  kind: 'dialogue',
  printed: true,
  plays: 1,
  answerLine: 1,
  lines: [say('F', '你以後想做什麼？'), say('M', '我想當導演。')],
  questions,
  ...extra,
});

const lesson = (items: DialogueItem[][]): LessonTestLesson => ({
  schemaVersion: 1,
  key: 'b3l01',
  bookId: 3,
  lessonId: 1,
  band: 'B',
  slots: items.map((versions, index) => ({ id: `s${index}`, part: 'listening', versions })),
});

test('Band B dialogues print their choices, play once, and the narrator reads every choice', () => {
  const problems = structureProblems(lesson([[
    dialogue('a', [question('a-q')], { printed: undefined, plays: 2 }),
    dialogue('b', [question('b-q', { choices: question('x').choices!.map((choice) => ({ ...choice, speaker: undefined })) })]),
  ]]), ctx);
  assert.ok(problems.includes('a: Band B prints its choices (printed: true)'));
  assert.ok(problems.includes('a: Band B plays each recording once (plays: 1)'));
  assert.ok(problems.includes('b-q: the narrator reads every choice (speaker N)'));
});

test("a recording with several questions opens with the narrator's line and names each question's answer line", () => {
  const problems = structureProblems(lesson([[
    dialogue('g1', [question('g1-1', { answerLine: 1 }), question('g1-2')]),
    dialogue('g2', [question('g2-1', { answerLine: 0 }), question('g2-2', { answerLine: 1 })], { intro: say('N', '請聽一段對話，然後回答兩個問題。') }),
  ]]), ctx);
  assert.ok(problems.includes("g1: a recording with several questions opens with the narrator's intro"));
  assert.ok(problems.includes('g1-2: each question of a group names its answerLine'));
  assert.ok(!problems.some((problem) => problem.startsWith('g2')));
});

test('Band B choices stay within 15 characters', () => {
  const long = say('N', '他覺得當導演比當演員更有意思一點');
  const problems = structureProblems(lesson([[dialogue('c', [question('c-q', { choices: [long, ...question('x').choices!.slice(1)] })])]]), ctx);
  assert.ok(problems.some((problem) => problem.startsWith('c-q: choice')));
});

test("a later book's Lesson 1 counts the book before as review", () => {
  const own = (id: string) => question(id, { grammarIds: B3L01_POINTS });
  const review = (id: string) => question(id, { book: 2, lesson: 12, wordIds: ['B2L12-1-01'] });
  const slots = (reviews: number) => Array.from({ length: 16 }, (_, index) => [
    dialogue(`d${index}`, [index < reviews ? review(`d${index}-q`) : own(`d${index}-q`)]),
    dialogue(`e${index}`, [index < reviews ? review(`e${index}-q`) : own(`e${index}-q`)]),
  ]);
  assert.deepEqual(runProblems(lesson(slots(4)), ctx), []);
  assert.match(runProblems(lesson(slots(0)), ctx)[0], /reviews 0% earlier lessons/);
  assert.ok(structureProblems(lesson([[dialogue('r', [question('r-q', { book: 3 })])]]), ctx).includes('r-q: book is only for an earlier book\'s lesson'));
});
