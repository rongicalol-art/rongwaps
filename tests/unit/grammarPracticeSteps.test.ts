import assert from 'node:assert/strict';
import test from 'node:test';
import { practiceStepsReducer as step, startSteps, stepAt, type PracticeStepAction, type PracticeSteps } from '../../src/features/grammar-practice/practiceSteps';

const run = (state: PracticeSteps, ...actions: PracticeStepAction[]) => actions.reduce(step, state);
const right = { correct: true, title: 'Correct' };
const wrong = { correct: false, note: 'Check the order.' };

test('Back does nothing on the first item', () => {
  const start = startSteps();
  assert.equal(run(start, { type: 'back' }), start);
});

test('Back after an answer shows the previous item as answered, locked', () => {
  const state = run(startSteps(), { type: 'ready', index: 0, ready: true }, { type: 'check' }, { type: 'result', index: 0, result: right }, { type: 'forward' });
  assert.equal(state.index, 1);
  const back = step(state, { type: 'back' });
  assert.equal(back.index, 0);
  assert.equal(stepAt(back).status, 'correct');
  assert.deepEqual(stepAt(back).result, right);
  // A second result for an answered item never re-scores it.
  assert.equal(stepAt(step(back, { type: 'result', index: 0, result: wrong })).status, 'correct');
  // Nor can it be checked or retried again.
  assert.equal(step(back, { type: 'check' }), back);
  assert.equal(step(back, { type: 'retry' }), back);
});

test('Back after a skip returns to the skipped item as left, still answerable', () => {
  const state = run(startSteps(), { type: 'ready', index: 0, ready: true }, { type: 'forward' }, { type: 'back' });
  assert.equal(state.index, 0);
  assert.equal(stepAt(state).status, 'idle');
  assert.equal(stepAt(state).ready, true);
  assert.equal(stepAt(run(state, { type: 'check' }, { type: 'result', index: 0, result: right })).status, 'correct');
});

test('forward and back keep every item and its place in the visited list', () => {
  const state = run(startSteps(), { type: 'forward' }, { type: 'forward' }, { type: 'back' }, { type: 'back' }, { type: 'forward' });
  assert.equal(state.index, 1);
  assert.deepEqual(state.visited, [0, 1, 2]);
});

test('a wrong answer stays wrong across Back and forward until Try again', () => {
  const state = run(startSteps(), { type: 'ready', index: 0, ready: true }, { type: 'check' }, { type: 'result', index: 0, result: wrong }, { type: 'forward' }, { type: 'back' });
  assert.equal(stepAt(state).status, 'wrong');
  const retried = step(state, { type: 'retry' });
  assert.equal(stepAt(retried).status, 'idle');
  assert.equal(stepAt(retried).retryKey, 1);
});

test('no moving while a check is in flight', () => {
  const checking = run(startSteps(), { type: 'forward' }, { type: 'ready', index: 1, ready: true }, { type: 'check' });
  assert.equal(stepAt(checking).checking, true);
  assert.equal(step(checking, { type: 'back' }), checking);
  assert.equal(step(checking, { type: 'forward' }), checking);
});

test('starting mid-exercise (UI Previews) can still step back to earlier items', () => {
  const state = step(startSteps(3), { type: 'back' });
  assert.equal(state.index, 2);
  assert.deepEqual(state.visited, [3, 2]);
});
