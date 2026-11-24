import test from 'node:test';
import assert from 'node:assert/strict';
import { testRubyItems } from '../../src/screens/lesson-test/testPinyin';
import {
  createLessonTestSlice,
  lessonTestBestForMode,
  type LessonTestState,
} from '../../src/store/slices/lessonTestSlice';
import { isLessonTestPassed } from '../../src/utils/lesson/lessonCompletion';

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

test('single-part runs save per-part bests without awarding the full-test crown or overwriting full best', () => {
  let state = {} as LessonTestState;
  const set = (partial: Partial<LessonTestState> | ((current: LessonTestState) => Partial<LessonTestState>)) => {
    state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) };
  };
  state = createLessonTestSlice(set);

  // First run: Listening only (8/8 = 100%) should NOT earn the lesson crown.
  state.recordLessonTestResult({
    key: 'b1l04', mode: 'listening', fullTotal: 20, correct: 8, total: 8,
    listening: [8, 8], reading: [0, 0], missedLessons: [], shownVersionIds: ['l1'],
  });
  assert.equal(isLessonTestPassed(state.lessonTests.b1l04), false);
  assert.equal(state.lessonTests.b1l04.partsOnly, true);
  assert.equal(lessonTestBestForMode(state.lessonTests.b1l04, 'both'), null);
  assert.deepEqual(lessonTestBestForMode(state.lessonTests.b1l04, 'listening'), { best: 8, total: 8 });
  assert.equal(lessonTestBestForMode(state.lessonTests.b1l04, 'reading'), null);

  // Next run: Full test (17/20 = 85%) earns the crown and updates Reading best while keeping Listening's 8/8.
  state.recordLessonTestResult({
    key: 'b1l04', mode: 'both', fullTotal: 20, correct: 17, total: 20,
    listening: [6, 8], reading: [11, 12], missedLessons: [2], shownVersionIds: ['l2', 'r1'],
  });
  assert.equal(isLessonTestPassed(state.lessonTests.b1l04), true);
  assert.equal(state.lessonTests.b1l04.partsOnly, undefined);
  assert.deepEqual(lessonTestBestForMode(state.lessonTests.b1l04, 'both'), { best: 17, total: 20 });
  assert.deepEqual(lessonTestBestForMode(state.lessonTests.b1l04, 'listening'), { best: 8, total: 8 });
  assert.deepEqual(lessonTestBestForMode(state.lessonTests.b1l04, 'reading'), { best: 11, total: 12 });

  // Later run: Reading only (12/12) improves Reading best without changing Full test's 17/20.
  state.recordLessonTestResult({
    key: 'b1l04', mode: 'reading', fullTotal: 20, correct: 12, total: 12,
    listening: [0, 0], reading: [12, 12], missedLessons: [], shownVersionIds: ['r2'],
  });
  assert.equal(isLessonTestPassed(state.lessonTests.b1l04), true);
  assert.deepEqual(lessonTestBestForMode(state.lessonTests.b1l04, 'both'), { best: 17, total: 20 });
  assert.deepEqual(lessonTestBestForMode(state.lessonTests.b1l04, 'reading'), { best: 12, total: 12 });
  assert.equal(state.lessonTests.b1l04.seen.r2, 1);
});
