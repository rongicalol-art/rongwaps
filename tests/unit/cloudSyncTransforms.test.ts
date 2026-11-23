import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeSrsDelta,
  buildMetadataPayload,
  hasMetadataChanged,
} from '../../src/utils/sync/cloudSyncTransforms';
import type { SRSData } from '../../src/utils/srs/srsEngine';
import { mergeGrammarProgress } from '../../src/utils/sync/cloudMetadata';

const baseCard: SRSData = {
  cardId: 'card1',
  interval: 1,
  efactor: 2.5,
  repetition: 1,
  nextReviewDate: 1727400000000,
  learningStep: undefined,
};

test('cloudSyncTransforms: computeSrsDelta returns all cards on first sync (null baseline)', () => {
  const current = {
    card1: { ...baseCard },
    card2: { ...baseCard, interval: 2 },
  };

  const delta = computeSrsDelta(null, current);
  assert.deepEqual(delta, current);
});

test('cloudSyncTransforms: computeSrsDelta returns only modified and new cards', () => {
  const previous = {
    card1: { ...baseCard },
    card2: { ...baseCard, interval: 2 },
  };
  const current = {
    card1: { ...baseCard }, // unchanged
    card2: { ...baseCard, interval: 3 }, // changed
    card3: { ...baseCard }, // newly added
  };

  const delta = computeSrsDelta(previous, current);
  assert.deepEqual(Object.keys(delta).sort(), ['card2', 'card3']);
  assert.equal(delta.card2.interval, 3);
});

test('cloudSyncTransforms: buildMetadataPayload and hasMetadataChanged', () => {
  const storeState = {
    favorites: ['word1'],
    activeBookId: 1,
    characterPreference: 'traditional' as const,
    selectedLessonParts: { '1:1': [1] },
    selectedBooks: [1],
    startedPartIds: [] as string[], completedPageIds: [] as string[], completedPartIds: [] as string[],
  };

  const payload = buildMetadataPayload(storeState);
  assert.deepEqual(payload.favorites, ['word1']);
  assert.deepEqual(payload.selectedLessons, [1]);
  // Device-local UI state is not part of the synced payload.
  assert.equal('activeTab' in payload, false);
  assert.equal('sessionProgressIndex' in payload, false);

  // Keys left in older rows (device-local ones) never read as a change.
  const syncedSettings = {
    activeTab: 'library',
    sessionProgressIndex: { 'b1:l2': 1 },
    favorites: ['word1'],
    activeBookId: 1,
    characterPreference: 'traditional',
    selectedLessons: [1],
    selectedBooks: [1],
    grammarProgress: { startedPartIds: [], completedPageIds: [], completedPartIds: [], readReadingIds: [], lessonDoneMarks: {} },
  };

  assert.equal(hasMetadataChanged(syncedSettings, payload), false);
  assert.equal(hasMetadataChanged({ ...syncedSettings, activeBookId: 2 }, payload), true);
  assert.equal(hasMetadataChanged({ ...syncedSettings, favorites: undefined }, payload), true);
  assert.equal(hasMetadataChanged(null, payload), true);
});

test('profile-only changes are included in synced metadata', () => {
  const source = { favorites: [], activeBookId: 1, characterPreference: 'traditional' as const, selectedLessonParts: {}, selectedBooks: [], startedPartIds: [] as string[], completedPageIds: [] as string[], completedPartIds: [] as string[] };
  const defaults = buildMetadataPayload(source);
  const changed = buildMetadataPayload({ ...source, displayName: 'Ron', avatarColor: 'plum', coverPreset: 'jade', avatarPath: 'uid/avatar.webp', coverPath: 'uid/cover.webp' });
  assert.equal(changed.displayName, 'Ron');
  assert.equal(changed.coverPreset, 'jade');
  assert.equal(changed.avatarColor, 'plum');
  assert.equal(changed.avatarPath, 'uid/avatar.webp');
  assert.equal(changed.coverPath, 'uid/cover.webp');
  assert.equal(hasMetadataChanged(defaults, changed), true);
  assert.equal(hasMetadataChanged(changed, changed), false);
});

test('grammar completion syncs in settings and merges as a union', () => {
  const source = {
    favorites: [], activeBookId: 1, characterPreference: 'traditional' as const, selectedLessonParts: {}, selectedBooks: [],
    startedPartIds: ['p1'], completedPageIds: ['page-a'], completedPartIds: [] as string[],
  };
  const payload = buildMetadataPayload(source);
  assert.deepEqual(payload.grammarProgress, { startedPartIds: ['p1'], completedPageIds: ['page-a'], completedPartIds: [], readReadingIds: [], lessonDoneMarks: {} });
  // A row saved before grammar synced counts as a change, so the device uploads it.
  assert.equal(hasMetadataChanged({ ...payload, grammarProgress: undefined }, payload), true);
  assert.equal(hasMetadataChanged({ ...payload, grammarProgress: { ...payload.grammarProgress, completedPageIds: ['page-b'] } }, payload), true);

  const cloud = { grammarProgress: { startedPartIds: ['p1', 'p2'], completedPageIds: ['page-b', 'page-a', 'page-b'], completedPartIds: 'bad' } };
  assert.deepEqual(mergeGrammarProgress(cloud, source), { startedPartIds: ['p1', 'p2'], completedPageIds: ['page-a', 'page-b'] });
  // Nothing new in the cloud (or no grammar key at all) leaves local untouched.
  assert.deepEqual(mergeGrammarProgress({ grammarProgress: { completedPageIds: ['page-a'] } }, source), {});
  assert.deepEqual(mergeGrammarProgress({}, source), {});
});

