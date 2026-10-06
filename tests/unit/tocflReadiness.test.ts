import assert from 'node:assert/strict';
import test from 'node:test';
import { computeTocflReadiness } from '../../src/utils/tocflReadiness';

const tbcl = new Map([['我', 1], ['你', 1], ['好', 1], ['媽', 2], ['學', 4], ['駕', 6]]);
const course = [
  { id: 'c1', front: '你好', bookId: 1, lessonId: 1 },
  { id: 'c2', front: '媽媽', bookId: 1, lessonId: 2 },
  { id: 'c3', front: '好學', bookId: 2, lessonId: 4 },
  { id: 'c4', front: '我們', bookId: 1, lessonId: 3 },
];

test('readiness counts known TBCL characters per TOCFL band from passed course words', () => {
  const result = computeTocflReadiness(tbcl, course, ['c1']);
  assert.deepEqual(result.bands, [
    { band: 'A', known: 2, total: 4 },
    { band: 'B', known: 0, total: 1 },
    { band: 'C', known: 0, total: 1 },
  ]);
  assert.equal(result.focusBand, 'A');
});

test('focus goal counts characters still needed to reach 90% of the focus band', () => {
  const result = computeTocflReadiness(tbcl, course, ['c1']);
  // Band A has 4 characters; 90% rounds up to 4, and 2 are known.
  assert.equal(result.focusToGo, 2);
});

test('focus moves to the next band once a band is 90% known', () => {
  const result = computeTocflReadiness(tbcl, course, ['c1', 'c2', 'c4']);
  assert.equal(result.focusBand, 'B');
  assert.equal(result.focusToGo, 1);
});
