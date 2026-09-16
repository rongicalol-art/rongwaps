import assert from 'node:assert/strict';
import test from 'node:test';
import { selectIsActivityOverlayOpen, useAppStore } from '../src/store/useAppStore';

/**
 * The in-activity overlay-source contract. Every surface that paints above the
 * practice dock registers its own named source, and the dock reads the union.
 *
 * This is the regression the state-management audit fixed: the store used to
 * hold one `isOverlayOpen` boolean written by four owners (app shell, study
 * settings, character breakdown, dictionary word detail), so the last writer
 * won and an overlay closing on the way out cleared an overlay that another
 * surface still had open. The shell's share is now a prop from `App.tsx`; the
 * remaining two sources are registered here.
 */
test('activity overlay sources are independent and their union is derived', () => {
  const store = useAppStore;
  store.setState({ activityOverlaySources: [] });

  const isAnyOpen = () => selectIsActivityOverlayOpen(store.getState());
  const setOpen = store.getState().setActivityOverlayOpen;

  assert.equal(isAnyOpen(), false);

  setOpen('practice-settings', true);
  setOpen('character-breakdown', true);
  assert.equal(isAnyOpen(), true);

  // The case the old shared boolean got wrong: closing one open source must
  // not clear another that is still open.
  setOpen('practice-settings', false);
  assert.equal(isAnyOpen(), true);
  assert.deepEqual(store.getState().activityOverlaySources, ['character-breakdown']);

  setOpen('character-breakdown', false);
  assert.equal(isAnyOpen(), false);
  assert.deepEqual(store.getState().activityOverlaySources, []);
});

test('registering a source twice stores it once, and closing an unopened one is a no-op', () => {
  const store = useAppStore;
  store.setState({ activityOverlaySources: [] });

  const setOpen = store.getState().setActivityOverlayOpen;

  setOpen('character-breakdown', true);
  setOpen('character-breakdown', true);
  assert.deepEqual(store.getState().activityOverlaySources, ['character-breakdown']);

  setOpen('practice-settings', false);
  assert.deepEqual(store.getState().activityOverlaySources, ['character-breakdown']);

  store.setState({ activityOverlaySources: [] });
});
