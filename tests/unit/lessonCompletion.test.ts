import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isLessonTestPassed,
  lessonProgressKey,
  mergeLessonProgress,
  summarizeLessonCompletion,
} from '../../src/utils/lesson/lessonCompletion';
import { useAppStore } from '../../src/store/useAppStore';

const all = (total: number) => ({ done: total, total });

test('a lesson is done once words, grammar and readings are all finished', () => {
  const done = summarizeLessonCompletion({ words: all(40), grammar: all(6), reading: all(2) });
  assert.equal(done.isDone, true);
  assert.equal(done.isMarkedDone, false);
  assert.deepEqual(done.activityBars.map((bar) => bar.fraction), [1, 1, 1]);

  const halfRead = summarizeLessonCompletion({ words: all(40), grammar: all(6), reading: { done: 1, total: 2 } });
  assert.equal(halfRead.isDone, false);
  assert.deepEqual(halfRead.activityBars.map((bar) => [bar.key, bar.fraction]), [['words', 1], ['grammar', 1], ['reading', 0.5]]);
});

test('unknown readings never make a lesson done, and get no bar', () => {
  const result = summarizeLessonCompletion({ words: all(40), grammar: all(6), reading: null });
  assert.equal(result.isDone, false);
  assert.deepEqual(result.activityBars.map((bar) => bar.key), ['words', 'grammar']);
});

test('an activity the lesson does not have gets no bar and does not block done', () => {
  const result = summarizeLessonCompletion({ words: all(30), grammar: { done: 0, total: 0 }, reading: all(2) });
  assert.equal(result.isDone, true);
  assert.deepEqual(result.activityBars.map((bar) => bar.key), ['words', 'reading']);
});

test('a hand-made mark makes an unfinished lesson done; a mark on a finished one is not "marked"', () => {
  const mark = { done: true, at: '2026-11-08T10:00:00.000Z' };
  const unfinished = summarizeLessonCompletion({ words: { done: 3, total: 40 }, grammar: all(6), reading: all(2), mark });
  assert.equal(unfinished.isDone, true);
  assert.equal(unfinished.isMarkedDone, true);
  const finished = summarizeLessonCompletion({ words: all(40), grammar: all(6), reading: all(2), mark });
  assert.equal(finished.isMarkedDone, false);
  const unmarked = summarizeLessonCompletion({ words: { done: 3, total: 40 }, grammar: all(6), reading: all(2), mark: { ...mark, done: false } });
  assert.equal(unmarked.isDone, false);
});

test('the lesson test counts as passed from the pass mark', () => {
  assert.equal(isLessonTestPassed(undefined), false);
  assert.equal(isLessonTestPassed({ best: 15, total: 20 }), false);
  assert.equal(isLessonTestPassed({ best: 16, total: 20 }), true);
  assert.equal(lessonProgressKey(3, 1), 'b3l01');
});

test('merging adds readings read elsewhere and keeps the newest done mark', () => {
  const local = {
    readReadingIds: ['B3L01-R01'],
    lessonDoneMarks: {
      b3l01: { done: true, at: '2026-11-08T10:00:00.000Z' },
      b3l02: { done: true, at: '2026-11-08T10:00:00.000Z' },
    },
  };
  const patch = mergeLessonProgress(local, {
    readReadingIds: ['B3L01-R01', 'B3L01-R02', 7],
    lessonDoneMarks: {
      b3l01: { done: false, at: '2026-11-08T11:00:00.000Z' }, // undone later on another device
      b3l02: { done: false, at: '2026-11-08T09:00:00.000Z' }, // older: ignored
      b3l03: { done: true, at: 'not a date' }, // malformed: ignored
    },
  });
  assert.deepEqual(patch.readReadingIds, ['B3L01-R01', 'B3L01-R02']);
  assert.deepEqual(patch.lessonDoneMarks, {
    b3l01: { done: false, at: '2026-11-08T11:00:00.000Z' },
    b3l02: { done: true, at: '2026-11-08T10:00:00.000Z' },
  });
  assert.deepEqual(mergeLessonProgress(local, {}), {});
});

test('lessons done under the old rule are kept done once per book, never over a mark', () => {
  useAppStore.setState({ legacyDoneBooks: [], lessonDoneMarks: { b3l02: { done: false, at: '2026-11-08T09:00:00.000Z' } } });
  useAppStore.getState().keepLegacyLessonsDone(3, ['b3l01', 'b3l02']);
  let state = useAppStore.getState();
  assert.equal(state.lessonDoneMarks.b3l01?.done, true);
  assert.equal(state.lessonDoneMarks.b3l02?.done, false);
  assert.deepEqual(state.legacyDoneBooks, [3]);

  // A second check of the same book changes nothing.
  useAppStore.getState().keepLegacyLessonsDone(3, ['b3l03']);
  state = useAppStore.getState();
  assert.equal(state.lessonDoneMarks.b3l03, undefined);
  useAppStore.getState().resetAccountScopedState();
});
