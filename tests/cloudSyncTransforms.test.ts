import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeSrsDelta,
  getProgressCounters,
  getDailyActivity,
  buildMetadataPayload,
  hasMetadataChanged,
} from '../src/utils/cloudSyncTransforms';
import type { SRSData } from '../src/utils/srsEngine';

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

test('cloudSyncTransforms: getProgressCounters extracts session counters', () => {
  const counters = getProgressCounters({
    sessionProgress: { cardsReviewed: 12, cardsLearned: 5 },
  });
  assert.deepEqual(counters, { cardsReviewed: 12, cardsLearned: 5 });
});

test('cloudSyncTransforms: getDailyActivity normalizes activity names', () => {
  assert.equal(getDailyActivity('flashcards'), 'flashcards');
  assert.equal(getDailyActivity('flashcards-review'), 'flashcards');
  assert.equal(getDailyActivity('quiz'), 'quiz');
  assert.equal(getDailyActivity('listening'), 'listening');
  assert.equal(getDailyActivity('writing'), 'writing');
  assert.equal(getDailyActivity(null), undefined);
  assert.equal(getDailyActivity(undefined), undefined);
});

test('cloudSyncTransforms: buildMetadataPayload and hasMetadataChanged', () => {
  const storeState = {
    favorites: ['word1'],
    activeBookId: 1,
    characterPreference: 'traditional' as const,
    sessionProgressIndex: 0,
    activeTab: 'curriculum',
    activeActivity: null,
    selectedLessonParts: { '1:1': [1] },
    selectedBooks: [1],
  };

  const payload = buildMetadataPayload(storeState);
  assert.deepEqual(payload.favorites, ['word1']);
  assert.deepEqual(payload.selectedLessons, [1]);

  const unchangedUserMeta = {
    favorites: ['word1'],
    activeBookId: 1,
    characterPreference: 'traditional',
    sessionProgressIndex: 0,
    activeTab: 'curriculum',
    activeActivity: null,
    selectedLessons: [1],
    selectedBooks: [1],
  };

  assert.equal(hasMetadataChanged(unchangedUserMeta, payload), false);

  const changedUserMeta = {
    ...unchangedUserMeta,
    activeBookId: 2,
  };
  assert.equal(hasMetadataChanged(changedUserMeta, payload), true);
});
