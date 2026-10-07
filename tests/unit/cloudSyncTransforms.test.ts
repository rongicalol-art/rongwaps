import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeSrsDelta,
  buildMetadataPayload,
  hasMetadataChanged,
} from '../../src/utils/cloudSyncTransforms';
import type { SRSData } from '../../src/utils/srsEngine';

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
  };

  assert.equal(hasMetadataChanged(syncedSettings, payload), false);
  assert.equal(hasMetadataChanged({ ...syncedSettings, activeBookId: 2 }, payload), true);
  assert.equal(hasMetadataChanged({ ...syncedSettings, favorites: undefined }, payload), true);
  assert.equal(hasMetadataChanged(null, payload), true);
});
