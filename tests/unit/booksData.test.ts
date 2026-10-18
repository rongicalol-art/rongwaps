import assert from 'node:assert/strict';
import test from 'node:test';
import { SAMPLE_BOOKS } from '../../src/data/books';

const SURFACE = '#fcfcfb';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

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

test('every tone is a complete role set with readable text', () => {
  const roles = [
    'primary', 'primaryEdge', 'primaryDeep', 'primarySoft', 'primarySoftEdge', 'primaryTrack', 'primaryWash',
    'practiceCanvas', 'inkStrong', 'ink', 'mutedStrong', 'muted', 'border', 'divider',
  ];
  for (const { theme, label } of SAMPLE_BOOKS) {
    assert.deepEqual(Object.keys(theme).sort(), [...roles].sort(), label);
    for (const role of roles) assert.match(theme[role as keyof typeof theme], /^#[0-9A-Fa-f]{6}$/, `${label} ${role}`);
    assert.ok(contrast(theme.inkStrong, SURFACE) >= 7, `${label} inkStrong contrast`);
    assert.ok(contrast(theme.ink, SURFACE) >= 7, `${label} ink contrast`);
    assert.ok(contrast(theme.mutedStrong, SURFACE) >= 4.3, `${label} mutedStrong contrast`);
  }
  assert.equal(new Set(SAMPLE_BOOKS.map((b) => b.theme.primary)).size, 4);
});

test('beta locks lessons past BETA_LAST_LESSON and books 2-4', async () => {
  const { SAMPLE_LESSONS, BETA_LAST_LESSON } = await import('../../src/data/books');
  for (const l of SAMPLE_LESSONS) assert.equal(l.status, l.id > BETA_LAST_LESSON ? 'locked' : 'available');
  assert.deepEqual(SAMPLE_BOOKS.map((b) => b.status === 'locked'), [false, true, true, true]);
});

test('isLessonLocked: Intro and 1-8 open, 9+ and books 2-4 locked', async () => {
  const { isLessonLocked } = await import('../../src/data/books');
  assert.equal(isLessonLocked(1, 0), false);
  assert.equal(isLessonLocked(1, 8), false);
  assert.equal(isLessonLocked(1, 9), true);
  assert.equal(isLessonLocked(2, 1), true);
});

test('full-course access unlocks every lesson without changing the beta defaults', async () => {
  const { SAMPLE_BOOKS, SAMPLE_LESSONS, isLessonLocked } = await import('../../src/data/books');
  assert.equal(isLessonLocked(1, 9), true);
  assert.equal(isLessonLocked(1, 9, true), false);
  assert.equal(isLessonLocked(2, 1, true), false);
  assert.equal(isLessonLocked(4, 16, true), false);
  assert.equal(SAMPLE_LESSONS.find((lesson) => lesson.id === 9)?.status, 'locked');
  assert.equal(SAMPLE_BOOKS.find((book) => book.id === 2)?.status, 'locked');
});
