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

test('beta locks only lessons past BETA_LAST_LESSON; Books 1-3 are open, Book 4 is locked', async () => {
  const { SAMPLE_LESSONS, BETA_LAST_LESSON } = await import('../../src/data/books');
  for (const l of SAMPLE_LESSONS) assert.equal(l.status, l.id > BETA_LAST_LESSON ? 'locked' : 'available');
  assert.deepEqual(SAMPLE_BOOKS.map((b) => b.status === 'locked'), [false, false, false, true]);
});

test('isLessonLocked: Intro and Book 1 lessons 1-16 open; Books 2-3 lessons 1-16 open, Book 4 locked', async () => {
  const { isLessonLocked } = await import('../../src/data/books');
  for (let lesson = 0; lesson <= 16; lesson++) assert.equal(isLessonLocked(1, lesson), false, `Book 1 lesson ${lesson}`);
  assert.equal(isLessonLocked(2, 1), false);
  assert.equal(isLessonLocked(2, 17), true);
  assert.equal(isLessonLocked(3, 1), false);
  assert.equal(isLessonLocked(3, 15), false);
  assert.equal(isLessonLocked(3, 16), false);
  assert.equal(isLessonLocked(3, 17), true);
  assert.equal(isLessonLocked(4, 1), true);
  assert.equal(isLessonLocked(4, 16), true);
});

test('full-course access also opens lessons past the beta limit', async () => {
  const { isLessonLocked } = await import('../../src/data/books');
  assert.equal(isLessonLocked(2, 17), true);
  assert.equal(isLessonLocked(2, 17, true), false);
  assert.equal(isLessonLocked(4, 16), true);
  assert.equal(isLessonLocked(4, 16, true), false);
});
