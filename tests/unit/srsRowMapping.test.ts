import assert from 'node:assert/strict';
import test from 'node:test';
import type { SRSData } from '../../src/utils/srsEngine';
import { isSameSrsData, rowToSrsData, srsDataToUpsert } from '../../src/utils/srsRowMapping';

const graduated: SRSData = {
  cardId: 'word_你好',
  interval: 3,
  repetition: 2,
  efactor: 2.5,
  nextReviewDate: 1757500000000,
};

const learning: SRSData = {
  ...graduated,
  interval: 0,
  repetition: 0,
  learningStep: 1,
};

test('srsDataToUpsert maps every persisted field', () => {
  assert.deepEqual(srsDataToUpsert(graduated, graduated.cardId), {
    card_id: 'word_你好',
    ease: 2.5,
    interval: 3,
    repetitions: 2,
    next_review_date: new Date(graduated.nextReviewDate).toISOString(),
    learning_step: null,
  });
});

test('srsDataToUpsert maps the learning step when present', () => {
  const upsert = srsDataToUpsert(learning, learning.cardId);
  assert.equal(upsert.learning_step, 1);
});

test('rowToSrsData maps a graduated row without a learning step', () => {
  const data = rowToSrsData({
    card_id: 'word_你好',
    ease: 2.5,
    interval: 3,
    repetitions: 2,
    next_review_date: new Date(graduated.nextReviewDate).toISOString(),
    learning_step: null,
  });
  assert.deepEqual(data, graduated);
});

test('rowToSrsData coerces string ease and missing fields defensively', () => {
  const data = rowToSrsData({
    card_id: 'c',
    ease: '2.5',
    interval: null,
    repetitions: null,
    next_review_date: null,
    learning_step: null,
  });
  assert.equal(data.efactor, 2.5);
  assert.equal(data.interval, 0);
  assert.equal(data.repetition, 0);
  assert.ok(Number.isFinite(data.nextReviewDate));
});

test('rowToSrsData keeps the learning step only when the server sent one', () => {
  const withStep = rowToSrsData({
    card_id: 'c',
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    next_review_date: new Date(0).toISOString(),
    learning_step: 0,
  });
  assert.equal(withStep.learningStep, 0);

  const legacy = rowToSrsData({
    card_id: 'c',
    ease: 2.5,
    interval: 1,
    repetitions: 1,
    next_review_date: new Date(0).toISOString(),
    learning_step: null,
  });
  assert.equal('learningStep' in legacy, false);
});

test('round-trip preserves every persisted field', () => {
  for (const data of [graduated, learning]) {
    const upsert = srsDataToUpsert(data, data.cardId);
    const roundTripped = rowToSrsData({
      card_id: upsert.card_id,
      ease: upsert.ease,
      interval: upsert.interval,
      repetitions: upsert.repetitions,
      next_review_date: upsert.next_review_date,
      learning_step: upsert.learning_step,
    });
    assert.deepEqual(roundTripped, data);
    assert.ok(isSameSrsData(data, roundTripped));
  }
});

test('isSameSrsData treats a missing learning step and null as equal', () => {
  const noStep: SRSData = { ...graduated };
  const nullStep: SRSData = { ...graduated, learningStep: undefined };
  assert.ok(isSameSrsData(noStep, nullStep));
  assert.ok(!isSameSrsData(graduated, { ...graduated, interval: graduated.interval + 1 }));
  assert.ok(!isSameSrsData(graduated, { ...graduated, learningStep: 0 }));
  assert.ok(!isSameSrsData(learning, { ...learning, learningStep: 2 }));
});

test('srsDataToUpsert sends reviewed_at only when the card has a review time', () => {
  assert.equal('reviewed_at' in srsDataToUpsert(graduated, graduated.cardId), false);

  const reviewed: SRSData = { ...graduated, lastReviewedAt: 1757400000000 };
  assert.equal(
    srsDataToUpsert(reviewed, reviewed.cardId).reviewed_at,
    new Date(1757400000000).toISOString(),
  );
});

test('rowToSrsData maps reviewed_at to lastReviewedAt and tolerates its absence', () => {
  const base = {
    card_id: 'c',
    ease: 2.5,
    interval: 1,
    repetitions: 1,
    next_review_date: new Date(0).toISOString(),
    learning_step: null,
  };
  const withTime = rowToSrsData({ ...base, reviewed_at: new Date(1757400000000).toISOString() });
  assert.equal(withTime.lastReviewedAt, 1757400000000);

  for (const reviewed_at of [null, undefined, 'garbage']) {
    assert.equal('lastReviewedAt' in rowToSrsData({ ...base, reviewed_at }), false);
  }
});

test('reviewed_at round-trips through the row mapping', () => {
  const reviewed: SRSData = { ...learning, lastReviewedAt: 1757400123456 };
  const upsert = srsDataToUpsert(reviewed, reviewed.cardId);
  const roundTripped = rowToSrsData({
    card_id: upsert.card_id,
    ease: upsert.ease,
    interval: upsert.interval,
    repetitions: upsert.repetitions,
    next_review_date: upsert.next_review_date,
    learning_step: upsert.learning_step,
    reviewed_at: upsert.reviewed_at,
  });
  assert.deepEqual(roundTripped, reviewed);
});

test('isSameSrsData ignores lastReviewedAt: only scheduling fields make a card dirty', () => {
  assert.ok(isSameSrsData(graduated, { ...graduated, lastReviewedAt: 123 }));
});
