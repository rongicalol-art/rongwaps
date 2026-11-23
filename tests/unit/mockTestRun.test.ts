import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { LessonTestLesson } from '../../src/types/lessonTest';
import { lessonTestScreens } from '../../src/utils/lesson/lessonTestPlan';
import { chanceRight } from '../../src/utils/mockTest/adaptive';
import { abilityToScale } from '../../src/utils/mockTest/adaptiveScale';
import { extendAdaptivePlan, poolCeiling, poolEntryIndex, scoreMockTest, startMockPlan, type MockConfig } from '../../src/utils/mockTest/mockRun';
import { poolItemIndex } from '../../src/utils/mockTest/pool';
import { lessonPoolEntries } from '../../src/utils/mockTest/poolLabels';
import { RECIPE_BANDS, bandOpen, mockRecipe, recipeQuestions } from '../../src/utils/mockTest/recipes';
import { createQuizRng } from '../../src/utils/vocabulary/quizDirector';

/** Whole mock tests on the real pool (every authored lesson test): fixed papers and the adaptive test. */

const pool = readdirSync('content/lesson-tests')
  .filter((name) => name.startsWith('book-'))
  .flatMap((book) => readdirSync(`content/lesson-tests/${book}`).map((file) => readJson<LessonTestLesson>(`content/lesson-tests/${book}/${file}`)))
  .flatMap(lessonPoolEntries);
const byId = poolEntryIndex(pool);
const items = poolItemIndex(pool);
const both = ['listening', 'reading'] as const;
const questions = (plan: { items: Array<{ itemId: string; part: string }> }, part?: string) => plan.items
  .filter((planned) => !part || planned.part === part)
  .reduce((sum, planned) => sum + byId.get(planned.itemId)!.item.questions.length, 0);
const allRight = (plan: { items: Array<{ itemId: string }> }) => Object.fromEntries(plan.items.flatMap((planned) => byId.get(planned.itemId)!.item.questions.map((q) => [q.id, q.key])));

test('every recipe adds up to the official length, and Quick to a fifth of it', () => {
  for (const band of RECIPE_BANDS) {
    for (const part of both) {
      assert.equal(recipeQuestions(mockRecipe(band, 'full'), part), 50, `${band} ${part}`);
      assert.equal(recipeQuestions(mockRecipe(band, 'quick'), part), 10, `${band} ${part}`);
    }
  }
});

test('the bands with questions are open, and their papers come out at full length', () => {
  assert.deepEqual(RECIPE_BANDS.filter((band) => bandOpen(pool, band)), ['A', 'B']);
  for (const band of ['A', 'B'] as const) {
    for (const length of ['quick', 'full'] as const) {
      const config: MockConfig = { kind: band, parts: [...both], length };
      const plan = startMockPlan(pool, config, {}, `${band}-${length}`);
      const size = length === 'full' ? 50 : 10;
      assert.deepEqual([questions(plan, 'listening'), questions(plan, 'reading')], [size, size], `${band} ${length}`);
      assert.ok(plan.items.every((planned) => byId.get(planned.itemId)!.band === band));
      const families = plan.items.map((planned) => byId.get(planned.itemId)!.family);
      assert.equal(new Set(families).size, families.length);
      assert.equal(lessonTestScreens(items, plan).reduce((sum, screen) => sum + screen.questionIds.length, 0), size * 2);
    }
  }
});

test('a band paper scores out of 80 with its level; one skill alone uses that skill\'s pass score', () => {
  const config: MockConfig = { kind: 'A', parts: [...both], length: 'full' };
  const plan = startMockPlan(pool, config, {}, 'score');
  const perfect = scoreMockTest(pool, config, plan, allRight(plan));
  assert.deepEqual([perfect.scale, perfect.skills.listening?.score, perfect.skills.reading?.score, perfect.level, perfect.atCeiling], [80, 80, 80, 2, false]);
  const blank = scoreMockTest(pool, config, plan, {});
  assert.deepEqual([blank.skills.listening?.score, blank.level, blank.floor], [0, null, 1]);
  const listening: MockConfig = { kind: 'A', parts: ['listening'], length: 'quick' };
  const one = scoreMockTest(pool, listening, startMockPlan(pool, listening, {}, 'one'), {});
  assert.deepEqual(Object.keys(one.skills), ['listening']);
});

