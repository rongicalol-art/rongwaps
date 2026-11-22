import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptiveTestDone,
  chanceRight,
  estimateAbility,
  pickAdaptiveNext,
  type AdaptiveAnswer,
  type AdaptiveCandidate,
  type AdaptiveSettings,
} from '../../src/utils/mockTest/adaptive';
import { createQuizRng } from '../../src/utils/vocabulary/quizDirector';

/** The adaptive test's maths: the ability estimate, the next question and when to stop. */

const settings: AdaptiveSettings = { priorMean: 0.3, priorSd: 2, maxQuestions: 35, minQuestions: 22, stopError: 0.35, shortlist: 4 };

test('a question at the learner\'s own level is a coin toss, easier ones are likelier', () => {
  assert.equal(chanceRight(1, 1), 0.5);
  assert.ok(chanceRight(1, 0) > 0.7 && chanceRight(1, 2) < 0.3);
});

test('with no answers the estimate is the starting point', () => {
  const start = estimateAbility([], settings);
  assert.ok(Math.abs(start.ability - 0.3) < 0.01);
  assert.ok(Math.abs(start.error - 2) < 0.05);
});

test('right answers raise the estimate, wrong ones lower it, and both stay finite', () => {
  const right = estimateAbility(Array.from({ length: 10 }, () => ({ difficulty: 0, correct: true })), settings);
  const wrong = estimateAbility(Array.from({ length: 10 }, () => ({ difficulty: 0, correct: false })), settings);
  assert.ok(right.ability > 1.5 && right.ability < 8);
  assert.ok(wrong.ability < -1.5 && wrong.ability > -8);
});

test('a right answer on a hard question counts for more than on an easy one', () => {
  const hard = estimateAbility([{ difficulty: 2, correct: true }], settings).ability;
  const easy = estimateAbility([{ difficulty: -2, correct: true }], settings).ability;
  assert.ok(hard > easy);
});

test('early answers move the estimate more than late ones, and the error shrinks', () => {
  const answers: AdaptiveAnswer[] = [];
  const steps: number[] = [];
  const errors: number[] = [];
  let before = estimateAbility(answers, settings);
  for (let i = 0; i < 30; i += 1) {
    answers.push({ difficulty: before.ability, correct: i % 2 === 0 });
    const after = estimateAbility(answers, settings);
    steps.push(Math.abs(after.ability - before.ability));
    errors.push(after.error);
    before = after;
  }
  assert.ok(steps[0] > steps[29] * 3);
  assert.ok(errors[29] < errors[0] && errors[29] < 0.6);
});

test('a simulated learner is found: the test lands near the true ability and stops in time', () => {
  for (const truth of [-2, 0, 1.5, 3]) {
    const rng = createQuizRng(`learner:${truth}`);
    const pool: AdaptiveCandidate[] = Array.from({ length: 400 }, (_, index) => ({ id: `q${index}`, difficulty: -5 + index * 0.025, questions: 1 }));
    const used = new Set<string>();
    const answers: AdaptiveAnswer[] = [];
    let estimate = estimateAbility(answers, settings);
    while (!adaptiveTestDone(answers.length, estimate.error, settings)) {
      const next = pickAdaptiveNext(pool, used, estimate.ability, settings, rng)!;
      used.add(next.id);
      answers.push({ difficulty: next.difficulty, correct: rng() < chanceRight(truth, next.difficulty) });
      estimate = estimateAbility(answers, settings);
    }
    assert.ok(answers.length >= 22 && answers.length <= 35);
    assert.ok(Math.abs(estimate.ability - truth) < 1, `true ${truth}, estimated ${estimate.ability.toFixed(2)}`);
  }
});

test('the next question is close to the ability, never repeats, and holds back seen ones', () => {
  const pool: AdaptiveCandidate[] = [
    { id: 'far', difficulty: 3, questions: 1 },
    { id: 'near-seen', difficulty: 0.1, questions: 1, seen: 2 },
    { id: 'near', difficulty: 0.4, questions: 1 },
    { id: 'used', difficulty: 0, questions: 1 },
  ];
  const rng = createQuizRng('pick');
  assert.equal(pickAdaptiveNext(pool, new Set(['used']), 0, { shortlist: 1 }, rng)?.id, 'near');
  assert.equal(pickAdaptiveNext(pool, new Set(pool.map((item) => item.id)), 0, { shortlist: 1 }, rng), null);
  const picks = new Set(Array.from({ length: 40 }, () => pickAdaptiveNext(pool, new Set(['used']), 0, { shortlist: 2 }, rng)!.id));
  assert.deepEqual([...picks].sort(), ['near', 'near-seen']);
});

test('the test stops at the limit, or early once the estimate is sure', () => {
  assert.equal(adaptiveTestDone(35, 0.9, settings), true);
  assert.equal(adaptiveTestDone(22, 0.35, settings), true);
  assert.equal(adaptiveTestDone(21, 0.2, settings), false);
  assert.equal(adaptiveTestDone(30, 0.5, settings), false);
});
