import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTooltipPlacement } from '../src/screens/reader/utils/readerTooltipPosition';
import { formatWordPreview } from '../src/screens/reader/utils/readerWordPreview';

test('hover preview combines correctly with position calculation for tooltip display', () => {
  const preview = formatWordPreview('朋友', {
    traditional: '朋友',
    simplified: '朋友',
    pinyin: ['péng you'],
    definitions: ['friend', 'pal'],
  });

  const anchor = {
    x: 330,
    top: 200,
    bottom: 230,
  };

  const viewport = { innerWidth: 1024, innerHeight: 768 };
  const placement = calculateTooltipPlacement(anchor, { width: 240, height: 120 }, viewport);

  assert.equal(preview.word, '朋友');
  assert.equal(preview.pinyin, 'péng you');
  assert.equal(preview.definitions.length, 2);
  assert.equal(placement.above, true);
  assert.equal(placement.top, 70); // 200 - 120 - 10
  assert.equal(placement.left, 210); // 330 - 120
  assert.equal(placement.arrowLeft, 115);
});

test('auto-flip responds when chunk is positioned in top banner area', () => {
  const anchor = {
    x: 225,
    top: 45,
    bottom: 75,
  };

  const viewport = { innerWidth: 800, innerHeight: 600 };
  const placement = calculateTooltipPlacement(anchor, { width: 240, height: 120 }, viewport);

  assert.equal(placement.above, false);
  assert.equal(placement.top, 85); // 75 + 10
  assert.equal(placement.left, 105);
  assert.equal(placement.arrowLeft, 115);
});
