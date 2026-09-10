import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../src/data/flashcards';
import { buildReviewSession, REVIEW_SESSION_CAP } from '../src/utils/reviewSession';
import type { SRSData } from '../src/utils/srsEngine';

function card(id: string): Flashcard {
  return {
    id,
    bookId: 1,
    lessonId: 1,
    front: id,
    back: '',
    pinyin: '',
    audio: '',
    notes: '',
  };
}

function srs(overrides: Partial<SRSData>): SRSData {
  return {
    cardId: 'x',
    interval: 1,
    repetition: 1,
    efactor: 2.5,
    nextReviewDate: 0,
    ...overrides,
  };
}

test('review session is capped at the configured limit', () => {
  const dueCards = Array.from({ length: 250 }, (_, i) => card(`b01l01p01w${String(i).padStart(3, '0')}`));
  const srsData: Record<string, SRSData> = {};
  for (let i = 0; i < 250; i += 1) {
    srsData[`b01l01p01w${String(i).padStart(3, '0')}`] = srs({ cardId: `w${i}`, nextReviewDate: i });
  }

  const session = buildReviewSession(dueCards, srsData);
  assert.equal(session.length, REVIEW_SESSION_CAP);
  assert.ok(REVIEW_SESSION_CAP <= 100);
});

test('learning-phase cards come first, then most-overdue reviews', () => {
  const srsData: Record<string, SRSData> = {
    learning_a: srs({ cardId: 'learning_a', nextReviewDate: 5_000, learningStep: 1 }),
    learning_b: srs({ cardId: 'learning_b', nextReviewDate: 1_000, learningStep: 0 }),
    review_old: srs({ cardId: 'review_old', nextReviewDate: 100 }),
    review_new: srs({ cardId: 'review_new', nextReviewDate: 900 }),
  };
  const dueCards = ['review_new', 'learning_a', 'review_old', 'learning_b'].map(card);

  const session = buildReviewSession(dueCards, srsData);
  assert.deepEqual(
    session.map((c) => c.id),
    ['learning_b', 'learning_a', 'review_old', 'review_new'],
  );
});

test('due-date ties prefer the weakest card (lowest ease factor)', () => {
  const srsData: Record<string, SRSData> = {
    strong: srs({ cardId: 'strong', nextReviewDate: 100, efactor: 2.8 }),
    weak: srs({ cardId: 'weak', nextReviewDate: 100, efactor: 1.4 }),
  };
  const session = buildReviewSession([card('strong'), card('weak')], srsData);
  assert.deepEqual(session.map((c) => c.id), ['weak', 'strong']);
});

test('under the cap the full due pool is returned in priority order', () => {
  const srsData: Record<string, SRSData> = {};
  const ids = ['a', 'b', 'c'];
  for (const [index, id] of ids.entries()) {
    srsData[id] = srs({ cardId: id, nextReviewDate: (3 - index) * 1000 });
  }
  const session = buildReviewSession(ids.map(card), srsData);
  assert.deepEqual(session.map((c) => c.id), ['c', 'b', 'a']);
});

test('an empty due pool yields an empty session', () => {
  assert.deepEqual(buildReviewSession([], {}), []);
});
