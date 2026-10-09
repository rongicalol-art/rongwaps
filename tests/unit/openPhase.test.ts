import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLD_MS, MIN_LOADER_MS, derivePhase, nextStageDelay } from '../../src/utils/browser/openPhase';

test('ready at mount or inside the hold window never shows a loader', () => {
  assert.equal(derivePhase(true, 'hold'), 'ready');
  assert.equal(nextStageDelay(true, 'hold', 0, 10), null);
});

test('not ready holds, then the loader appears after HOLD_MS', () => {
  assert.equal(derivePhase(false, 'hold'), 'hold');
  assert.equal(nextStageDelay(false, 'hold', 0, 40), HOLD_MS - 40);
  assert.equal(nextStageDelay(false, 'hold', 0, 999), 0);
  assert.equal(derivePhase(false, 'loader'), 'loading');
});

test('a shown loader stays for MIN_LOADER_MS even when ready early', () => {
  assert.equal(derivePhase(true, 'loader'), 'loading');
  assert.equal(nextStageDelay(true, 'loader', 50, 300), MIN_LOADER_MS - 50);
  assert.equal(nextStageDelay(true, 'loader', MIN_LOADER_MS + 10, 900), 0);
  assert.equal(derivePhase(true, 'served'), 'ready');
});

test('a shown loader waits indefinitely while not ready', () => {
  assert.equal(nextStageDelay(false, 'loader', 800, 1000), null);
  assert.equal(derivePhase(false, 'served'), 'loading');
});
