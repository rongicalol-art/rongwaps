import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOK_ZOOM_LEVELS,
  clampBookOffset,
  clampBookZoom,
  getBookFitScale,
  getBookPageLayout,
  getBookPanBounds,
  getBookZoomOffset,
  getNextBookZoom,
  getPreviousBookZoom,
  isMaximumBookZoom,
  isMinimumBookZoom,
  type BookViewerMetrics,
} from '../../src/screens/grammar-lesson/utils/bookViewerLayout';

const landscapeStage: BookViewerMetrics = {
  stageWidth: 600,
  stageHeight: 800,
  naturalWidth: 1000,
  naturalHeight: 2000,
  gutter: 0,
};

function closeTo(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `expected ${expected}, received ${actual}`,
  );
}

test('fit scale shrinks a large scan to the stage and never upscales', () => {
  closeTo(getBookFitScale(landscapeStage), 0.4);
  closeTo(getBookFitScale({ ...landscapeStage, naturalWidth: 100, naturalHeight: 100 }), 1);
});

test('fit scale is zero until the stage and the scan are both measured', () => {
  assert.equal(getBookFitScale({ ...landscapeStage, stageWidth: 0 }), 0);
  assert.equal(getBookFitScale({ ...landscapeStage, naturalHeight: 0 }), 0);
});

test('the page is centered at fit and pans from center by its offset', () => {
  const fitted = getBookPageLayout(1, { x: 0, y: 0 }, landscapeStage);
  closeTo(fitted.width, 400);
  closeTo(fitted.height, 800);
  closeTo(fitted.x, 100);
  closeTo(fitted.y, 0);

  const panned = getBookPageLayout(1, { x: 100, y: 0 }, landscapeStage);
  closeTo(panned.x, 200);
});

test('pan bounds are zero at fit and grow with zoom', () => {
  assert.deepEqual(getBookPanBounds(1, landscapeStage), { x: 0, y: 0 });
  assert.deepEqual(getBookPanBounds(2, landscapeStage), { x: 100, y: 400 });
});

test('offsets are clamped so the page never leaves the stage', () => {
  assert.deepEqual(clampBookOffset({ x: 500, y: -900 }, 2, landscapeStage), { x: 100, y: -400 });
  assert.deepEqual(clampBookOffset({ x: 20, y: 20 }, 1, landscapeStage), { x: 0, y: 0 });
});

test('anchored zoom keeps the page point under the anchor pinned', () => {
  const anchor = { x: 200, y: 400 };
  const before = getBookPageLayout(1, { x: 0, y: 0 }, landscapeStage);
  const offset = getBookZoomOffset(anchor, 1, 2, { x: 0, y: 0 }, landscapeStage);
  const after = getBookPageLayout(2, offset, landscapeStage);

  closeTo((anchor.x - before.x) / before.scale, (anchor.x - after.x) / after.scale);
  closeTo((anchor.y - before.y) / before.scale, (anchor.y - after.y) / after.scale);
});

test('zoom levels stop at Fit and maximum zoom', () => {
  assert.equal(getPreviousBookZoom(BOOK_ZOOM_LEVELS[0]), BOOK_ZOOM_LEVELS[0]);
  assert.equal(getNextBookZoom(BOOK_ZOOM_LEVELS.at(-1)!), BOOK_ZOOM_LEVELS.at(-1));
  assert.equal(isMinimumBookZoom(BOOK_ZOOM_LEVELS[0]), true);
  assert.equal(isMaximumBookZoom(BOOK_ZOOM_LEVELS.at(-1)!), true);
});

test('pinch zoom values stay within the viewer bounds and snap controls outward', () => {
  assert.equal(clampBookZoom(0.5), BOOK_ZOOM_LEVELS[0]);
  assert.equal(clampBookZoom(8), BOOK_ZOOM_LEVELS.at(-1));
  assert.equal(getNextBookZoom(1.6), 2);
  assert.equal(getPreviousBookZoom(1.6), 1.5);
});
