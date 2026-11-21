import test from 'node:test';
import assert from 'node:assert/strict';
import { testRubyItems } from '../../src/screens/lesson-test/testPinyin';
import { createLessonTestSlice, type LessonTestState } from '../../src/store/slices/lessonTestSlice';

test('pinyin goes over each character when it matches them one to one', () => {
  const items = testRubyItems('報告不是這個星期五就要交嗎？', 'Bàogào bú shì zhège xīngqíwǔ jiù yào jiāo ma?');
  assert.ok(items);
  assert.deepEqual(items.filter((item) => item.pinyin).map((item) => `${item.char}${item.pinyin}`).slice(0, 4), ['報Bào', '告gào', '不bú', '是shì']);
  assert.equal(items.at(-1)?.char, '？');
});

test('pinyin that spells numbers out is not forced onto the characters', () => {
  assert.equal(testRubyItems('時間：12月每個星期三 18:30–20:30', "Shíjiān: Shí'èr yuè měi ge xīngqísān shíbā diǎn sānshí dào èrshí diǎn sānshí"), null);
});

test('a finished test keeps its run for Scripts & answers, and a reset clears it', () => {
  let state = {} as LessonTestState;
  const set = (partial: Partial<LessonTestState> | ((current: LessonTestState) => Partial<LessonTestState>)) => {
    state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) };
  };
  state = createLessonTestSlice(set);
  const plan = { key: 'b2l09', seed: 's', items: [{ slotId: 'talk', part: 'listening' as const, itemId: 'b2l09-talk-1', orders: { q1: [1, 0, 2, 3] } }] };
  state.recordLessonTestResult({
    key: 'b2l09', correct: 17, total: 20, listening: [7, 8], reading: [10, 12], missedLessons: [], shownVersionIds: ['b2l09-talk-1'],
    review: { plan, answers: { q1: 2 } },
  });
  assert.deepEqual(state.lessonTestLast.b2l09.plan, plan);
  assert.deepEqual(state.lessonTestLast.b2l09.answers, { q1: 2 });
  assert.equal(state.lessonTestAttempt, null);
  state.resetLessonTests();
  assert.deepEqual(state.lessonTestLast, {});
});

test('a saved test can be read back only while its questions and choices still match the pack', async () => {
  const { planFitsLesson } = await import('../../src/utils/lesson/lessonTestPlan');
  const choice = (traditional: string) => ({ traditional });
  const lesson = {
    key: 'b9l01', allowWords: [],
    slots: [{ id: 's', part: 'reading', versions: [{ id: 'i', kind: 'read-pick', questions: [{ id: 'q', key: 0, choices: [choice('一'), choice('二'), choice('三')] }] }] }],
  } as never;
  const planned = (order: number[]) => ({ key: 'b9l01', seed: 'x', items: [{ slotId: 's', part: 'reading', itemId: 'i', orders: { q: order } }] });
  assert.equal(planFitsLesson(lesson, planned([2, 0, 1])), true);
  assert.equal(planFitsLesson(lesson, planned([3, 0, 1, 2])), false, 'a choice the pack no longer has');
  assert.equal(planFitsLesson(lesson, { items: [{ itemId: 'gone', orders: {} }] }), false, 'an item the pack no longer has');
  assert.equal(planFitsLesson(lesson, {}), false, 'a malformed saved plan');
  assert.equal(planFitsLesson(lesson, undefined), false);
});
