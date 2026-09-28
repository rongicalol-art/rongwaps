import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../../src/data/flashcards';
import { isSameDeckOrder, planDeckAdoption } from '../../src/utils/sessionProgress';

const card = (id: string): Flashcard => ({ id, bookId: 1, lessonId: 1, front: id, back: '' });

const BASE = {
  cards: [card('p2-1'), card('p2-2')],
  keyChanged: true,
  sessionInitialized: false,
  pendingCardId: null,
  currentCardId: null,
  canonicalOrder: [] as Flashcard[],
  savedIndex: 0,
  currentIndex: 0,
};

test('a cached key switch adopts the incoming deck in the same run', () => {
  assert.deepEqual(planDeckAdoption(BASE), { action: 'adopt', index: 0, clearPendingCard: true });
  assert.deepEqual(
    planDeckAdoption({ ...BASE, savedIndex: 1 }),
    { action: 'adopt', index: 1, clearPendingCard: true },
  );
});

test('a key switch without cards waits for the async load', () => {
  assert.deepEqual(planDeckAdoption({ ...BASE, cards: [] }), { action: 'wait' });
});

test('an unchanged deck is ignored', () => {
  const canonicalOrder = [card('p1-1'), card('p1-2')];
  assert.deepEqual(
    planDeckAdoption({
      ...BASE,
      cards: [card('p1-1'), card('p1-2')],
      keyChanged: false,
      sessionInitialized: true,
      canonicalOrder,
    }),
    { action: 'ignore' },
  );
});

test('a same-key deck change retains the current card', () => {
  assert.deepEqual(
    planDeckAdoption({
      ...BASE,
      cards: [card('p1-3'), card('p1-2')],
      keyChanged: false,
      sessionInitialized: true,
      currentCardId: 'p1-2',
      canonicalOrder: [card('p1-1'), card('p1-2')],
      currentIndex: 0,
    }),
    { action: 'adopt', index: 1, clearPendingCard: true },
  );
});

test('a key switch retains the pending card when the new deck contains it', () => {
  assert.deepEqual(
    planDeckAdoption({ ...BASE, pendingCardId: 'p2-2' }),
    { action: 'adopt', index: 1, clearPendingCard: true },
  );
});

test('a key switch falls back to the saved resume index when no card is retained', () => {
  assert.deepEqual(
    planDeckAdoption({ ...BASE, pendingCardId: 'gone', savedIndex: 1 }),
    { action: 'adopt', index: 1, clearPendingCard: true },
  );
});

test('isSameDeckOrder compares ids position by position', () => {
  assert.equal(isSameDeckOrder([card('a'), card('b')], [card('a'), card('b')]), true);
  assert.equal(isSameDeckOrder([card('a'), card('b')], [card('b'), card('a')]), false);
  assert.equal(isSameDeckOrder([card('a')], [card('a'), card('b')]), false);
});
