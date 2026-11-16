import assert from 'node:assert/strict';
import test from 'node:test';
import { FIRE, FIRE_DROP, LOW_BURN, SETTLED_FIRE, firePaths, fireTip, track } from '../../src/features/practice/streakFire';

test('a track holds its ends and eases between its points', () => {
  const t = track([[100, 0], [200, 1], [300, 0.5]]);
  assert.equal(t(0), 0);
  assert.equal(t(150), 0.5);
  assert.equal(t(200), 1);
  assert.equal(t(Infinity), 0.5);
});
test('the fire draws three closed shapes, moves with time, and is nothing before it catches', () => {
  const paths = firePaths(SETTLED_FIRE, 0, 400);
  assert.equal(paths.length, 3);
  for (const d of paths) assert.match(d, /^M-?[\d.]+,-?[\d.]+C.*Z$/);
  assert.ok(!paths.join('').includes('NaN'));
  assert.notEqual(firePaths(SETTLED_FIRE, 0, 900)[0], paths[0]);
  assert.deepEqual(firePaths({ ...SETTLED_FIRE, g: () => 0 }, 0, 400), ['', '', '']);
});
test('the fire is shorter while it burns low, taller at the roar, and stays inside its box when settled', () => {
  const tipAt = (e: number) => fireTip({ ...SETTLED_FIRE, e: () => e }, 0, 400).y;
  assert.ok(tipAt(LOW_BURN) < tipAt(1) && tipAt(1) < tipAt(1.6));
  assert.ok(tipAt(1) < -FIRE.VIEW_BOX[1]);
  for (const d of [FIRE_DROP.body, FIRE_DROP.gold]) assert.match(d, /^M0,-?[\d.]+C[-\d., C]+Z$/, 'a loose drop is a clean symmetric shape');
});
