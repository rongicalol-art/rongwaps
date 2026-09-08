import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReviewProgressState } from '../src/utils/reviewProgress';
import {
  applyCardReview,
  createClearedReviewProgress,
} from '../src/utils/reviewProgress';

function createState(overrides: Partial<ReviewProgressState> = {}): ReviewProgressState {
  return {
    srsData: {},
    learnedCards: [],
    sessionProgress: {
      cardsReviewed: 0,
      cardsLearned: 0,
      startTime: 123,
    },
    ...overrides,
  };
}

test('a review preserves every existing SRS card', () => {
  const existingCard = {
    cardId: 'existing',
    interval: 3,
    repetition: 2,
    efactor: 2.5,
    nextReviewDate: 100,
  };
  const result = applyCardReview(
    createState({ srsData: { existing: existingCard } }),
    'new-card',
    4,
  );

  assert.deepEqual(result.srsData.existing, existingCard);
  assert.equal(result.srsData['new-card'].cardId, 'new-card');
});

test('failed reviews record the attempt without learned-card credit', () => {
  const result = applyCardReview(
    createState({
      sessionProgress: {
        cardsReviewed: 2,
        cardsLearned: 1,
        startTime: 123,
      },
    }),
    'failed-card',
    2,
  );

  assert.equal(result.sessionProgress.cardsReviewed, 3);
  assert.equal(result.sessionProgress.cardsLearned, 1);
  assert.deepEqual(result.learnedCards, []);
});

test('the learned count is granted exactly once per card', () => {
  const initial = createState();
  const firstReview = applyCardReview(initial, 'first-pass', 4);
  const secondReview = applyCardReview(
    { ...initial, ...firstReview },
    'first-pass',
    4,
  );

  assert.equal(firstReview.sessionProgress.cardsReviewed, 1);
  assert.equal(firstReview.sessionProgress.cardsLearned, 1);
  assert.deepEqual(firstReview.learnedCards, ['first-pass']);

  assert.equal(secondReview.sessionProgress.cardsReviewed, 2);
  assert.equal(secondReview.sessionProgress.cardsLearned, 1);
  assert.deepEqual(secondReview.learnedCards, ['first-pass']);
});

test('a failure after learning cannot make the next pass look new again', () => {
  const initial = createState();
  const learned = applyCardReview(initial, 'known-card', 4);
  const failed = applyCardReview({ ...initial, ...learned }, 'known-card', 2);
  const relearned = applyCardReview({ ...initial, ...failed }, 'known-card', 4);

  assert.equal(relearned.sessionProgress.cardsReviewed, 3);
  assert.equal(relearned.sessionProgress.cardsLearned, 1);
  assert.deepEqual(relearned.learnedCards, ['known-card']);
});

test('reset clears local SRS and session progress', () => {
  assert.deepEqual(createClearedReviewProgress(), {
    srsData: {},
    learnedCards: [],
    sessionProgress: {
      cardsReviewed: 0,
      cardsLearned: 0,
      startTime: null,
    },
    sessionProgressIndex: {},
  });
});
