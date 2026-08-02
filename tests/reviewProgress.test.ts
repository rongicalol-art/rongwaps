import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReviewProgressState } from '../src/utils/reviewProgress';
import {
  applyCardReview,
  createClearedReviewProgress,
} from '../src/utils/reviewProgress';
import { calculateXpForReview } from '../src/utils/xpSystem';

function createState(overrides: Partial<ReviewProgressState> = {}): ReviewProgressState {
  return {
    srsData: {},
    learnedCards: [],
    sessionProgress: {
      xpEarned: 0,
      cardsReviewed: 0,
      cardsLearned: 0,
      startTime: 123,
    },
    currentStreak: 0,
    totalXp: 0,
    totalCardsReviewed: 0,
    totalCardsLearned: 0,
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

test('failed reviews record the attempt without XP or learned-card credit', () => {
  const result = applyCardReview(
    createState({
      sessionProgress: {
        xpEarned: 7,
        cardsReviewed: 2,
        cardsLearned: 1,
        startTime: 123,
      },
      totalXp: 11,
      totalCardsReviewed: 8,
      totalCardsLearned: 4,
    }),
    'failed-card',
    2,
  );

  assert.equal(result.sessionProgress.xpEarned, 7);
  assert.equal(result.sessionProgress.cardsReviewed, 3);
  assert.equal(result.sessionProgress.cardsLearned, 1);
  assert.equal(result.totalXp, 11);
  assert.equal(result.totalCardsReviewed, 9);
  assert.equal(result.totalCardsLearned, 4);
  assert.deepEqual(result.learnedCards, []);
  assert.equal(calculateXpForReview(2, true, 0), 0);
});

test('the new-card bonus and learned count are granted exactly once', () => {
  const initial = createState();
  const firstReview = applyCardReview(initial, 'first-pass', 4);
  const secondReview = applyCardReview(
    { ...initial, ...firstReview },
    'first-pass',
    4,
  );

  assert.equal(firstReview.sessionProgress.xpEarned, 15);
  assert.equal(firstReview.sessionProgress.cardsLearned, 1);
  assert.equal(firstReview.totalXp, 15);
  assert.equal(firstReview.totalCardsLearned, 1);
  assert.deepEqual(firstReview.learnedCards, ['first-pass']);

  assert.equal(secondReview.sessionProgress.xpEarned, 25);
  assert.equal(secondReview.sessionProgress.cardsReviewed, 2);
  assert.equal(secondReview.sessionProgress.cardsLearned, 1);
  assert.equal(secondReview.totalXp, 25);
  assert.equal(secondReview.totalCardsReviewed, 2);
  assert.equal(secondReview.totalCardsLearned, 1);
  assert.deepEqual(secondReview.learnedCards, ['first-pass']);
});

test('a failure after learning cannot make the next pass look new again', () => {
  const initial = createState();
  const learned = applyCardReview(initial, 'known-card', 4);
  const failed = applyCardReview({ ...initial, ...learned }, 'known-card', 2);
  const relearned = applyCardReview({ ...initial, ...failed }, 'known-card', 4);

  assert.equal(relearned.totalXp, 25);
  assert.equal(relearned.totalCardsLearned, 1);
  assert.equal(relearned.sessionProgress.cardsLearned, 1);
  assert.deepEqual(relearned.learnedCards, ['known-card']);
});

test('reset clears local SRS, aggregate totals, and session progress', () => {
  assert.deepEqual(createClearedReviewProgress(), {
    srsData: {},
    learnedCards: [],
    sessionProgress: {
      xpEarned: 0,
      cardsReviewed: 0,
      cardsLearned: 0,
      startTime: null,
    },
    currentStreak: 0,
    longestStreak: 0,
    totalXp: 0,
    totalCardsReviewed: 0,
    totalCardsLearned: 0,
    lastStudyDate: null,
    sessionProgressIndex: {},
  });
});
