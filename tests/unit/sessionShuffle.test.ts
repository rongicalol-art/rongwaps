import assert from 'node:assert/strict';
import test from 'node:test';
import { shuffleItems } from '../../src/utils/srs/sessionOrder';
import { restoreCardOrder, restoreReviewCards, reviewSessionKey } from '../../src/utils/srs/sessionProgress';

const card = (id: string) => ({ id });
const deck = ['a', 'b', 'c', 'd'].map(card);

test('shuffleItems keeps every card and never returns the original order', () => {
  for (let run = 0; run < 20; run += 1) {
    const result = shuffleItems(deck);
    assert.deepEqual(result.map((c) => c.id).sort(), ['a', 'b', 'c', 'd']);
    assert.notDeepEqual(result.map((c) => c.id), ['a', 'b', 'c', 'd']);
  }
});

test('restoreCardOrder rebuilds the saved shuffled order', () => {
  const result = restoreCardOrder(deck, ['c', 'a', 'd', 'b']);
  assert.deepEqual(result?.map((c) => c.id), ['c', 'a', 'd', 'b']);
});

test('restoreCardOrder keeps requeued repeats from the saved order', () => {
  const result = restoreCardOrder(deck, ['c', 'a', 'c', 'd', 'b']);
  assert.deepEqual(result?.map((c) => c.id), ['c', 'a', 'c', 'd', 'b']);
});

test('restoreCardOrder gives up when the deck changed since it was saved', () => {
  assert.equal(restoreCardOrder(deck, ['c', 'a', 'd']), null);
  assert.equal(restoreCardOrder(deck, ['c', 'a', 'd', 'x']), null);
  assert.equal(restoreCardOrder(deck, undefined), null);
  assert.equal(restoreCardOrder(deck, []), null);
});

test('restoreReviewCards rebuilds the saved missed list in order', () => {
  assert.deepEqual(restoreReviewCards(deck, ['c', 'a'])?.map((card) => card.id), ['c', 'a']);
});

test('restoreReviewCards keeps a full-deck review when every card was missed', () => {
  assert.deepEqual(restoreReviewCards(deck, ['d', 'c', 'b', 'a'])?.map((card) => card.id), ['d', 'c', 'b', 'a']);
});

test('restoreReviewCards rejects missing, duplicate and invalid saved cards', () => {
  assert.equal(restoreReviewCards(deck, undefined), null);
  assert.equal(restoreReviewCards(deck, []), null);
  assert.equal(restoreReviewCards(deck, ['a', 'a']), null);
  assert.equal(restoreReviewCards(deck, ['a', 'b', 'c', 'd', 'x']), null);
  assert.equal(restoreReviewCards(deck, ['a', 'gone']), null);
});

test('reviewSessionKey never collides with a deck session key', () => {
  assert.notEqual(reviewSessionKey('deck-1'), 'deck-1');
});
