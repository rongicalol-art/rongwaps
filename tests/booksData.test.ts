import assert from 'node:assert/strict';
import test from 'node:test';
import { SAMPLE_BOOKS } from '../src/data/books';

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
    bg: 'bg-[#E0F2FE]', accent: 'text-brand-primary', accentBg: 'bg-brand-primary', accentBorder: 'border-brand-primary',
    accentBgLight: 'bg-[#E0F2FE]', ring: 'ring-brand-primary/40', lightBg: 'bg-[#E0F2FE]',
    gradientFrom: '#E0F2FE', gradientTo: '#ffffff', accentHex: '#0284C7', edgeHex: '#0369A1',
    buttonEdge: 'border-brand-primary-edge', patternOpacity: 0.1,
    neutralBg: '#F4F9FC', neutralBorder: '#E0EAEF', neutralText: '#464D54', neutralMuted: '#A6B2BD',
    theme: {
      primary: '#0284C7', primaryEdge: '#0369A1', primaryDeep: '#075985', primarySoft: '#F0F9FF',
      primarySoftEdge: '#BAE6FD', primaryTrack: '#C7D9E5', practiceCanvas: '#E9EEF1',
    },
  });

  assert.equal(b2.bg, 'bg-[#FFEDD5]');
  assert.equal(b2.accent, 'text-brand-secondary');
  assert.equal(b2.buttonEdge, 'border-[#C2410C]');
  assert.equal(b2.accentHex, '#EA580C');

  assert.equal(b3.accent, 'text-[#A0522D]');
  assert.equal(b3.accentBg, 'bg-[#A0522D]');
  assert.equal(b3.buttonEdge, 'border-[#8B4513]');

  assert.equal(b4.accent, 'text-feedback-success');
  assert.equal(b4.ring, 'ring-feedback-success/40');
  assert.equal(b4.buttonEdge, 'border-[#58A700]');

  // No book carries a remote cover image (was an unrendered Google-hosted URL).
  for (const book of SAMPLE_BOOKS) {
    assert.equal('image' in book, false);
  }
});
