import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSingleFlightSaveCoordinator,
  getNextAutoSaveDelay,
  getNextCloudSyncBackoff,
  getSessionProgressDelta,
  isSameFolderList,
  isSameStringArray,
  mergePulledSrsData,
  planFolderSync,
  pruneAcknowledgedTombstones,
  reconcileAggregateProgress,
} from '../src/utils/cloudSyncQueue';
import type { SRSData } from '../src/utils/srsEngine';

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

function srs(cardId: string, overrides: Partial<SRSData> = {}): SRSData {
  return { cardId, interval: 1, repetition: 1, efactor: 2.5, nextReviewDate: 1000, ...overrides };
}

test('auto-save delay follows the debounce while changes are fresh', () => {
  assert.equal(getNextAutoSaveDelay({ dirtySinceMs: null, nowMs: 50_000 }), 10_000);
  assert.equal(getNextAutoSaveDelay({ dirtySinceMs: 50_000, nowMs: 52_000 }), 10_000);
});

test('auto-save delay fires at the max-wait deadline under continuous activity', () => {
  // 30s of unsaved change: a fresh debounce would still fire before the
  // 45s deadline, so the full window is correct.
  assert.equal(
    getNextAutoSaveDelay({ dirtySinceMs: 0, nowMs: 30_000 }),
    10_000,
  );
  // 40s of unsaved change -> only the remaining 5s to the deadline.
  assert.equal(
    getNextAutoSaveDelay({ dirtySinceMs: 0, nowMs: 40_000 }),
    5_000,
  );
  // Past the deadline -> fire almost immediately instead of never.
  assert.ok(
    getNextAutoSaveDelay({ dirtySinceMs: 0, nowMs: 120_000 }) <= 250,
  );
});

test('auto-save delay respects error backoff over the max-wait deadline', () => {
  assert.equal(
    getNextAutoSaveDelay({ dirtySinceMs: 0, nowMs: 120_000, backoffMs: 30_000 }),
    30_000,
  );
  assert.equal(
    getNextAutoSaveDelay({ dirtySinceMs: null, nowMs: 120_000, backoffMs: 30_000 }),
    40_000,
  );
});

const PULL_MERGE_CASES = {
  syncedCard: srs('b1l1-1', { efactor: 2.5, nextReviewDate: 1000 }),
  reviewedDuringPull: srs('b1l1-2', { efactor: 2.6, nextReviewDate: 2000 }),
  staleCloudVersion: srs('b1l1-2', { efactor: 2.3, nextReviewDate: 1500 }),
  untouchedServerCard: srs('b2l1-9', { efactor: 2.8, nextReviewDate: 3000 }),
};

test('pulled merge keeps in-flight reviews and leaves them dirty for upload', () => {
  const { merged, baseline } = mergePulledSrsData({
    priorBaseline: { 'b1l1-1': PULL_MERGE_CASES.syncedCard },
    atPullStart: {
      'b1l1-1': PULL_MERGE_CASES.syncedCard,
      'b1l1-2': PULL_MERGE_CASES.staleCloudVersion,
    },
    current: {
      'b1l1-1': PULL_MERGE_CASES.syncedCard,
      'b1l1-2': PULL_MERGE_CASES.reviewedDuringPull,
    },
    cloud: { 'b1l1-2': PULL_MERGE_CASES.staleCloudVersion },
  });

  // The stale server row must not clobber the just-made review...
  assert.deepEqual(merged['b1l1-2'], PULL_MERGE_CASES.reviewedDuringPull);
  // ...and the baseline must keep the SERVER value so the review stays dirty
  // and is uploaded by the next save (the old code baselined the local value
  // here, silently dropping it forever).
  assert.deepEqual(baseline['b1l1-2'], PULL_MERGE_CASES.staleCloudVersion);
});

test('pulled merge lets the server win for keys unchanged during the pull', () => {
  const updated = srs('b1l1-1', { efactor: 2.4, nextReviewDate: 5000 });
  const { merged, baseline } = mergePulledSrsData({
    priorBaseline: { 'b1l1-1': PULL_MERGE_CASES.syncedCard },
    atPullStart: { 'b1l1-1': PULL_MERGE_CASES.syncedCard },
    current: { 'b1l1-1': PULL_MERGE_CASES.syncedCard },
    cloud: { 'b1l1-1': updated },
  });

  assert.deepEqual(merged['b1l1-1'], updated);
  assert.deepEqual(baseline['b1l1-1'], updated);
});

