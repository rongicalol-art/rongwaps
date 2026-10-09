import assert from 'node:assert/strict';
import test from 'node:test';
import { shuffleItems } from '../../src/utils/srs/sessionOrder';
import { restoreCardOrder } from '../../src/utils/srs/sessionProgress';

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
