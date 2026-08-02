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
    { definitions: ['book'], measure_words: ['本[ben3]'] },
  );
});
