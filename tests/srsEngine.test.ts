import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateNextReview,
  fuzzInterval,
  LEARNING_STEPS_MINUTES,
  type SRSData,
} from '../src/utils/srsEngine';

const NOW = 1_700_000_000_000;
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

const originalNow = Date.now;
function withNow(fn: () => void): void {
  Date.now = () => NOW;
  try { fn(); } finally { Date.now = originalNow; }
}

function srs(overrides: Partial<SRSData> = {}): SRSData {
  return {
    cardId: 'card-1',
    interval: 0,
    repetition: 0,
    efactor: 2.5,
    nextReviewDate: NOW,
    ...overrides,
  };
}

test('a brand-new card that fails enters the first learning step', () => {
  withNow(() => {
    const next = calculateNextReview(undefined, 'card-1', 0);
    assert.equal(next.learningStep, 0);
    assert.equal(next.repetition, 0);
    assert.equal(next.nextReviewDate, NOW + LEARNING_STEPS_MINUTES[0] * MINUTE);
  });
});

test('a card passes through each learning step and then graduates', () => {
  withNow(() => {
    const card = srs({ learningStep: 0, interval: LEARNING_STEPS_MINUTES[0], nextReviewDate: NOW });
    const step0 = calculateNextReview(card, 'card-1', 4);
    assert.equal(step0.learningStep, 1);
    assert.equal(step0.nextReviewDate, NOW + LEARNING_STEPS_MINUTES[1] * MINUTE);
    assert.equal(step0.nextReviewDate - NOW, LEARNING_STEPS_MINUTES[1] * MINUTE);

    const graduated = calculateNextReview(step0, 'card-1', 4);
    assert.equal(graduated.learningStep, undefined);
    assert.equal(graduated.repetition, 0);
    assert.equal(graduated.nextReviewDate - NOW, 1 * DAY);
  });
});

test('a failed card restarts from the first learning step', () => {
  withNow(() => {
    const next = calculateNextReview(srs({ learningStep: 1 }), 'card-1', 1);
    assert.equal(next.learningStep, 0);
    assert.equal(next.repetition, 0);
    assert.equal(next.nextReviewDate, NOW + LEARNING_STEPS_MINUTES[0] * MINUTE);
  });
});

test('a legacy card without learningStep stays in the review phase', () => {
  withNow(() => {
    const legacy = srs({ interval: 0, repetition: 0, nextReviewDate: NOW });
    const next = calculateNextReview(legacy, 'card-1', 4);
    assert.equal(next.learningStep, undefined);
    assert.equal(next.interval, 1);
    assert.equal(next.repetition, 1);
    assert.equal(next.nextReviewDate - NOW, 1 * DAY);
  });
});

test('review phase uses SM-2 progression and applies fuzz', () => {
  withNow(() => {
    const next = calculateNextReview(srs({ interval: 3, repetition: 2 }), 'card-1', 4);
    // interval * efactor = 3 * 2.5 = 7.5 -> rounded 8 -> fuzzed within [7, 9] days.
    assert.ok(next.nextReviewDate - NOW >= 7 * DAY, 'expected lower fuzz bound');
    assert.ok(next.nextReviewDate - NOW <= 9 * DAY, 'expected upper fuzz bound');
  });
});

test('fuzzInterval stays within +/-10% and never below one day', () => {
  for (let i = 0; i < 500; i += 1) {
    const fuzzed = fuzzInterval(10);
    assert.ok(fuzzed >= 9, 'expected lower fuzz bound');
    assert.ok(fuzzed <= 11, 'expected upper fuzz bound');
  }
  assert.equal(fuzzInterval(1), 1);
});
