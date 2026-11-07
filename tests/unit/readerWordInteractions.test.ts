import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTooltipPlacement } from '../../src/utils/browser/tooltipPosition';

test('hover anchor positions tooltip above word with centered arrow', () => {
  const anchor = {
    x: 330,
    top: 200,
    bottom: 230,
  };

  const viewport = { innerWidth: 1024, innerHeight: 768 };
  const placement = calculateTooltipPlacement(anchor, { width: 240, height: 120 }, viewport);

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
