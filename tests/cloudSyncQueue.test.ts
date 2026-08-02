import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSingleFlightSaveCoordinator,
  getNextCloudSyncBackoff,
  getSessionProgressDelta,
  reconcileAggregateProgress,
} from '../src/utils/cloudSyncQueue';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test('concurrent save requests share one write for an unchanged snapshot', async () => {
  const firstWrite = deferred();
  const value = 1;
  const saved: number[] = [];
  const coordinator = createSingleFlightSaveCoordinator(
    () => ({ fingerprint: String(value), value }),
    async (snapshot) => {
      saved.push(snapshot);
      await firstWrite.promise;
    },
  );

  const requests = [
    coordinator.request(),
    coordinator.request(),
    coordinator.request(),
  ];
  assert.deepEqual(saved, [1]);

  firstWrite.resolve();
  await Promise.all(requests);
  assert.deepEqual(saved, [1]);

  await coordinator.request();
  assert.deepEqual(saved, [1]);
});

test('state changed during a save is drained in one serial follow-up write', async () => {
  const firstWrite = deferred();
  let value = 1;
  const saved: number[] = [];
  const coordinator = createSingleFlightSaveCoordinator(
    () => ({ fingerprint: String(value), value }),
    async (snapshot) => {
      saved.push(snapshot);
      if (snapshot === 1) await firstWrite.promise;
    },
  );

  const request = coordinator.request();
  value = 2;
  const coalescedRequest = coordinator.request();
  firstWrite.resolve();

  await Promise.all([request, coalescedRequest]);
  assert.deepEqual(saved, [1, 2]);
});

test('failed writes reject and remain eligible for retry', async () => {
  let attempts = 0;
  const coordinator = createSingleFlightSaveCoordinator(
    () => ({ fingerprint: 'same', value: 1 }),
    async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
    },
  );

  await assert.rejects(coordinator.request(), /offline/);
  await coordinator.request();
  assert.equal(attempts, 2);
});

test('session deltas include XP, reviews, and learned cards exactly once', () => {
  assert.deepEqual(
    getSessionProgressDelta(
      { xpEarned: 25, cardsReviewed: 4, cardsLearned: 2 },
      { xpEarned: 10, cardsReviewed: 1, cardsLearned: 1 },
    ),
    { xpEarned: 15, cardsReviewed: 3, cardsLearned: 1 },
  );

  assert.deepEqual(
    getSessionProgressDelta(
      { xpEarned: 5, cardsReviewed: 1, cardsLearned: 1 },
      { xpEarned: 25, cardsReviewed: 4, cardsLearned: 2 },
    ),
    { xpEarned: 5, cardsReviewed: 1, cardsLearned: 1 },
  );
});

test('aggregate reconciliation adds only activity after the saved snapshot', () => {
  assert.deepEqual(
    reconcileAggregateProgress(
      { totalXp: 125, totalCardsReviewed: 14, totalCardsLearned: 7 },
      { totalXp: 130, totalCardsReviewed: 15, totalCardsLearned: 7 },
      { xpEarned: 25, cardsReviewed: 4, cardsLearned: 2 },
      { xpEarned: 30, cardsReviewed: 5, cardsLearned: 2 },
    ),
    { totalXp: 130, totalCardsReviewed: 15, totalCardsLearned: 7 },
  );
});

test('backoff grows and rate limits start with a longer delay', () => {
  assert.equal(getNextCloudSyncBackoff(0, new Error('offline')), 5_000);
  assert.equal(getNextCloudSyncBackoff(5_000, new Error('offline')), 10_000);
  assert.equal(getNextCloudSyncBackoff(0, { status: 429 }), 15_000);
  assert.equal(getNextCloudSyncBackoff(40_000, new Error('offline')), 60_000);
});
