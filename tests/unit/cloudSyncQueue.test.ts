import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyProgressResetEpoch,
  computeLearnedDelta,
  createSingleFlightSaveCoordinator,
  getNextAutoSaveDelay,
  getNextCloudSyncBackoff,
  isSameFolderList,
  mergePulledSrsData,
} from '../../src/utils/cloudSyncQueue';
import type { SRSData } from '../../src/utils/srsEngine';
import { computeSrsDelta } from '../../src/utils/cloudSyncTransforms';

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

test('pulled merge keeps a locally newer review over an older cloud row and re-pushes it', () => {
  const staleSynced = srs('c1', { efactor: 2.3, interval: 1, lastReviewedAt: 1_000 });
  const localNewer = srs('c1', { efactor: 2.6, interval: 4, lastReviewedAt: 5_000 });
  const cloudOlder = srs('c1', { efactor: 2.4, interval: 2, lastReviewedAt: 3_000 });
  const { merged, baseline } = mergePulledSrsData({
    priorBaseline: { c1: staleSynced },
    // Not changed during the pull window: only the review-time rule can keep it.
    atPullStart: { c1: localNewer },
    current: { c1: localNewer },
    cloud: { c1: cloudOlder },
  });

  assert.deepEqual(merged.c1, localNewer);
  assert.deepEqual(baseline.c1, cloudOlder);
  // The kept-local card differs from the baseline, so the next save uploads it.
  assert.deepEqual(Object.keys(computeSrsDelta(baseline, merged)), ['c1']);
});

test('pulled merge takes the cloud row when it is newer, equal or untimed', () => {
  const cases: Array<[string, number | undefined, number | undefined]> = [
    ['newer cloud', 1_000, 2_000],
    ['equal times', 2_000, 2_000],
    ['local without a review time', undefined, 2_000],
    ['neither has a review time', undefined, undefined],
  ];
  for (const [label, localTime, cloudTime] of cases) {
    const local = srs('c1', { efactor: 2.2, lastReviewedAt: localTime });
    const cloud = srs('c1', { efactor: 2.9, lastReviewedAt: cloudTime });
    const { merged } = mergePulledSrsData({
      priorBaseline: { c1: local },
      atPullStart: { c1: local },
      current: { c1: local },
      cloud: { c1: cloud },
    });
    assert.deepEqual(merged.c1, cloud, label);
  }
});

test('pulled merge decides per card, not per pull', () => {
  const { merged } = mergePulledSrsData({
    priorBaseline: {},
    atPullStart: {
      a: srs('a', { lastReviewedAt: 9_000 }),
      b: srs('b', { lastReviewedAt: 1_000 }),
    },
    current: {
      a: srs('a', { lastReviewedAt: 9_000 }),
      b: srs('b', { lastReviewedAt: 1_000 }),
    },
    cloud: {
      a: srs('a', { efactor: 2.1, lastReviewedAt: 2_000 }),
      b: srs('b', { efactor: 2.1, lastReviewedAt: 6_000 }),
    },
  });

  assert.equal(merged.a?.lastReviewedAt, 9_000);
  assert.equal(merged.b?.efactor, 2.1);
});

const RESET_AT = '2026-10-07T00:00:00.000Z';
const RESET_MS = new Date(RESET_AT).getTime();

test('reset epoch: no cloud reset leaves local progress alone', () => {
  const srsData = { c1: srs('c1', { lastReviewedAt: 1 }) };
  for (const cloudResetAt of [null, undefined, 'not a date']) {
    const result = applyProgressResetEpoch({
      srsData, learnedCards: ['c1'], cloudResetAt, seenResetAt: undefined,
    });
    assert.equal(result.wiped, false);
    assert.equal(result.srsData, srsData);
    assert.deepEqual(result.learnedCards, ['c1']);
  }
});

test('reset epoch: a reset newer than the one seen wipes pre-reset progress', () => {
  const result = applyProgressResetEpoch({
    srsData: {
      stale: srs('stale', { lastReviewedAt: RESET_MS - 1_000 }),
      legacy: srs('legacy'),
    },
    learnedCards: ['stale', 'legacy'],
    cloudResetAt: RESET_AT,
    seenResetAt: '2026-09-01T00:00:00.000Z',
  });

  assert.equal(result.wiped, true);
  assert.deepEqual(result.srsData, {});
  assert.deepEqual(result.learnedCards, []);
  assert.equal(result.seenResetAt, RESET_AT);
});

test('reset epoch: a device that never recorded an epoch is wiped too', () => {
  const result = applyProgressResetEpoch({
    srsData: { c1: srs('c1', { lastReviewedAt: RESET_MS - 1 }) },
    learnedCards: ['c1'],
    cloudResetAt: RESET_AT,
    seenResetAt: undefined,
  });
  assert.equal(result.wiped, true);
  assert.deepEqual(result.srsData, {});
});

test('reset epoch: the same or an older reset is a no-op (the resetting device)', () => {
  const srsData = { c1: srs('c1', { lastReviewedAt: RESET_MS + 5_000 }) };
  for (const seenResetAt of [RESET_AT, '2026-10-08T00:00:00.000Z']) {
    const result = applyProgressResetEpoch({
      srsData, learnedCards: ['c1'], cloudResetAt: RESET_AT, seenResetAt,
    });
    assert.equal(result.wiped, false);
    assert.equal(result.srsData, srsData);
    assert.equal(result.seenResetAt, seenResetAt);
  }
});

test('reset epoch: progress reviewed after the reset survives the wipe', () => {
  const fresh = srs('fresh', { lastReviewedAt: RESET_MS + 60_000 });
  const result = applyProgressResetEpoch({
    srsData: { fresh, stale: srs('stale', { lastReviewedAt: RESET_MS - 60_000 }) },
    learnedCards: ['fresh', 'stale', 'orphan'],
    cloudResetAt: RESET_AT,
    seenResetAt: undefined,
  });

  assert.deepEqual(result.srsData, { fresh });
  assert.deepEqual(result.learnedCards, ['fresh']);
});

test('unchanged-skip checks never skip after a null baseline or a real change', () => {
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

test('learned delta appends only new ids, preserving current order', () => {
  assert.deepEqual(
    computeLearnedDelta(['a', 'b'], ['a', 'b', 'c', 'd']),
    { appended: ['c', 'd'], shrank: false },
  );
});

test('learned delta flags a shrink (progress reset) for full replace', () => {
  assert.deepEqual(
    computeLearnedDelta(['a', 'b', 'c'], ['a']),
    { appended: [], shrank: true },
  );

  // Reset + new first passes in the same window: still a full replace.
  assert.deepEqual(
    computeLearnedDelta(['a', 'b'], ['c', 'd']),
    { appended: ['c', 'd'], shrank: true },
  );
});

test('learned delta treats a first-ever sync (null baseline) as full replace', () => {
  assert.deepEqual(
    computeLearnedDelta(null, ['a', 'b']),
    { appended: [], shrank: false },
  );
});

test('learned delta is empty when nothing changed', () => {
  assert.deepEqual(
    computeLearnedDelta(['a', 'b'], ['a', 'b']),
    { appended: [], shrank: false },
  );
});