test('lesson test scores sync: better best score, newer last run, most-seen versions; bad cloud rows are ignored', async () => {
  const { mergeLessonTests } = await import('../../src/store/slices/lessonTestSlice');
  const record = (best: number, at: string, seen: Record<string, number> = {}) => ({
    best, total: 20, bestAt: at, last: { correct: best, total: 20, at, listening: [5, 10] as [number, number], reading: [5, 10] as [number, number] },
    missedLessons: [], seen,
  });
  const local = { b1l01: record(15, '2026-11-01T00:00:00.000Z', { v1: 2 }), b1l02: record(10, '2026-11-02T00:00:00.000Z') };
  const cloud = {
    b1l01: { ...record(18, '2026-10-01T00:00:00.000Z', { v1: 1, v2: 3 }) },   // better score, older run
    b1l02: record(9, '2026-11-03T00:00:00.000Z'),                              // worse score, newer run
    b1l03: record(12, '2026-11-04T00:00:00.000Z'),                             // taken only on the other device
    b1l04: { best: 99, total: 0 }, b1l05: 'nonsense',
  };
  const merged = mergeLessonTests(local, cloud).lessonTests!;
  assert.equal(merged.b1l01.best, 18);
  assert.equal(merged.b1l01.last.at, '2026-11-01T00:00:00.000Z');
  assert.deepEqual(merged.b1l01.seen, { v1: 2, v2: 3 });
  assert.equal(merged.b1l02.best, 10);
  assert.equal(merged.b1l02.last.correct, 9);
  assert.equal(merged.b1l03.best, 12);
  assert.deepEqual(Object.keys(merged).sort(), ['b1l01', 'b1l02', 'b1l03']);
  assert.deepEqual(mergeLessonTests(merged, cloud), {}, 'merging the same cloud copy again changes nothing');
  assert.deepEqual(mergeLessonTests(local, null), {});

  // Per-part bests merge by best ratio, and a real full test always beats a partsOnly record.
  const partsOnlyLocal = {
    b1l09: {
      best: 0, total: 20, bestAt: '2026-11-05T00:00:00.000Z', partsOnly: true,
      parts: { listening: { best: 7, total: 8, at: '2026-11-05T00:00:00.000Z' } },
      last: { correct: 7, total: 8, at: '2026-11-05T00:00:00.000Z', listening: [7, 8] as [number, number], reading: [0, 0] as [number, number] },
      missedLessons: [], seen: { l1: 1 },
    },
  };
  const cloudWithFull = {
    b1l09: {
      best: 16, total: 20, bestAt: '2026-11-04T00:00:00.000Z',
      parts: { listening: { best: 6, total: 8, at: '2026-11-04T00:00:00.000Z' }, reading: { best: 10, total: 12, at: '2026-11-04T00:00:00.000Z' } },
      last: { correct: 16, total: 20, at: '2026-11-04T00:00:00.000Z', listening: [6, 8] as [number, number], reading: [10, 12] as [number, number] },
      missedLessons: [], seen: { r1: 1 },
    },
  };
  const mergedParts = mergeLessonTests(partsOnlyLocal, cloudWithFull).lessonTests!.b1l09;
  assert.equal(mergedParts.best, 16);
  assert.equal(mergedParts.partsOnly, undefined);
  assert.equal(mergedParts.parts?.listening?.best, 7, 'kept better local listening best');
  assert.equal(mergedParts.parts?.reading?.best, 10, 'took cloud reading best');
});

test('saved words merge three ways: local adds and removals survive a newer cloud list', async () => {
  const { mergeFavorites } = await import('../../src/utils/sync/cloudMetadata');
  assert.deepEqual(mergeFavorites(['a', 'b'], ['a', 'b', 'mine'], ['a', 'b', 'theirs']), ['a', 'b', 'theirs', 'mine']);
  assert.deepEqual(mergeFavorites(['a', 'b'], ['a'], ['a', 'b', 'theirs']), ['a', 'theirs'], 'a word removed here stays removed');
  assert.deepEqual(mergeFavorites(['a', 'b'], ['a', 'b'], ['a']), ['a'], 'a word removed there is removed here');
  assert.deepEqual(mergeFavorites(null, ['x'], ['a']), ['a'], 'with no common starting point the cloud list wins');
});
