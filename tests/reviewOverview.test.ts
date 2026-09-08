import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeReviewOverview,
  isSrsDue,
  SOLID_REPETITION_THRESHOLD,
} from '../src/utils/reviewOverview';
import type { SRSData } from '../src/utils/srsEngine';

function srs(overrides: Partial<SRSData> = {}): SRSData {
  return {
    cardId: '',
    interval: 1,
    repetition: 0,
    efactor: 2.5,
    nextReviewDate: 0,
    ...overrides,
  };
}

const NOW = 1_700_000_000_000;

test('isSrsDue is true only when the review date has passed', () => {
  assert.equal(isSrsDue(srs({ nextReviewDate: NOW - 1 }), NOW), true);
  assert.equal(isSrsDue(srs({ nextReviewDate: NOW }), NOW), true);
  assert.equal(isSrsDue(srs({ nextReviewDate: NOW + 1 }), NOW), false);
});

test('a word becomes known on its first pass and counts toward learning', () => {
  const overview = computeReviewOverview(
    { w1: srs({ repetition: 1, nextReviewDate: NOW + 86_400_000 }) },
    ['w1'],
    NOW,
  );
  assert.equal(overview.knownTotal, 1);
  assert.deepEqual(overview.stages, { learning: 1, solid: 0, started: 0 });
  assert.equal(overview.dueCount, 0);
});

test('3+ successful reviews move a word to solid', () => {
  const overview = computeReviewOverview(
    {
      w1: srs({ repetition: SOLID_REPETITION_THRESHOLD, nextReviewDate: NOW + 86_400_000 }),
      w2: srs({ repetition: 2, nextReviewDate: NOW + 86_400_000 }),
    },
    ['w1', 'w2'],
    NOW,
  );
  assert.deepEqual(overview.stages, { learning: 1, solid: 1, started: 0 });
});

test('due words count regardless of their stage', () => {
  const overview = computeReviewOverview(
    {
      solidDue: srs({ repetition: 5, nextReviewDate: NOW - 1 }),
      notDue: srs({ repetition: 1, nextReviewDate: NOW + 1 }),
      startedDue: srs({ repetition: 0, nextReviewDate: NOW - 2 }),
    },
    ['solidDue', 'notDue'],
    NOW,
  );
  assert.equal(overview.dueCount, 2);
  assert.equal(overview.knownTotal, 2);
  assert.deepEqual(overview.stages, { learning: 1, solid: 1, started: 1 });
});

test('a reviewed-but-failed word is started, not known', () => {
  const overview = computeReviewOverview(
    { w1: srs({ repetition: 0 }) },
    [],
    NOW,
  );
  assert.equal(overview.knownTotal, 0);
  assert.equal(overview.dueCount, 1);
  assert.deepEqual(overview.stages, { learning: 0, solid: 0, started: 1 });
});

test('legacy known words without an SRS record still count as learning', () => {
  const overview = computeReviewOverview({}, ['legacy-word'], NOW);
  assert.equal(overview.knownTotal, 1);
  assert.deepEqual(overview.stages, { learning: 1, solid: 0, started: 0 });
  assert.equal(overview.dueCount, 0);
});