test('a level the pool has no questions for is given as "this or above"', () => {
  assert.equal(poolCeiling(pool, both, 'B'), 3);
  const config: MockConfig = { kind: 'B', parts: [...both], length: 'full' };
  const plan = startMockPlan(pool, config, {}, 'ceiling');
  const perfect = scoreMockTest(pool, config, plan, allRight(plan));
  assert.deepEqual([perfect.level, perfect.atCeiling], [3, true]);
});

/** Sits the adaptive test as a learner of a known ability. */
function sit(config: MockConfig, truth: number, seed: string, startAbility?: number) {
  const rng = createQuizRng(seed);
  const answers: Record<string, number> = {};
  let plan = startMockPlan(pool, config, {}, seed, startAbility);
  for (let guard = 0; guard < 200; guard += 1) {
    for (const planned of plan.items) {
      const entry = byId.get(planned.itemId)!;
      for (const question of entry.item.questions) {
        if (question.id in answers) continue;
        answers[question.id] = rng() < chanceRight(truth, entry.difficulty) ? question.key : (question.key + 1) % 3;
      }
    }
    const step = extendAdaptivePlan(pool, config, plan, answers, {}, startAbility);
    plan = step.plan;
    if (step.done) break;
  }
  return { plan, result: scoreMockTest(pool, config, plan, answers, startAbility) };
}

test('the adaptive test asks each skill up to its limit, listening first, with no repeats', () => {
  const full: MockConfig = { kind: 'adaptive', parts: [...both], length: 'full' };
  const { plan } = sit(full, -2.5, 'limits');
  for (const part of both) {
    const asked = questions(plan, part);
    assert.ok(asked >= 22 && asked <= 35 + 5, `${part}: ${asked}`);
  }
  const parts = plan.items.map((planned) => planned.part);
  assert.deepEqual(parts, [...parts].sort((a, b) => (a === b ? 0 : a === 'listening' ? -1 : 1)));
  const families = plan.items.map((planned) => byId.get(planned.itemId)!.family);
  assert.equal(new Set(families).size, families.length);
  const quick: MockConfig = { kind: 'adaptive', parts: ['reading'], length: 'quick' };
  const short = sit(quick, -2.5, 'quick').plan;
  assert.ok(questions(short) >= 12 && questions(short) <= 12 + 5);
  assert.ok(short.items.every((planned) => planned.part === 'reading'));
});

test('the adaptive test finds learners across the pool\'s range', () => {
  const config: MockConfig = { kind: 'adaptive', parts: [...both], length: 'full' };
  for (const truth of [-5.5, -4, -2.5, -1]) {
    const scores: number[] = [];
    for (let run = 0; run < 6; run += 1) {
      const { result } = sit(config, truth, `truth:${truth}:${run}`);
      scores.push(result.skills.listening!.score, result.skills.reading!.score);
    }
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    assert.ok(Math.abs(mean - abilityToScale(truth)) <= 30, `true ${abilityToScale(truth)}, mean ${mean.toFixed(0)}`);
  }
});

test('a learner above the pool\'s hardest questions gets its top level, marked as "or above"', () => {
  const config: MockConfig = { kind: 'adaptive', parts: [...both], length: 'full' };
  const { result } = sit(config, 3, 'strong');
  assert.deepEqual([result.level, result.atCeiling, result.scale, result.floor], [poolCeiling(pool, both), true, 700, 0.5]);
});

test('a start near the learner\'s level changes the first question, not the result much', () => {
  const config: MockConfig = { kind: 'adaptive', parts: ['listening'], length: 'quick' };
  const official = startMockPlan(pool, config, {}, 'start');
  const low = startMockPlan(pool, config, {}, 'start', -5);
  assert.ok(byId.get(low.items[0].itemId)!.difficulty < byId.get(official.items[0].itemId)!.difficulty - 2);
});
