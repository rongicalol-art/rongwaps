import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PREFERENCES,
  selectPracticePreferences,
  useAppStore,
} from '../../src/store/useAppStore';

test('example-sentence pinyin is hidden by default', () => {
  assert.equal(DEFAULT_PREFERENCES.hideExamplePinyin, true);
});

test('hideExamplePinyin is part of the persisted practice preferences', () => {
  const selected = selectPracticePreferences(useAppStore.getState());
  assert.equal(selected.hideExamplePinyin, true);
});

test('hideExamplePinyin toggles through updatePreferences', () => {
  const { updatePreferences } = useAppStore.getState();

  updatePreferences({ hideExamplePinyin: false });
  assert.equal(
    selectPracticePreferences(useAppStore.getState()).hideExamplePinyin,
    false,
  );

  updatePreferences({ hideExamplePinyin: true });
  assert.equal(
    selectPracticePreferences(useAppStore.getState()).hideExamplePinyin,
    true,
  );
});

test('character font defaults to rounded (huninn) and accepts the kai option', () => {
  const { updatePreferences } = useAppStore.getState();

  assert.equal(DEFAULT_PREFERENCES.characterFont, 'huninn');
  assert.equal(
    selectPracticePreferences(useAppStore.getState()).characterFont,
    'huninn',
  );

  updatePreferences({ characterFont: 'kai' });
  assert.equal(
    selectPracticePreferences(useAppStore.getState()).characterFont,
    'kai',
  );

  updatePreferences({ characterFont: 'huninn' });
  assert.equal(
    selectPracticePreferences(useAppStore.getState()).characterFont,
    'huninn',
  );
});
