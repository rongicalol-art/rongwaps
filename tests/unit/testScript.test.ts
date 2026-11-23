import assert from 'node:assert/strict';
import test from 'node:test';
import type { DialogueItem, LessonTestQuestion, PictureHearItem, ReadingItem, ReadPickPictureItem, SceneGapItem, TestLine } from '../../src/types/lessonTest';
import { testScript } from '../../src/screens/lesson-test/testScript';

/** The Fix round's Script sheet: every spoken line with its answer marked, or a text's pinyin and English. */

const clip = (file: string) => ({ voice: 'studio' as const, file });
const say = (speaker: TestLine['speaker'], text: string): TestLine =>
  ({ speaker, traditional: text, simplified: text, pinyin: `${text}-py`, english: `${text}-en`, audio: clip(text) });
const question = (id: string, extra: Partial<LessonTestQuestion> = {}): LessonTestQuestion =>
  ({ id, key: 1, why: '', focus: { zh: '', en: '' }, lesson: 1, wordIds: [], ...extra });
const numberOf = (q: LessonTestQuestion) => ({ q1: 7, q2: 8 })[q.id as 'q1' | 'q2'] ?? 0;

test('a dialogue lists its lines by voice and marks the line that answers the question', () => {
  const item: DialogueItem = {
    id: 'd', kind: 'dialogue', answerLine: 1,
    lines: [say('M', '你要去哪裡？'), say('F', '我要去圖書館。')],
    questions: [question('q1')],
  };
  const script = testScript(item, item.questions, {}, numberOf);
  assert.equal(script?.kind, 'lines');
  if (script?.kind !== 'lines') return;
  assert.deepEqual(script.rows.map((row) => [row.badge, row.text.traditional, row.answer, row.number]), [
    ['男', '你要去哪裡？', false, undefined],
    ['女', '我要去圖書館。', true, undefined],
  ]);
  assert.equal(script.rows[1].audio?.file, '我要去圖書館。');
});

test("a recording with two questions tags each answer line with its question's number, also when only one is shown", () => {
  const item: DialogueItem = {
    id: 'g', kind: 'dialogue', answerLine: 0, intro: say('N', '請聽一段留言，然後回答兩個問題。'),
    lines: [say('F', '練習改到星期天。'), say('F', '導演想請你演爸爸。'), say('F', '謝謝！')],
    questions: [question('q1', { answerLine: 0 }), question('q2', { answerLine: 1 })],
  };
  const both = testScript(item, item.questions, {}, numberOf);
  assert.ok(both?.kind === 'lines');
  assert.equal(both.intro?.traditional, '請聽一段留言，然後回答兩個問題。');
  assert.deepEqual(both.rows.map((row) => row.number), ['7', '8', undefined]);
  // The Fix round shows only the missed question: its line keeps its own number.
  const missed = testScript(item, [item.questions[1]], {}, numberOf);
  assert.ok(missed?.kind === 'lines');
  assert.deepEqual(missed.rows.map((row) => [row.answer, row.number]), [[false, undefined], [true, '8'], [false, undefined]]);
});

test("a picture question's script is its question, then the answers in the order shown, the right one marked", () => {
  const item: PictureHearItem = {
    id: 'p', kind: 'picture-hear', picture: { picture: 'reading:B2L01-R01', alt: '' },
    questions: [question('q1', { key: 0, prompt: say('N', '他在做什麼？'), choices: [say('N', '看書'), say('N', '寫字'), say('N', '唱歌')] })],
  };
  const script = testScript(item, item.questions, { q1: [2, 0, 1] }, numberOf);
  assert.ok(script?.kind === 'lines');
  assert.deepEqual(script.rows.map((row) => [row.badge, row.text.traditional, row.answer]), [
    ['?', '他在做什麼？', false],
    ['A', '唱歌', false],
    ['B', '看書', true],
    ['C', '寫字', false],
  ]);
});

test('a text gives its pinyin and English by paragraph, title first', () => {
  const item: ReadingItem = {
    id: 'r', kind: 'reading', format: 'notice',
    title: { traditional: '舞會', simplified: '舞会', pinyin: 'Wǔhuì', english: 'Dance party' },
    text: { traditional: '時間：七點\n地方：二樓', simplified: '时间：七点\n地方：二楼', pinyin: 'Shíjiān: qī diǎn\nDìfāng: èr lóu', english: 'Time: 7:00\nPlace: 2nd floor' },
    questions: [question('q1')],
  };
  assert.deepEqual(testScript(item, item.questions, {}, numberOf), {
    kind: 'text',
    pinyin: ['Wǔhuì', 'Shíjiān: qī diǎn', 'Dìfāng: èr lóu'],
    english: ['Dance party', 'Time: 7:00', 'Place: 2nd floor'],
    answers: [],
  });
});

test('the Script holds the completed gap sentence and the sentence matched to a picture', () => {
  const line = { traditional: '我去圖書館。', simplified: '我去图书馆。', pinyin: 'Wǒ qù túshūguǎn.', english: 'I am going to the library.' };
  const gap: SceneGapItem = {
    id: 's', kind: 'scene-gap', picture: 'reading:B2L01-R02', alt: '',
    questions: [question('q1', { answer: line })],
  };
  const picture: ReadPickPictureItem = {
    id: 'p', kind: 'read-pick-picture', questions: [question('q1', { prompt: line })],
  };
  for (const item of [gap, picture]) {
    const script = testScript(item, item.questions, {}, numberOf);
    assert.ok(script.kind === 'text');
    assert.deepEqual(script.answers.map((row) => row.text), [line]);
  }
});

test('two questions answered on the same line both show their numbers there', () => {
  const item: DialogueItem = {
    id: 't', kind: 'dialogue', answerLine: 1,
    lines: [say('F', '你好。'), say('F', '我七點起床，八點上課。')],
    questions: [question('q1'), question('q2')],
  };
  const script = testScript(item, item.questions, {}, numberOf);
  assert.ok(script?.kind === 'lines');
  assert.deepEqual(script.rows.map((row) => [row.answer, row.number]), [[false, undefined], [true, '7, 8']]);
});
