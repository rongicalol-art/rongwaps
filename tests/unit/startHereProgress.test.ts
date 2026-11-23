import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore } from 'zustand/vanilla';
import { createLessonProgressSlice, type LessonProgressState } from '../../src/store/slices/lessonProgressSlice';
import { mergeLessonProgress } from '../../src/utils/lesson/lessonCompletion';
import { buildMetadataPayload } from '../../src/utils/sync/cloudSyncTransforms';

test('Start Here completion is ordered, idempotent and resettable', () => {
  const { getState } = createStore<LessonProgressState>(createLessonProgressSlice);
  const actions = getState();
  assert.deepEqual(actions.startHereCompletedLessons, []);
  assert.equal(actions.startHerePassed, false);

  for (const id of [24, 1, 9, 9, 0, 25, 2.5, NaN, Infinity]) actions.markStartHereLessonDone(id);
  assert.deepEqual(getState().startHereCompletedLessons, [1, 9, 24]);
  assert.equal(getState().startHerePassed, false);

  actions.markStartHerePassed();
  actions.markStartHerePassed();
  assert.equal(getState().startHerePassed, true);
  assert.deepEqual(getState().startHereCompletedLessons, [1, 9, 24]);

  actions.resetLessonProgress();
  assert.deepEqual(getState().startHereCompletedLessons, []);
  assert.equal(getState().startHerePassed, false);

  actions.markStartHerePassed();
  assert.equal(getState().startHerePassed, true);
  assert.deepEqual(getState().startHereCompletedLessons, []);
});

test('Start Here merges lesson completion by union and Ready check success by OR', () => {
  const base = { readReadingIds: [], lessonDoneMarks: {} };
  const local = { ...base, startHereCompletedLessons: [2, 7], startHerePassed: false };
  const remote = { startHereCompletedLessons: [24, 2, 4, 4, 0, 25, 3.5, '6', null], startHerePassed: true };
  const merged = mergeLessonProgress(local, remote);
  assert.deepEqual(merged, { startHereCompletedLessons: [2, 4, 7, 24], startHerePassed: true });
  assert.deepEqual(local.startHereCompletedLessons, [2, 7]);
  assert.deepEqual(mergeLessonProgress({ ...local, ...merged }, { ...remote, startHerePassed: false }), {});
  assert.deepEqual(mergeLessonProgress(local, { startHereCompletedLessons: '7', startHerePassed: 'true' }), {});
  assert.deepEqual(mergeLessonProgress(base, { startHereCompletedLessons: [1], startHerePassed: true }), {
    startHereCompletedLessons: [1], startHerePassed: true,
  });
});

test('cloud metadata includes only the Start Here fields with progress', () => {
  const base: Parameters<typeof buildMetadataPayload>[0] = {
    activeBookId: 1, characterPreference: 'traditional', favorites: [], selectedBooks: [1], selectedLessonParts: {},
    startedPartIds: [], completedPartIds: [], completedPageIds: [],
  };
  for (const progress of [base, { ...base, startHereCompletedLessons: [], startHerePassed: false }]) {
    const { grammarProgress } = buildMetadataPayload(progress);
    assert.equal(Object.hasOwn(grammarProgress, 'startHereCompletedLessons'), false);
    assert.equal(Object.hasOwn(grammarProgress, 'startHerePassed'), false);
  }

  const completed = buildMetadataPayload({ ...base, startHereCompletedLessons: [2, 4] });
  assert.deepEqual(completed.grammarProgress.startHereCompletedLessons, [2, 4]);
  assert.equal(Object.hasOwn(completed.grammarProgress, 'startHerePassed'), false);

  const passed = buildMetadataPayload({ ...base, startHerePassed: true });
  assert.equal(passed.grammarProgress.startHerePassed, true);
  assert.equal(Object.hasOwn(passed.grammarProgress, 'startHereCompletedLessons'), false);

  const both = buildMetadataPayload({ ...base, startHereCompletedLessons: [2, 4], startHerePassed: true });
  assert.deepEqual(both.grammarProgress.startHereCompletedLessons, [2, 4]);
  assert.equal(both.grammarProgress.startHerePassed, true);
});
