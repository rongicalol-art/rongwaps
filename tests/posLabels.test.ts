import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPosLabel,
  getPosCategory,
  getPosChineseTerm,
  getPosExplanation,
} from '../src/utils/posLabels';

test('formatPosLabel expands common part-of-speech tags', () => {
  assert.equal(formatPosLabel('N'), 'Noun');
  assert.equal(formatPosLabel('V'), 'Verb');
  assert.equal(formatPosLabel('Vs'), 'Stative verb');
  assert.equal(formatPosLabel('V-sep'), 'Separable verb');
  assert.equal(formatPosLabel('Adv'), 'Adverb');
  assert.equal(formatPosLabel('M'), 'Measure word');
  assert.equal(formatPosLabel('Prep'), 'Preposition');
  assert.equal(formatPosLabel('Name'), 'Proper noun');
});

test('formatPosLabel joins compound tags with a slash', () => {
  assert.equal(formatPosLabel('N/M'), 'Noun / Measure word');
  assert.equal(formatPosLabel('Vst/Prep'), 'Stative verb / Preposition');
  assert.equal(formatPosLabel('V-sep/N'), 'Separable verb / Noun');
});

test('formatPosLabel trims whitespace and handles unknown codes', () => {
  assert.equal(formatPosLabel('  N  '), 'Noun');
  assert.equal(formatPosLabel('XYZ'), 'XYZ');
});

test('formatPosLabel returns null for missing or empty tags', () => {
  assert.equal(formatPosLabel(undefined), null);
  assert.equal(formatPosLabel(null), null);
  assert.equal(formatPosLabel(''), null);
  assert.equal(formatPosLabel('   '), null);
});

test('getPosCategory maps codes to word-class families', () => {
  assert.equal(getPosCategory('N'), 'noun');
  assert.equal(getPosCategory('Name'), 'noun');
  assert.equal(getPosCategory('V'), 'verb');
  assert.equal(getPosCategory('V-sep'), 'verb');
  assert.equal(getPosCategory('Vs'), 'stative');
  assert.equal(getPosCategory('M'), 'measure');
  assert.equal(getPosCategory('Adv'), 'adverb');
  assert.equal(getPosCategory('Ptc'), 'function');
  assert.equal(getPosCategory('XYZ'), 'other');
  assert.equal(getPosCategory(undefined), 'other');
});

test('getPosCategory resolves compound tags from their first code', () => {
  assert.equal(getPosCategory('N/M'), 'noun');
  assert.equal(getPosCategory('Vst/Prep'), 'stative');
  assert.equal(getPosCategory('V-sep/N'), 'verb');
});

test('getPosExplanation returns learner-friendly copy', () => {
  const nounExplanation = getPosExplanation('N');
  assert.ok(nounExplanation.length > 20);
  assert.match(nounExplanation, /teacher|school|person/i);
  assert.ok(getPosExplanation('XYZ').length > 0);
  assert.ok(getPosExplanation(null).length > 0);
});

test('getPosExplanation follows the script preference', () => {
  // Default (traditional, matching the app) renders traditional forms.
  assert.match(getPosExplanation('N'), /老師/);
  assert.match(getPosExplanation('N'), /學校/);
  assert.doesNotMatch(getPosExplanation('N'), /老师/);
  // Explicit simplified renders simplified forms.
  assert.match(getPosExplanation('N', 'simplified'), /老师/);
  assert.match(getPosExplanation('N', 'simplified'), /学校/);
  assert.doesNotMatch(getPosExplanation('N', 'simplified'), /老師/);
  // Explanations without script-specific tokens stay unchanged.
  assert.equal(getPosExplanation('V'), getPosExplanation('V', 'simplified'));
  // Unknown tokens degrade to their simplified form rather than the placeholder.
  assert.doesNotMatch(getPosExplanation('XYZ'), /\{zh:/);
});

test('getPosChineseTerm returns the Chinese term when known', () => {
  assert.equal(getPosChineseTerm('N'), '名词');
  assert.equal(getPosChineseTerm('Vs'), '形容词');
  assert.equal(getPosChineseTerm('XYZ'), null);
  assert.equal(getPosChineseTerm(undefined), null);
});
