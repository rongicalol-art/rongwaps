import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resetClearedBooksForTesting, useLessonSelection } from '../../src/screens/curriculum/hooks/useLessonSelection';
import type { LessonPartSelectionMap } from '../../src/types/models';

test.beforeEach(() => {
  resetClearedBooksForTesting();
});

const PARTS_BY_LESSON: Record<number, number[]> = {
  1: [1, 2, 3],
  2: [1, 2],
  4: [1],
};

function harness(
  initial: LessonPartSelectionMap,
  activeBookId: number,
  defaultId: number | null,
) {
  let map = initial;
  const writes: LessonPartSelectionMap[] = [];
  const setSelectedLessonParts = (
    parts: LessonPartSelectionMap | ((prev: LessonPartSelectionMap) => LessonPartSelectionMap),
  ) => {
    map = typeof parts === 'function' ? parts(map) : parts;
    writes.push(map);
  };

  let selection: ReturnType<typeof useLessonSelection> | undefined;
  function Harness() {
    selection = useLessonSelection({
      activeBookId,
      defaultId,
      selectedLessonParts: map,
      availablePartsByLesson: PARTS_BY_LESSON,
      setSelectedLessonParts,
    });
    return null;
  }

  const render = () => {
    renderToStaticMarkup(createElement(Harness));
    assert.ok(selection);
    return selection;
  };

  return { render, writes, map: () => map };
}

test('lesson selection follows the saved deck for the active book', () => {
  const saved = { '1:2': [1, 2], '1:4': [1], '2:7': [1, 2, 3] };

  assert.deepEqual(harness(saved, 1, 1).render().selectedIds, [2, 4]);
  assert.deepEqual(harness(saved, 2, 3).render().selectedIds, [7]);
  assert.deepEqual(harness({}, 3, 5).render().selectedIds, [5]);
});

test('toggling a lesson persists only the active book with all of its parts', () => {
  const h = harness({ '1:2': [1], '1:4': [1], '2:7': [1] }, 1, 1);
  h.render().toggle(4);

  assert.deepEqual(h.map(), {
    '2:7': [1],
    '1:2': [1, 2],
  });
});

test('cancelling returns to the book default lesson', () => {
  const h = harness({ '1:2': [1, 2], '1:4': [1], '2:7': [1] }, 1, 1);
  h.render().exit();

  assert.deepEqual(h.map(), {
    '2:7': [1],
    '1:1': [1, 2, 3],
  });
});

test('toggling includes and excludes lessons in multi-select', () => {
  const h = harness({ '1:1': [1, 2, 3] }, 1, 1);
  h.render().toggle(2);
  assert.deepEqual(h.map(), {
    '1:1': [1, 2, 3],
    '1:2': [1, 2],
  });

  h.render().toggle(4);
  assert.deepEqual(h.map(), {
    '1:1': [1, 2, 3],
    '1:2': [1, 2],
    '1:4': [1],
  });
});

test('toggling off the only selected lesson clears selection and hides dock count', () => {
  const h = harness({ '1:2': [1] }, 1, 1);
  assert.deepEqual(h.render().selectedIds, [2]);
  assert.equal(h.render().isSelecting, true);

  h.render().toggle(2);
  assert.deepEqual(h.map(), {});
  assert.deepEqual(h.render().selectedIds, []);
  assert.equal(h.render().isSelecting, false);
});
