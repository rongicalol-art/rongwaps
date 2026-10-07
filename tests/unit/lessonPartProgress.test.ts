import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../../src/data/flashcards';
import { aggregateLessonPartProgress } from '../../src/utils/lesson/lessonPartProgress';

function card(id: string, partId?: number): Flashcard {
  return {
    id,
    bookId: 1,
    lessonId: 1,
    partId,
    front: `front-${id}`,
    back: '',
  };
}

test('part rows aggregate word counts and sort by part id', () => {
  const rows = aggregateLessonPartProgress(
    [card('b1l1-1', 2), card('b1l1-2', 1), card('b1l1-3', 2)],
    ['b1l1-1'],
  );

  assert.deepEqual(rows, [
    { id: 1, wordCount: 1, learnedCount: 0, isSelected: false },
    { id: 2, wordCount: 2, learnedCount: 1, isSelected: false },
  ]);
});

test('cards without a part id belong to part 1', () => {
  const rows = aggregateLessonPartProgress([card('b1l1-1')], []);

  assert.deepEqual(rows, [
    { id: 1, wordCount: 1, learnedCount: 0, isSelected: false },
  ]);
});

test('learned matching is case-insensitive across id spellings', () => {
  const rows = aggregateLessonPartProgress(
    [card('B1L01-2-04', 1), card('b1l1-1', 1)],
    ['b1l01-2-04', 'B1L1-1'],
  );

  assert.deepEqual(rows, [
    { id: 1, wordCount: 2, learnedCount: 2, isSelected: false },
  ]);
});

test('learned ids missing from the deck do not affect counts', () => {
  const rows = aggregateLessonPartProgress(
    [card('b1l1-1', 1)],
    ['b1l1-1', 'b9l9-9'],
  );

  assert.deepEqual(rows, [
    { id: 1, wordCount: 1, learnedCount: 1, isSelected: false },
  ]);
});
