import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeFrameBudget } from '../../src/utils/browser/frameBudget';
import { visibleProgressScale, visibleProgressWidth } from '../../src/utils/srs/progress';
import { rectMorphFrames } from '../../src/utils/browser/rectMorph';

test('frame budget respects display rate and catches single large stalls', () => {
  assert.ok(summarizeFrameBudget(Array(120).fill(1000 / 60), 60).passed);
  assert.ok(!summarizeFrameBudget(Array(120).fill(1000 / 60), 120).passed);
  assert.ok(summarizeFrameBudget(Array(240).fill(1000 / 120), 120).passed);
  const stalled = summarizeFrameBudget([...Array(120).fill(1000 / 60), 90], 60);
  assert.equal(stalled.longFrames, 1);
  assert.equal(stalled.worstGapMs, 90);
  assert.ok(!stalled.passed, 'p95 alone must not conceal a single large stall');
  assert.ok(!summarizeFrameBudget([], 60).passed);
  assert.throws(() => summarizeFrameBudget([16], 0), RangeError);
});

test('progress transform retains the previous minimum width at phone and desktop sizes', () => {
  for (const width of [200, 800]) for (const progress of [0, 1, 50, 100]) {
    const old = visibleProgressWidth(progress);
    const expected = progress === 0 ? 0 : progress / 100 * width + 28 * (1 - progress / 100);
    assert.equal(typeof old, 'string');
    assert.ok(Math.abs(visibleProgressScale(progress, width) * width - expected) < 0.001);
  }
  assert.equal(visibleProgressScale(200, 200), 1);
  assert.equal(visibleProgressScale(Number.NaN, 200), 0);
});

test('rectangle morph maps all source corners to the source rectangle without layout keyframes', () => {
  const from = { left: 10, top: 20, width: 100, height: 150 };
  const to = { left: 90, top: 100, width: 400, height: 300 };
  const [start, end] = rectMorphFrames(from, to);
  const numbers = start.transform.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const [dx, dy, sx, sy] = numbers;
  assert.equal(to.left + dx, from.left);
  assert.equal(to.top + dy, from.top);
  assert.equal(to.left + dx + to.width * sx, from.left + from.width);
  assert.equal(to.top + dy + to.height * sy, from.top + from.height);
  assert.equal(end.transform, 'none');
  assert.deepEqual(Object.keys(start), ['transform']);
  const empty = rectMorphFrames(from, { ...to, width: 0, height: 0 });
  assert.ok(!empty[0].transform.includes('Infinity'));
});
