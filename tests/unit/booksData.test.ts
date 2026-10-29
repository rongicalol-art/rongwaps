import assert from 'node:assert/strict';
import test from 'node:test';
import { SAMPLE_BOOKS } from '../../src/data/books';

test('every book consumer class follows the tone tokens, never a per-book hex', () => {
  assert.equal(SAMPLE_BOOKS.length, 4);
  for (const book of SAMPLE_BOOKS) {
    assert.equal(book.bg, 'bg-brand-primary-wash');
    assert.equal(book.accent, 'text-brand-primary');
    assert.equal(book.accentBg, 'bg-brand-primary');
    assert.equal(book.accentBorder, 'border-brand-primary');
    assert.equal(book.buttonEdge, 'border-brand-primary-edge');
    assert.equal(book.accentHex, 'var(--color-brand-primary)');
    assert.equal(book.edgeHex, 'var(--color-brand-primary-edge)');
    assert.equal('image' in book, false);
  }
});

test('beta locks lessons past BETA_LAST_LESSON and books 2, 4 (Book 3 unlocked)', async () => {
  const { SAMPLE_LESSONS, BETA_LAST_LESSON } = await import('../../src/data/books');
  for (const l of SAMPLE_LESSONS) assert.equal(l.status, l.id > BETA_LAST_LESSON ? 'locked' : 'available');
  assert.deepEqual(SAMPLE_BOOKS.map((b) => b.status === 'locked'), [false, true, false, true]);
});

test('isLessonLocked: Intro and Book 1 lessons 1-16 open; Book 3 lessons 1-16 open', async () => {
  const { isLessonLocked } = await import('../../src/data/books');
  for (let lesson = 0; lesson <= 16; lesson++) assert.equal(isLessonLocked(1, lesson), false, `Book 1 lesson ${lesson}`);
  assert.equal(isLessonLocked(2, 1), true);
  assert.equal(isLessonLocked(3, 1), false);
  assert.equal(isLessonLocked(3, 15), false);
  assert.equal(isLessonLocked(3, 16), false);
  assert.equal(isLessonLocked(3, 17), true);
  assert.equal(isLessonLocked(4, 1), true);
});

test('full-course access unlocks every lesson without changing the beta defaults', async () => {
  const { SAMPLE_BOOKS, isLessonLocked } = await import('../../src/data/books');
  assert.equal(isLessonLocked(2, 1), true);
  assert.equal(isLessonLocked(2, 1, true), false);
  assert.equal(isLessonLocked(4, 16, true), false);
  assert.equal(SAMPLE_BOOKS.find((book) => book.id === 2)?.status, 'locked');
});
