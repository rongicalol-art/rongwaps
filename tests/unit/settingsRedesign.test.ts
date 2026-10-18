import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterAppearanceSection, type CharacterAppearanceSectionProps } from '../../src/features/practice/settings/CharacterAppearanceSection';
import type { AppSettingsDrawerProps } from '../../src/app/components/AppSettingsDrawer';
import type { PracticeSettingsScreenProps } from '../../src/features/practice/components/PracticeSettingsScreen';

// Compile-time contracts: callers can no longer supply either script prop.
type HasScriptProp<T> = 'characterPreference' extends keyof T ? true : 'onCharacterPreferenceChange' extends keyof T ? true : false;
const scriptPropsRemoved: [HasScriptProp<AppSettingsDrawerProps>, HasScriptProp<PracticeSettingsScreenProps>, HasScriptProp<CharacterAppearanceSectionProps>] = [false, false, false];

test('settings interfaces no longer expose script selection', () => {
  assert.deepEqual(scriptPropsRemoved, [false, false, false]);
});

test('study character settings retain both fonts without offering a script choice', () => {
  for (const characterFont of ['huninn', 'kai'] as const) {
    const html = renderToStaticMarkup(createElement(CharacterAppearanceSection, {
      characterFont,
      onCharacterFontChange: () => {},
    }));
    assert.match(html, /role="radiogroup" aria-label="Character font"/);
    assert.match(html, /學/);
    assert.match(html, characterFont === 'huninn' ? /Rounded/ : /Kai/);
    assert.doesNotMatch(html, /Simplified|Traditional|Character script|>Script</);
  }
});
