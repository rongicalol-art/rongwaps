import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLevel, tocflBand, tocflLabel } from '../../src/utils/lesson/levels';
import type { LevelIndex } from '../../src/utils/packValidators';

const index: LevelIndex = {
  tbcl: {
    chars: new Map([['兔', 2], ['子', 1], ['梨', 4], ['我', 1], ['龍', 7]]),
    words: new Map([['兔子', 2], ['梨', 4], ['爸爸', 1]]),
  },
  hsk: {
    chars: new Map([['鳳', 6]]),
    words: new Map([['鳳梨', 5], ['梨子', 5], ['龍', 1]]),
  },
};

test('a single character keeps its official tbcl level over an hsk word entry', () => {
  assert.deepEqual(resolveLevel('龍', index), { level: 7, source: 'tbcl' });
});

test('exact tbcl word wins, then hsk word', () => {
  assert.deepEqual(resolveLevel('爸爸', index), { level: 1, source: 'tbcl' });
  assert.deepEqual(resolveLevel('鳳梨', index), { level: 5, source: 'hsk' });
});

test('slash alternatives and optional parts normalize', () => {
  assert.deepEqual(resolveLevel('兔/兔子', index), { level: 2, source: 'tbcl' });
  assert.deepEqual(resolveLevel('梨（子）', index), { level: 4, source: 'tbcl' });
  assert.deepEqual(resolveLevel('梨(子)', index), { level: 4, source: 'tbcl' });
  assert.deepEqual(resolveLevel('爸爸……', index), { level: 1, source: 'tbcl' });
});

test('single characters use tbcl then hsk char levels', () => {
  assert.deepEqual(resolveLevel('我', index), { level: 1, source: 'tbcl' });
  assert.deepEqual(resolveLevel('鳳', index), { level: 6, source: 'hsk' });
});

test('estimate is the highest character level + 1, capped at 7', () => {
  assert.deepEqual(resolveLevel('我兔', index), { level: 3, source: 'estimate' });
  assert.deepEqual(resolveLevel('龍我', index), { level: 7, source: 'estimate' });
});

test('hanzi on neither list are rare; non-hanzi or empty input resolves to null', () => {
  assert.deepEqual(resolveLevel('嚚', index), { level: 8, source: 'rare' });
  assert.deepEqual(resolveLevel('我嚚', index), { level: 8, source: 'rare' });
  assert.equal(resolveLevel('ABC', index), null);
  assert.equal(resolveLevel('亻', index), null);
  assert.equal(resolveLevel(undefined, index), null);
  assert.equal(resolveLevel('我', null), null);
});

test('labels and bands follow the TBCL scale', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(tocflLabel), ['Novice', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  assert.equal(tocflLabel(8), 'Rare');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(tocflBand), ['A', 'A', 'A', 'B', 'B', 'C', 'C']);
});
