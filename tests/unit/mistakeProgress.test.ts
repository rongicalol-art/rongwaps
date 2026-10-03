import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCardSessionProgress } from '../../src/utils/mistakeQueue';

test('computeCardSessionProgress: standard deck without mistakes', () => {
  const canonicalCards = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
  const activeCards = [...canonicalCards];
  const missedCardIds = new Set<string>();

  const info0 = computeCardSessionProgress(0, 'c1', canonicalCards, activeCards, 'soon', missedCardIds);
  assert.equal(info0.displayIndex, 0);
  assert.equal(info0.totalCount, 3);
  assert.equal(info0.isRetry, false);
  assert.equal(info0.cleanupPhase, null);

  const info1 = computeCardSessionProgress(1, 'c2', canonicalCards, activeCards, 'soon', missedCardIds);
  assert.equal(info1.displayIndex, 1);
  assert.equal(info1.totalCount, 3);
  assert.equal(info1.isRetry, false);
  assert.equal(info1.cleanupPhase, null);
});

test('computeCardSessionProgress: repeat "soon" locks total and flags retry card', () => {
  const canonicalCards = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }];
  // c2 was missed and inserted after 3 cards
  const activeCards = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }, { id: 'c2' }];
  const missedCardIds = new Set<string>(['c2']);

  // Normal card c3
  const infoC3 = computeCardSessionProgress(2, 'c3', canonicalCards, activeCards, 'soon', missedCardIds);
  assert.equal(infoC3.displayIndex, 2);
  assert.equal(infoC3.totalCount, 4);
  assert.equal(infoC3.isRetry, false);
  assert.equal(infoC3.cleanupPhase, null);

  // Retry card c2 (at index 4)
  const infoRetry = computeCardSessionProgress(4, 'c2', canonicalCards, activeCards, 'soon', missedCardIds);
  // displayIndex reflects the canonical card index (c2 is index 1 in canonical cards)
  assert.equal(infoRetry.displayIndex, 1);
  // Total count remains locked to original 4, NOT 5!
  assert.equal(infoRetry.totalCount, 4);
  assert.equal(infoRetry.isRetry, true);
  assert.equal(infoRetry.cleanupPhase, null);
});

test('computeCardSessionProgress: repeat "end" switches to cleanup phase after main deck', () => {
  const canonicalCards = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
  // c1 and c3 were missed and appended at the end
  const activeCards = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c1' }, { id: 'c3' }];
  const missedCardIds = new Set<string>(['c1', 'c3']);

  // During main deck (c1 first time at index 0)
  const infoMain = computeCardSessionProgress(0, 'c1', canonicalCards, activeCards, 'end', new Set());
  assert.equal(infoMain.displayIndex, 0);
  assert.equal(infoMain.totalCount, 3);
  assert.equal(infoMain.isRetry, false);
  assert.equal(infoMain.cleanupPhase, null);

  // Cleanup card 1 (c1 at index 3)
  const infoCleanup1 = computeCardSessionProgress(3, 'c1', canonicalCards, activeCards, 'end', missedCardIds);
  assert.equal(infoCleanup1.displayIndex, 0);
  assert.equal(infoCleanup1.totalCount, 2);
  assert.equal(infoCleanup1.isRetry, true);
  assert.deepEqual(infoCleanup1.cleanupPhase, { currentIndex: 0, totalCount: 2 });

  // Cleanup card 2 (c3 at index 4)
  const infoCleanup2 = computeCardSessionProgress(4, 'c3', canonicalCards, activeCards, 'end', missedCardIds);
  assert.equal(infoCleanup2.displayIndex, 1);
  assert.equal(infoCleanup2.totalCount, 2);
  assert.equal(infoCleanup2.isRetry, true);
  assert.deepEqual(infoCleanup2.cleanupPhase, { currentIndex: 1, totalCount: 2 });
});

test('computeCardSessionProgress: empty cards handles cleanly', () => {
  const emptyInfo = computeCardSessionProgress(0, null, [], [], 'soon', new Set());
  assert.equal(emptyInfo.displayIndex, 0);
  assert.equal(emptyInfo.totalCount, 0);
  assert.equal(emptyInfo.isRetry, false);
  assert.equal(emptyInfo.cleanupPhase, null);
});

test('computeCardSessionProgress: shuffled deck preserves session progress index instead of canonical index', () => {
  const canonicalCards = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }, { id: 'c5' }];
  // Shuffled active cards where the 1st canonical card appears at index 3
  const activeCards = [{ id: 'c3' }, { id: 'c5' }, { id: 'c2' }, { id: 'c1' }, { id: 'c4' }];
  const missedCardIds = new Set<string>();

  // At currentIndex 3 (card c1, which is canonically at index 0)
  const infoShuffled = computeCardSessionProgress(3, 'c1', canonicalCards, activeCards, 'soon', missedCardIds, true);
  // displayIndex MUST stay 3 (4th item in session), NOT drop to 0!
  assert.equal(infoShuffled.displayIndex, 3);
  assert.equal(infoShuffled.totalCount, 5);
  assert.equal(infoShuffled.isRetry, false);
});

