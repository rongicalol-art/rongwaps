import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lookupSentenceWord,
  validateSentenceWords,
} from '../../src/services/sentenceLookupService';

test('sentenceLookup: validates known words in batch', async () => {
  const words = ['你好', '謝謝', 'nonexistentwordxyz123'];
  const validSet = await validateSentenceWords(words);

  assert.ok(validSet.has('你好'));
  assert.ok(!validSet.has('nonexistentwordxyz123'));
});

test('sentenceLookup: looks up dictionary word with pinyin and sanitized definitions', async () => {
  const result = await lookupSentenceWord('你好');

  assert.ok(result !== null);
  assert.equal(result.word, '你好');
  assert.ok(result.definitions.length > 0);
  assert.ok(result.pinyin && result.pinyin.length > 0);
});

test('sentenceLookup: decomposes phrase/unlisted compound into character fallback parts', async () => {
  // A phrase or compound with no single dictionary entry (e.g. A-not-A question form)
  const result = await lookupSentenceWord('忙不忙');

  assert.ok(result !== null);
  assert.equal(result.word, '忙不忙');
  // Should decompose into constituent character definitions
  assert.ok(result.fallbackParts && result.fallbackParts.length === 3);
  assert.equal(result.fallbackParts[0].word, '忙');
  assert.equal(result.fallbackParts[1].word, '不');
  assert.equal(result.fallbackParts[2].word, '忙');
  assert.ok(result.fallbackParts[0].definition || result.fallbackParts[0].pinyin);
});

test('sentenceLookup: handles empty or unknown input gracefully', async () => {
  const empty = await lookupSentenceWord('');
  assert.equal(empty, null);

  const unknown = await lookupSentenceWord('𠀀');
  assert.ok(unknown !== null);
  assert.equal(unknown.word, '𠀀');
  assert.equal(unknown.definitions.length, 0);
});
