import assert from 'node:assert/strict';
import test from 'node:test';
import type { LessonPartSelectionMap } from '../src/types/models';
import {
  getSelectedLessonIds,
  lessonsToPartSelection,
  migrateLegacyLessonSelection,
} from '../src/utils/lessonPartSelection';

test('lessonsToPartSelection keys lessons under the given book with part 1', () => {
  assert.deepEqual(lessonsToPartSelection(2, [3, 1]), { '2:3': [1], '2:1': [1] });
  assert.deepEqual(lessonsToPartSelection(2, []), {});
});

test('migrateLegacyLessonSelection seeds an empty parts map from the legacy list', () => {
  const state: Record<string, unknown> = {
    activeBookId: 2,
    selectedLessons: [3, 1],
    selectedLessonParts: {},
  };
  migrateLegacyLessonSelection(state);
  assert.deepEqual(state.selectedLessonParts, { '2:3': [1], '2:1': [1] });
  assert.equal('selectedLessons' in state, false);
});

test('migrateLegacyLessonSelection never overwrites an existing parts map', () => {
  const state: Record<string, unknown> = {
    activeBookId: 2,
    selectedLessons: [3],
    selectedLessonParts: { '2:5': 'all' },
  };
  migrateLegacyLessonSelection(state);
  assert.deepEqual(state.selectedLessonParts, { '2:5': 'all' });
  assert.equal('selectedLessons' in state, false);
});

test('migrateLegacyLessonSelection tolerates missing or malformed fields', () => {
  const empty: Record<string, unknown> = {};
  migrateLegacyLessonSelection(empty);
  assert.deepEqual(empty.selectedLessonParts, {});
  assert.equal('selectedLessons' in empty, false);

  const malformed: Record<string, unknown> = {
    selectedLessons: ['x', null, 2],
    selectedLessonParts: { bogus: 42, '1:2': [3] },
  };
  migrateLegacyLessonSelection(malformed);
  // '2' survives sanitization of the ids, but the map is non-empty so no
  // seeding happens; the valid keyed entry is kept.
  assert.deepEqual(malformed.selectedLessonParts, { '1:2': [3] });
});

test('migrated state resolves through the derived lesson list', () => {
  const parts: LessonPartSelectionMap = { '1:4': [1], '1:2': 'all' };
  assert.deepEqual(getSelectedLessonIds(parts, 1), [2, 4]);
  assert.deepEqual(getSelectedLessonIds(parts, 2), []);
});
