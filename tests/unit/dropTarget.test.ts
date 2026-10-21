import assert from 'node:assert/strict';
import test from 'node:test';
import { nearestDropTarget, type DropRect } from '../../src/utils/grammar/dropTarget';

const rect = (id: string, x: number, y = 0): DropRect => ({ id, left: x - 2, right: x + 2, top: y - 10, bottom: y + 10 });
const targets = [rect('a', 20), rect('b', 60), rect('c', 100)];

test('picks the nearest drop spot within the radius', () => {
  assert.equal(nearestDropTarget({ x: 58, y: 4 }, targets, 40), 'b');
  assert.equal(nearestDropTarget({ x: 24, y: 0 }, targets, 40), 'a');
});

test('nothing is chosen when the word is far from every spot', () => {
  assert.equal(nearestDropTarget({ x: 60, y: 200 }, targets, 40), null);
  assert.equal(nearestDropTarget({ x: 0, y: 0 }, [], 40), null);
});

test('the current spot is kept while the word stays near it', () => {
  // 'a' is nearer, but 'b' is held and still within the sticky radius.
  assert.equal(nearestDropTarget({ x: 38, y: 0 }, targets, 40, 'b'), 'b');
  assert.equal(nearestDropTarget({ x: 38, y: 0 }, targets, 40, null), 'a');
});

test('an adjacent gap wins once the pointer is clearly closer to it', () => {
  assert.equal(nearestDropTarget({ x: 100, y: 0 }, targets, 72, 'b'), 'c');
  assert.equal(nearestDropTarget({ x: 20, y: 0 }, targets, 72, 'b'), 'a');
});