test('pulled merge uploads brand-new local cards made during the pull', () => {
  const freshCard = srs('b3l1-4');
  const { merged, baseline } = mergePulledSrsData({
    priorBaseline: {},
    atPullStart: {},
    current: { 'b3l1-4': freshCard },
    cloud: {},
  });

  assert.deepEqual(merged['b3l1-4'], freshCard);
  // Never synced -> absent from the baseline -> picked up by the next delta.
  assert.equal(baseline['b3l1-4'], undefined);
});

test('pulled merge preserves prior baseline rows an incremental pull omitted', () => {
  const { baseline } = mergePulledSrsData({
    priorBaseline: {
      'b1l1-1': PULL_MERGE_CASES.syncedCard,
      'b2l1-9': PULL_MERGE_CASES.untouchedServerCard,
    },
    atPullStart: { 'b1l1-1': PULL_MERGE_CASES.syncedCard },
    current: { 'b1l1-1': PULL_MERGE_CASES.syncedCard },
    // Incremental pull only returned one row.
    cloud: { 'b1l1-1': srs('b1l1-1', { nextReviewDate: 9000 }) },
  });

  assert.equal(baseline['b2l1-9'], PULL_MERGE_CASES.untouchedServerCard);
  assert.equal(baseline['b1l1-1']?.nextReviewDate, 9000);
});

test('unchanged-skip checks never skip after a null baseline or a real change', () => {
  // Null = "never synced": must always write.
  assert.equal(isSameStringArray(null, []), false);
  assert.equal(isSameStringArray(null, ['a']), false);

  assert.equal(isSameStringArray(['a', 'b'], ['a', 'b']), true);
  assert.equal(isSameStringArray([], []), true);
  assert.equal(isSameStringArray(['a', 'b'], ['b', 'a']), false); // order changed
  assert.equal(isSameStringArray(['a'], ['a', 'a']), false);

  const folder = { id: 'f1', name: 'Words', color: '#fff' };
  assert.equal(
    isSameFolderList(null, []),
    false,
  );
  assert.equal(isSameFolderList([folder], [folder]), true);
  assert.equal(
    isSameFolderList([folder], [{ ...folder, name: 'Renamed' }]),
    false,
  );
  assert.equal(
    isSameFolderList([folder], [{ ...folder, color: '#000' }]),
    false,
  );
  assert.equal(isSameFolderList([], [folder]), false);
});

test('folder sync plan never upserts tombstoned folders and deletes them remotely', () => {
  const local = [
    { id: 'f1', name: 'Verbs', color: '#fff' },
    { id: 'f2', name: 'Food', color: '#000' },
  ];
  // f1 was deleted locally (tombstoned) but a stale remote row still exists;
  // f3 exists only on the server (deleted from the local list).
  const plan = planFolderSync(local, ['f1'], ['f1', 'f3']);

  assert.deepEqual(plan.toUpsert, [local[1]]);
  assert.deepEqual(plan.toDelete, ['f1', 'f3']);
});

test('folder sync plan keeps remote ids that still exist locally', () => {
  const local = [{ id: 'f1', name: 'Verbs', color: '#fff' }];
  const plan = planFolderSync(local, [], ['f1']);

  assert.deepEqual(plan.toDelete, []);
  assert.deepEqual(plan.toUpsert, local);
});

test('folder sync plan uploads new local folders and is empty for a clean sync', () => {
  const local = [{ id: 'f1', name: 'Verbs', color: '#fff' }];
  assert.deepEqual(planFolderSync(local, [], []).toUpsert, local);

  const clean = planFolderSync(local, [], ['f1']);
  assert.deepEqual(clean.toUpsert, local);
  assert.deepEqual(clean.toDelete, []);
});

test('tombstone pruning keeps only ids still present on the server', () => {
  assert.deepEqual(pruneAcknowledgedTombstones(['f1', 'f2', 'f3'], ['f1']), ['f1']);
  assert.deepEqual(pruneAcknowledgedTombstones(['f1'], []), []);
  assert.deepEqual(pruneAcknowledgedTombstones([], ['f1']), []);
});
