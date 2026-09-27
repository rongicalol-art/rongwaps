import assert from 'node:assert/strict';
import test from 'node:test';
import {
  migrateLegacyStores,
  LEGACY_GRAMMAR_STORE_KEY,
  LEGACY_PRACTICE_PREFERENCES_KEY,
} from '../src/utils/legacyStoreMigration';
import { getPaceTimings } from '../src/store/slices/practicePreferencesSlice';

test('migrateLegacyStores: loads legacy grammar progress payload', () => {
  const mockStorage: Record<string, string> = {
    [LEGACY_GRAMMAR_STORE_KEY]: JSON.stringify({
      state: {
        startedPartIds: ['b1-l1-p1', 'b1-l1-p2'],
        completedPageIds: ['b1-l1-g1', 'b1-l1-g2'],
        completedPartIds: ['b1-l1-p1'],
      },
      version: 0,
    }),
  };

  const targetState: Record<string, unknown> = {};
  const migrated = migrateLegacyStores(targetState, (k) => mockStorage[k] ?? null);

  assert.equal(migrated, true);
  assert.deepEqual(targetState.startedPartIds, ['b1-l1-p1', 'b1-l1-p2']);
  assert.deepEqual(targetState.completedPageIds, ['b1-l1-g1', 'b1-l1-g2']);
  assert.deepEqual(targetState.completedPartIds, ['b1-l1-p1']);
});

test('migrateLegacyStores: loads legacy practice preferences payload with migrations', () => {
  const mockStorage: Record<string, string> = {
    [LEGACY_PRACTICE_PREFERENCES_KEY]: JSON.stringify({
      state: {
        preset: 'balanced',
        pace: 40,
        autoAdvanceCorrect: false, // old bug where presets pushed this off
        characterFont: 'sans', // removed font option
        focusMode: true, // obsolete flag
        instantChoiceCheck: false, // obsolete flag
        showPinyin: false,
      },
      version: 4,
    }),
  };

  const targetState: Record<string, unknown> = {};
  const migrated = migrateLegacyStores(targetState, (k) => mockStorage[k] ?? null);

  assert.equal(migrated, true);
  assert.equal(targetState.preset, 'balanced');
  assert.equal(targetState.pace, 40);
  assert.equal(targetState.autoAdvanceCorrect, true); // restored by migration
  assert.equal(targetState.characterFont, 'huninn'); // fallback from 'sans'
  assert.equal(targetState.showPinyin, false); // preserved user setting
  assert.equal('focusMode' in targetState, false); // deleted
  assert.equal('instantChoiceCheck' in targetState, false); // deleted
  assert.deepEqual(
    {
      correctDelayMs: targetState.correctDelayMs,
      wrongDelayMs: targetState.wrongDelayMs,
      betweenCardsMs: targetState.betweenCardsMs,
      flowFrontDelayMs: targetState.flowFrontDelayMs,
      flowBackDelayMs: targetState.flowBackDelayMs,
    },
    getPaceTimings(40),
  );
});

test('migrateLegacyStores: does not overwrite existing target state', () => {
  const mockStorage: Record<string, string> = {
    [LEGACY_GRAMMAR_STORE_KEY]: JSON.stringify({
      state: {
        startedPartIds: ['legacy-part'],
        completedPageIds: ['legacy-page'],
        completedPartIds: ['legacy-part'],
      },
    }),
    [LEGACY_PRACTICE_PREFERENCES_KEY]: JSON.stringify({
      state: {
        preset: 'sprint',
      },
    }),
  };

  const targetState: Record<string, unknown> = {
    completedPageIds: ['new-page'],
    preset: 'comfortable',
  };

  const migrated = migrateLegacyStores(targetState, (k) => mockStorage[k] ?? null);
  assert.equal(migrated, false);
  assert.deepEqual(targetState.completedPageIds, ['new-page']);
  assert.equal(targetState.startedPartIds, undefined);
  assert.equal(targetState.preset, 'comfortable');
});
