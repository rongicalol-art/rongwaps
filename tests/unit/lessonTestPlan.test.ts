import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { LessonTestLesson } from '../../src/types/lessonTest';
import { lessonItemIndex, lessonTestScreens, planLessonTest, scoreLessonTest } from '../../src/utils/lesson/lessonTestPlan';

/** The lesson test planner: which versions a run shows, the order of its answers, and its score. */

const lesson = readJson<LessonTestLesson>('content/lesson-tests/book-1/lesson04.json');
const items = lessonItemIndex(lesson);

test('a plan is reproducible from its seed and differs between seeds', () => {
  const a = planLessonTest(lesson, {}, 'seed-a');
  assert.deepEqual(planLessonTest(lesson, {}, 'seed-a'), a);
  const others = ['b', 'c', 'd', 'e'].map((seed) => JSON.stringify(planLessonTest(lesson, {}, seed).items));
  assert.ok(others.some((other) => other !== JSON.stringify(a.items)));
});

test('listening comes first, one item per slot', () => {
  const plan = planLessonTest(lesson, {}, 'order');
  assert.equal(plan.items.length, lesson.slots.length);
  const parts = plan.items.map((item) => item.part);
  assert.deepEqual(parts, [...parts].sort((x, y) => (x === y ? 0 : x === 'listening' ? -1 : 1)));
  assert.equal(new Set(plan.items.map((item) => item.slotId)).size, lesson.slots.length);
});

test('a retake shows the versions seen least', () => {
  const first = planLessonTest(lesson, {}, 'first');
  const seen = Object.fromEntries(first.items.map((item) => [item.itemId, 1]));
  const second = planLessonTest(lesson, { seen }, 'second');
  for (const slot of lesson.slots) {
    const picked = second.items.find((item) => item.slotId === slot.id)!.itemId;
    assert.equal(seen[picked], undefined, `${slot.id} repeated ${picked}`);
  }
});

test('earlier lessons the learner missed are picked more often in review slots', () => {
  const review = lesson.slots.find((slot) => slot.review && new Set(slot.versions.map((v) => v.questions[0].lesson)).size > 1);
  assert.ok(review, 'needs a review slot whose versions come from different lessons');
  const missedLesson = review.versions[0].questions[0].lesson;
  let hits = 0;
  for (let run = 0; run < 300; run += 1) {
    const plan = planLessonTest(lesson, { missedLessons: [missedLesson] }, `w${run}`);
    const item = items.get(plan.items.find((entry) => entry.slotId === review.id)!.itemId)!;
    if (item.questions[0].lesson === missedLesson) hits += 1;
  }
  assert.ok(hits > 150, `missed lesson picked ${hits}/300`);
});

test('every order is a permutation, and right answers spread over the letters', () => {
  const counts = new Map<number, number[]>();
  for (let run = 0; run < 40; run += 1) {
    const plan = planLessonTest(lesson, {}, `letters-${run}`);
    for (const planned of plan.items) {
      const item = items.get(planned.itemId)!;
      for (const question of item.questions) {
        const order = planned.orders[question.id];
        if (!question.choices) continue;
        assert.deepEqual([...order].sort(), question.choices.map((_, index) => index));
        const tally = counts.get(order.length) ?? Array(order.length).fill(0);
        tally[order.indexOf(question.key)] += 1;
        counts.set(order.length, tally);
      }
    }
  }
  for (const tally of counts.values()) {
    const mean = tally.reduce((sum, value) => sum + value, 0) / tally.length;
    for (const value of tally) assert.ok(Math.abs(value - mean) <= mean * 0.15, `letters uneven: ${tally}`);
  }
});

test('a word bank never lists the answers in blank order', () => {
  for (let run = 0; run < 50; run += 1) {
    const plan = planLessonTest(lesson, {}, `bank-${run}`);
    for (const planned of plan.items.filter((entry) => entry.bankOrder)) {
      const item = items.get(planned.itemId)!;
      const positions = item.questions.map((question) => planned.bankOrder!.indexOf(question.key));
      assert.ok(positions.some((position, index) => index > 0 && position < positions[index - 1]), `bank in blank order: ${planned.itemId}`);
    }
  }
});

test('a paragraph is one screen; scoring counts every question per part', () => {
  const plan = planLessonTest(lesson, {}, 'score');
  const screens = lessonTestScreens(lesson, plan);
  const paragraph = screens.find((screen) => items.get(screen.itemId)!.kind === 'paragraph-bank')!;
  assert.ok(paragraph.questionIds.length > 1);
  const total = screens.reduce((sum, screen) => sum + screen.questionIds.length, 0);

  const allRight = Object.fromEntries(plan.items.flatMap((planned) => items.get(planned.itemId)!.questions.map((q) => [q.id, q.key])));
  const perfect = scoreLessonTest(lesson, plan, allRight);
  assert.equal(perfect.correct, total);
  assert.equal(perfect.total, total);
  assert.equal(perfect.listening[0] + perfect.reading[0], total);
  assert.equal(perfect.missed.length, 0);

  const firstId = screens[0].questionIds[0];
  const oneBlank = { ...allRight };
  delete oneBlank[firstId];
  const missedOne = scoreLessonTest(lesson, plan, oneBlank);
  assert.equal(missedOne.correct, total - 1);
  assert.equal(missedOne.listening[0], perfect.listening[0] - 1);
  assert.deepEqual(missedOne.missed.map((entry) => entry.question.id), [firstId]);
});
