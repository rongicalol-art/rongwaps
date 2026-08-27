import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOK_ZOOM_LEVELS,
  clampBookZoom,
  getFittedPageSize,
  getNextBookZoom,
  getPreviousBookZoom,
  isMaximumBookZoom,
  isMinimumBookZoom,
} from '../src/screens/grammar-lesson/utils/bookViewerLayout';

test('fits a portrait page inside a wide stage with whole-pixel dimensions', () => {
  assert.deepEqual(getFittedPageSize({
    stageWidth: 1280,
    stageHeight: 720,
    naturalWidth: 1302,
    naturalHeight: 1800,
  }), { width: 486, height: 672 });
});

test('fits a portrait page inside a narrow mobile stage', () => {
  assert.deepEqual(getFittedPageSize({
    stageWidth: 390,
    stageHeight: 844,
    naturalWidth: 1302,
    naturalHeight: 1800,
  }), { width: 342, height: 473 });
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
