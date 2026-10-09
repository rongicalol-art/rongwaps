import assert from 'node:assert/strict';
import test from 'node:test';
import { SAMPLE_BOOKS } from '../../src/data/books';

/**
 * Locks the derived book theme shape against the original hand-written
 * values. The catalog is now built by buildBook() from one theme object per
 * book — if a derived field drifts from the legacy value, styling changes
 * silently everywhere the book theme is consumed.
 */
test('derived book themes match the legacy catalog values', () => {
  assert.equal(SAMPLE_BOOKS.length, 4);

  const [b1, b2, b3, b4] = SAMPLE_BOOKS;

  assert.deepEqual(b1, {
    id: 1, label: 'Book 1', title: 'Modern Chinese 1', subtitle: '時代華語 1', level: 'A1', progress: 0, status: 'active',
    bg: 'bg-[#E4EDF3]', accent: 'text-brand-primary', accentBg: 'bg-brand-primary', accentBorder: 'border-brand-primary',
    accentBgLight: 'bg-[#E4EDF3]', ring: 'ring-brand-primary/40', lightBg: 'bg-[#E4EDF3]',
    gradientFrom: '#E4EDF3', gradientTo: '#ffffff', accentHex: '#3A7CA5', edgeHex: '#2C6385',
    buttonEdge: 'border-brand-primary-edge', patternOpacity: 0.1,
    neutralBg: '#F4F7F9', neutralBorder: '#E3E8EB', neutralText: '#4A4E52', neutralMuted: '#A8AEB3',
    theme: {
      primary: '#3A7CA5', primaryEdge: '#2C6385', primaryDeep: '#1F4D6B', primarySoft: '#F2F6F8',
      primarySoftEdge: '#C3D7E3', primaryTrack: '#D3DBE0', practiceCanvas: '#F3F2F0',
    },
  });

  assert.equal(b2.bg, 'bg-[#F7E8D8]');
  assert.equal(b2.accent, 'text-brand-secondary');
  assert.equal(b2.buttonEdge, 'border-[#B05F27]');
  assert.equal(b2.accentHex, '#D4793A');

  assert.equal(b3.accent, 'text-[#A0522D]');
  assert.equal(b3.accentBg, 'bg-[#A0522D]');
  assert.equal(b3.buttonEdge, 'border-[#8B4513]');

  assert.equal(b4.accent, 'text-feedback-success');
  assert.equal(b4.ring, 'ring-feedback-success/40');
  assert.equal(b4.buttonEdge, 'border-[#3F8420]');

  // No book carries a remote cover image (was an unrendered Google-hosted URL).
  for (const book of SAMPLE_BOOKS) {
    assert.equal('image' in book, false);
  }
});
