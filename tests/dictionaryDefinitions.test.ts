import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeDictionaryDefinitions } from '../src/utils/dictionaryDefinitions';

test('serialized definition arrays render as learner-facing meanings', () => {
  assert.deepEqual(
    sanitizeDictionaryDefinitions('["hello; hi", "greetings"]'),
    { definitions: ['hello; hi', 'greetings'], measure_words: [] },
  );
});

test('definition cleanup extracts measure words and removes metadata', () => {
  assert.deepEqual(
    sanitizeDictionaryDefinitions(['book; CL:本[ben3]', 'book (coll.)']),
    { definitions: ['book'], measure_words: ['本'] },
  );
});

test('paren-wrapped classifiers are removed without leaving stray brackets', () => {
  assert.deepEqual(
    sanitizeDictionaryDefinitions(['dream (CL:場|场[chang2])']),
    { definitions: ['dream'], measure_words: ['場'] },
  );
  assert.deepEqual(
    sanitizeDictionaryDefinitions(['dream (CL:場|场[chang2], 场次)']),
    { definitions: ['dream'], measure_words: ['場', '场次'] },
  );
});

test('standalone classifier definitions are dropped entirely', () => {
  const result = sanitizeDictionaryDefinitions(['CL:個|个[ge4]', 'opportunity']);
  assert.deepEqual(result.definitions, ['opportunity']);
  assert.deepEqual(result.measure_words, ['個']);
});

test('preferred script selects the simplified side of a classifier pair', () => {
  const result = sanitizeDictionaryDefinitions(['dream (CL:場|场[chang2])'], { preferredScript: 'simplified' });
  assert.deepEqual(result.measure_words, ['场']);
});

test('unbalanced parentheses left by removals are tidied away', () => {
  const result = sanitizeDictionaryDefinitions(['(bound form) to dream CL:場|场[chang2])']);
  assert.deepEqual(result.definitions, ['(bound form) to dream']);
});

test('a lone classifier string sanitizes to nothing instead of resurrecting', () => {
  const result = sanitizeDictionaryDefinitions('CL:個|个[ge4]');
  assert.deepEqual(result, { definitions: [], measure_words: ['個'] });
});
