import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { LessonTestLesson } from '../../src/types/lessonTest';
import { lessonTestScreens, scoreLessonTest } from '../../src/utils/lesson/lessonTestPlan';
import { planPoolTest, poolItemIndex, type MockRecipe, type PoolEntry } from '../../src/utils/mockTest/pool';

/** The mock test's pool: a recipe drawn from labelled questions, reusing the lesson test's planner and scorer. */

const lessons = ['lesson03', 'lesson04', 'lesson05'].map((name) => readJson<LessonTestLesson>(`content/lesson-tests/book-1/${name}.json`));
const pool: PoolEntry[] = lessons.flatMap((lesson) => lesson.slots.flatMap((slot) => slot.versions.map((item): PoolEntry => ({
  item, part: slot.part, band: 'A', section: `A:${slot.part}:${item.kind}`, level: lesson.lessonId === 3 ? 1 : 2, difficulty: 0,
  family: `${lesson.key}:${slot.id}`, origin: lesson,
}))));
const sections = [...new Set(pool.map((entry) => entry.section))];
const recipe: MockRecipe = { key: 'test-a', band: 'A', lines: sections.map((section) => ({ section, questions: 2 })) };
const both = ['listening', 'reading'] as const;
const questionsOf = (plan: { items: Array<{ itemId: string }> }) => {
  const byId = poolItemIndex(pool);
  return plan.items.reduce((sum, planned) => sum + byId.get(planned.itemId)!.questions.length, 0);
};

test('a run is reproducible from its seed and never asks more than the recipe', () => {
  const a = planPoolTest(pool, recipe, both, {}, 'seed');
  assert.deepEqual(planPoolTest(pool, recipe, both, {}, 'seed'), a);
  assert.ok(questionsOf(a) <= sections.length * 2);
  assert.equal(new Set(a.items.map((item) => item.itemId)).size, a.items.length);
});

test('listening comes before reading, and one skill alone leaves the other out', () => {
  const parts = planPoolTest(pool, recipe, both, {}, 'order').items.map((item) => item.part);
  assert.deepEqual(parts, [...parts].sort((x, y) => (x === y ? 0 : x === 'listening' ? -1 : 1)));
  const listening = planPoolTest(pool, recipe, ['listening'], {}, 'order');
  assert.ok(listening.items.length > 0 && listening.items.every((item) => item.part === 'listening'));
  assert.deepEqual(listening.short, []);
});

test('questions seen before are held back while unseen ones remain', () => {
  const first = planPoolTest(pool, recipe, both, {}, 'first');
  const seen = Object.fromEntries(first.items.map((item) => [item.itemId, 1]));
  const second = planPoolTest(pool, recipe, both, seen, 'second');
  const repeats = second.items.filter((item) => seen[item.itemId]).length;
  assert.ok(repeats < second.items.length / 2, `${repeats} of ${second.items.length} repeated`);
});

test('a section the pool cannot fill is reported, and the test keeps its length from the same skill', () => {
  const hungry: MockRecipe = { key: 'hungry', band: 'A', lines: [{ section: 'A:listening:missing', questions: 5 }] };
  const plan = planPoolTest(pool, hungry, both, {}, 'x');
  assert.deepEqual(plan.short, [{ section: 'A:listening:missing', missing: 5 }]);
  assert.equal(questionsOf(plan), 5);
  assert.ok(plan.items.every((item) => item.part === 'listening'));
});

test('one test never shows two versions of the same slot, and mixes the band\'s levels', () => {
  const greedy: MockRecipe = { key: 'greedy', band: 'A', lines: sections.map((section) => ({ section, questions: 6 })) };
  const plan = planPoolTest(pool, greedy, both, {}, 'family');
  const byId = new Map(pool.map((entry) => [entry.item.id, entry]));
  const families = plan.items.map((item) => byId.get(item.itemId)!.family);
  assert.equal(new Set(families).size, families.length);
  const levels = new Set(plan.items.map((item) => byId.get(item.itemId)!.level));
  assert.deepEqual([...levels].sort(), [1, 2]);
});

test('the lesson test\'s screens and scorer run a pool plan as they run a lesson', () => {
  const plan = planPoolTest(pool, recipe, both, {}, 'score');
  const byId = poolItemIndex(pool);
  const total = questionsOf(plan);
  assert.equal(lessonTestScreens(byId, plan).reduce((sum, screen) => sum + screen.questionIds.length, 0), total);
  const allRight = Object.fromEntries(plan.items.flatMap((planned) => byId.get(planned.itemId)!.questions.map((q) => [q.id, q.key])));
  const score = scoreLessonTest(byId, plan, allRight);
  assert.deepEqual([score.correct, score.total, score.missed.length], [total, total, 0]);
  assert.equal(scoreLessonTest(byId, plan, {}).correct, 0);
});
