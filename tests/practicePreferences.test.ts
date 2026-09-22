import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PREFERENCES,
  selectPracticePreferences,
  usePracticePreferencesStore,
} from '../src/store/usePracticePreferencesStore';

test('example-sentence pinyin is hidden by default', () => {
  assert.equal(DEFAULT_PREFERENCES.hideExamplePinyin, true);
});

test('hideExamplePinyin is part of the persisted practice preferences', () => {
  const selected = selectPracticePreferences(usePracticePreferencesStore.getState());
  assert.equal(selected.hideExamplePinyin, true);
});

test('hideExamplePinyin toggles through updatePreferences', () => {
  const { updatePreferences } = usePracticePreferencesStore.getState();

  updatePreferences({ hideExamplePinyin: false });
  assert.equal(
    selectPracticePreferences(usePracticePreferencesStore.getState()).hideExamplePinyin,
    false,
  );

  updatePreferences({ hideExamplePinyin: true });
  assert.equal(
    selectPracticePreferences(usePracticePreferencesStore.getState()).hideExamplePinyin,
    true,
  );
});

test('character font defaults to rounded (huninn) and accepts the kai option', () => {
  const { updatePreferences } = usePracticePreferencesStore.getState();

  assert.equal(DEFAULT_PREFERENCES.characterFont, 'huninn');
  assert.equal(
    selectPracticePreferences(usePracticePreferencesStore.getState()).characterFont,
    'huninn',
  );

  updatePreferences({ characterFont: 'kai' });
  assert.equal(
    selectPracticePreferences(usePracticePreferencesStore.getState()).characterFont,
    'kai',
  );

  updatePreferences({ characterFont: 'huninn' });
  assert.equal(
    selectPracticePreferences(usePracticePreferencesStore.getState()).characterFont,
    'huninn',
  );
});
