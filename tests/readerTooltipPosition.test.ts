import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateTooltipPlacement,
  calculateTooltipPosition,
} from '../src/screens/reader/utils/readerTooltipPosition';

test('calculates placement above word when there is sufficient clearance', () => {
  const anchor = { x: 430, top: 250, bottom: 280 };
  const dimensions = { width: 240, height: 120 };
  const viewport = { innerWidth: 1024, innerHeight: 768 };

  const placement = calculateTooltipPlacement(anchor, dimensions, viewport);

  assert.equal(placement.above, true);
  // top = anchor.top (250) - dimensions.height (120) - gap (10) = 120
  assert.equal(placement.top, 120);
  // idealLeft = 430 - 120 = 310
  assert.equal(placement.left, 310);
  // arrow tracks center: 430 - 310 - 5 = 115
  assert.equal(placement.arrowLeft, 115);
});

test('flips below word when top clearance is less than height + gap', () => {
  const anchor = { x: 430, top: 80, bottom: 110 };
  const dimensions = { width: 240, height: 120 };
  const viewport = { innerWidth: 1024, innerHeight: 768 };

  const placement = calculateTooltipPlacement(anchor, dimensions, viewport);

  assert.equal(placement.above, false);
  // top = anchor.bottom (110) + gap (10) = 120
  assert.equal(placement.top, 120);
  assert.equal(placement.left, 310);
  assert.equal(placement.arrowLeft, 115);
});

test('clamps left coordinate and aligns arrow when anchor is near left screen edge', () => {
  const anchor = { x: 30, top: 300, bottom: 330 };
  const dimensions = { width: 240, height: 120 };
  const viewport = { innerWidth: 1024, innerHeight: 768 };

  const placement = calculateTooltipPlacement(anchor, dimensions, viewport);

  // Clamped to screenPadding (12)
  assert.equal(placement.left, 12);
  // Arrow tracks word center: anchor.x (30) - left (12) - 5 = 13, clamped to min 16
  assert.equal(placement.arrowLeft, 16);
});

test('clamps right coordinate and aligns arrow when anchor is near right screen edge', () => {
  const anchor = { x: 1010, top: 300, bottom: 330 };
  const dimensions = { width: 240, height: 120 };
  const viewport = { innerWidth: 1024, innerHeight: 768 };

  const placement = calculateTooltipPlacement(anchor, dimensions, viewport);

  // Clamped to 1024 - 240 - 12 = 772
  assert.equal(placement.left, 772);
  // Arrow tracks word center clamped to arrowMax (240 - 26 = 214)
  assert.equal(placement.arrowLeft, 214);
});

test('calculateTooltipPosition compatibility wrapper works', () => {
  const anchorRect = {
    top: 250,
    bottom: 280,
    left: 400,
    right: 460,
    width: 60,
    height: 30,
  };
  const viewport = { innerWidth: 1024, innerHeight: 768 };

  const pos = calculateTooltipPosition(anchorRect, viewport, 200, 100);

  assert.equal(pos.isFlipped, false);
  assert.equal(pos.left, 330);
});
