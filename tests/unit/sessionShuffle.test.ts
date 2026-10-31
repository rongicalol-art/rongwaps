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

test('shuffleItems never shows the original order when equal-looking items repeat', () => {
  const tiles = ['他', '又', '高', '又', '帥', '很'].map((text) => ({ text }));
  const looksSame = (a: { text: string }, b: { text: string }) => a.text === b.text;
  const original = tiles.map((tile) => tile.text).join('');
  const realRandom = Math.random;
  try {
    // A shuffle that only swaps the two 又 tiles (positions 1 and 3), the case that used to slip through.
    const swapOnlyRepeats = [5, 4, 1, 2, 1].map((target, step) => (target + 0.5) / (6 - step));
    let call = 0;
    Math.random = () => swapOnlyRepeats[call++ % swapOnlyRepeats.length];
    assert.equal(shuffleItems(tiles).map((tile) => tile.text).join(''), original, 'identity alone misses it');
    call = 0;
    assert.notEqual(shuffleItems(tiles, looksSame).map((tile) => tile.text).join(''), original);
  } finally {
    Math.random = realRandom;
  }
  for (let run = 0; run < 200; run += 1) assert.notEqual(shuffleItems(tiles, looksSame).map((tile) => tile.text).join(''), original);
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
