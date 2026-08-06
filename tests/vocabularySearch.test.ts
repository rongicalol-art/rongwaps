import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeRegExp } from '../src/utils/escapeRegExp';
import { searchVocabulary } from '../src/services/vocabularyService';

test('escapeRegExp neutralizes regex metacharacters', () => {
  assert.equal(escapeRegExp('hello('), 'hello\\(');
  assert.equal(escapeRegExp('a?b'), 'a\\?b');
  assert.equal(escapeRegExp('[x]'), '\\[x\\]');
  assert.equal(escapeRegExp('a*b'), 'a\\*b');
  assert.equal(escapeRegExp('1.5'), '1\\.5');
  assert.equal(escapeRegExp('plain'), 'plain');
});

test('vocabulary search survives a bare metacharacter query without crashing', async () => {
  // The old implementation interpolated the raw query into a RegExp
  // (`\b${lowerQuery}\b`), so a bare `(` produced `\b(\b` → SyntaxError,
  // which the outer catch swallowed into a silent empty result.
  const results = await searchVocabulary('(');
  assert.ok(Array.isArray(results));
  assert.equal(results.length, 0);
});

test('vocabulary search treats metacharacters as literal text, not pattern', async () => {
  // "你好(" does not appear in any card, so the escaped literal match must
  // return an empty array — without throwing a SyntaxError.
  const results = await searchVocabulary('你好(');
  assert.ok(Array.isArray(results));
  assert.equal(results.length, 0);
});

test('vocabulary search still finds real cards after the escape fix', async () => {
  const results = await searchVocabulary('hello');
  assert.ok(Array.isArray(results));
  assert.ok(results.some((card) => card.id === 'b1l1-1'));
});