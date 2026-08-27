import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCardInPartSelection,
  normalizePartSelection,
  reconcilePartSelectionsForBook,
} from '../src/utils/lessonPartSelection';
import { getSessionStartIndex, retainCurrentCardIndex } from '../src/utils/sessionProgress';
import { parseVocabularyId } from '../src/utils/vocabularyId';

test('vocabulary IDs preserve book, lesson, and part identity', () => {
  assert.deepEqual(parseVocabularyId('B1L01-2-04'), {
    bookId: 1,
    lessonId: 1,
    partId: 2,
    itemId: 4,
  });
  assert.deepEqual(parseVocabularyId('B01-L03-3-12'), {
    bookId: 1,
    lessonId: 3,
    partId: 3,
    itemId: 12,
  });
});

test('selecting every part remains an explicit array', () => {
  assert.deepEqual(normalizePartSelection([1, 2, 3], [1, 2, 3]), [1, 2, 3]);
});

test('legacy all selection migrates to Part 1 only', () => {
  assert.deepEqual(
    reconcilePartSelectionsForBook({ '1:1': 'all' }, 1, { 1: [1, 2, 3] }),
    { '1:1': [1] },
  );
});

test('practice filtering includes only enabled parts', () => {
  const card = {
    id: 'B1L01-2-04',
    bookId: 1,
    lessonId: 1,
    partId: 2,
    front: '同學',
    back: 'classmate',
  };

  assert.equal(isCardInPartSelection(card, { '1:1': [1] }), false);
  assert.equal(isCardInPartSelection(card, { '1:1': [1, 2] }), true);
});

test('part changes retain the same card when its position shifts', () => {
  const nextCards = [
    { id: 'new-before', bookId: 1, lessonId: 1, partId: 1, front: '新', back: 'new' },
    { id: 'current', bookId: 1, lessonId: 1, partId: 2, front: '現在', back: 'current' },
  ];

  assert.equal(retainCurrentCardIndex(nextCards, 'current', 0), 1);
});

test('removing the current card keeps the nearest valid position', () => {
  const nextCards = [
    { id: 'one', bookId: 1, lessonId: 1, partId: 1, front: '一', back: 'one' },
    { id: 'two', bookId: 1, lessonId: 1, partId: 1, front: '二', back: 'two' },
  ];

  assert.equal(retainCurrentCardIndex(nextCards, 'removed', 8), 1);
  assert.equal(retainCurrentCardIndex([], 'removed', 8), 0);
});

test('a new practice part starts at its own saved position instead of the previous part index', () => {
  assert.equal(getSessionStartIndex({}, 'shared_deck_1_1:2', 12), 0);
  assert.equal(getSessionStartIndex({ 'shared_deck_1_1:2': 4 }, 'shared_deck_1_1:2', 12), 4);
  assert.equal(getSessionStartIndex({ 'shared_deck_1_1:2': 12 }, 'shared_deck_1_1:2', 12), 0);
});
