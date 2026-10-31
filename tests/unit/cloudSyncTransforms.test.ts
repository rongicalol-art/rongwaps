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
    grammarProgress: { startedPartIds: [], completedPageIds: [], completedPartIds: [] },
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
  assert.deepEqual(payload.grammarProgress, { startedPartIds: ['p1'], completedPageIds: ['page-a'], completedPartIds: [] });
  // A row saved before grammar synced counts as a change, so the device uploads it.
  assert.equal(hasMetadataChanged({ ...payload, grammarProgress: undefined }, payload), true);
  assert.equal(hasMetadataChanged({ ...payload, grammarProgress: { ...payload.grammarProgress, completedPageIds: ['page-b'] } }, payload), true);

  const cloud = { grammarProgress: { startedPartIds: ['p1', 'p2'], completedPageIds: ['page-b', 'page-a', 'page-b'], completedPartIds: 'bad' } };
  assert.deepEqual(mergeGrammarProgress(cloud, source), { startedPartIds: ['p1', 'p2'], completedPageIds: ['page-a', 'page-b'] });
  // Nothing new in the cloud (or no grammar key at all) leaves local untouched.
  assert.deepEqual(mergeGrammarProgress({ grammarProgress: { completedPageIds: ['page-a'] } }, source), {});
  assert.deepEqual(mergeGrammarProgress({}, source), {});
});
