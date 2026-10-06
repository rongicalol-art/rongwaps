import test from 'node:test';
import assert from 'node:assert/strict';
import { bookRank, groupWordsByBook, sortWords } from '../../src/utils/wordOrdering';
import type { LevelIndex } from '../../src/utils/packValidators';

const levels = {
  tbcl: { chars: new Map(), words: new Map([['易', 1], ['中', 2], ['難', 5], ['最', 3]]) },
  hsk: { chars: new Map(), words: new Map() },
} as unknown as LevelIndex;

const word = (front: string, bookId: number, lessonId = 1) => ({ front, bookId, lessonId });

test('bookRank puts the active book first and dictionary last', () => {
  assert.equal(bookRank(2, 2), -1);
  assert.equal(bookRank(1, 2), 1);
  assert.equal(bookRank(0, 2), Number.POSITIVE_INFINITY);
});

test('groups run active book, then 1-4, then dictionary', () => {
  const groups = groupWordsByBook(
    [word('a', 0), word('b', 4), word('c', 1), word('d', 3), word('e', 2)],
    { activeBookId: 3, levels: null },
  );
  assert.deepEqual(groups.map((g) => g.bookId), [3, 1, 2, 4, 0]);
});

test('inside a book, easiest level first, then lesson', () => {
  const sorted = sortWords(
    [word('難', 1, 1), word('易', 1, 9), word('最', 1, 2), word('中', 1, 3)],
    { activeBookId: 1, levels },
  );
  assert.deepEqual(sorted.map((w) => w.front), ['易', '中', '最', '難']);
});

test('unknown levels sort after known ones and ties keep lesson then input order', () => {
  const sorted = sortWords(
    [word('x', 1, 2), word('易', 1, 5), word('y', 1, 1), word('z', 1, 1)],
    { activeBookId: 1, levels },
  );
  assert.deepEqual(sorted.map((w) => w.front), ['易', 'y', 'z', 'x']);
});

test('without a loaded level index the order falls back to lesson order', () => {
  const sorted = sortWords([word('b', 1, 3), word('a', 1, 1)], { activeBookId: 1, levels: null });
  assert.deepEqual(sorted.map((w) => w.front), ['a', 'b']);
});
