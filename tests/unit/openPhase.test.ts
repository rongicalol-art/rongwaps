import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLD_MS, derivePhase, nextStageDelay } from '../../src/utils/browser/openPhase';

test('ready at mount or inside the hold window never shows a loader', () => {
  assert.equal(derivePhase(true, 'hold'), 'ready');
  assert.equal(nextStageDelay(true, 'hold', 10), null);
});

test('not ready holds, then the loader appears after HOLD_MS', () => {
  assert.equal(derivePhase(false, 'hold'), 'hold');
  assert.equal(nextStageDelay(false, 'hold', 40), HOLD_MS - 40);
  assert.equal(nextStageDelay(false, 'hold', 999), 0);
  assert.equal(derivePhase(false, 'loader'), 'loading');
});

test('ready content replaces a shown loader immediately, without another timer', () => {
  assert.equal(derivePhase(true, 'loader'), 'ready');
  assert.equal(nextStageDelay(true, 'loader', HOLD_MS + 1), null);
});

test('a shown loader waits indefinitely while not ready', () => {
  assert.equal(nextStageDelay(false, 'loader', 1000), null);
  assert.equal(derivePhase(false, 'loader'), 'loading');
});
