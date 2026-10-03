import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sanitizeDictionaryDefinitions,
  humanizeCedictMarkup,
  extractCedictReference,
  formatCompactMeaning,
} from '../../src/utils/dictionaryDefinitions';

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

test('humanizeCedictMarkup formats traditional/simplified bracketed pinyin', () => {
  assert.equal(
    humanizeCedictMarkup('variant of 令愛|令爱[ling4 ai4]', 'simplified'),
    'variant of 令爱 (lìng ài)',
  );
  assert.equal(
    humanizeCedictMarkup('variant of 令愛|令爱[ling4 ai4]', 'traditional'),
    'variant of 令愛 (lìng ài)',
  );
  assert.equal(
    humanizeCedictMarkup('used in 令嬡|令嫒[ling4 ai4]', 'simplified'),
    'used in 令嫒 (lìng ài)',
  );
  assert.equal(
    humanizeCedictMarkup('see 丁青縣|丁青县[Ding1 qing1 Xian4]', 'simplified'),
    'see 丁青县 (Dīng qīng Xiàn)',
  );
  assert.equal(
    humanizeCedictMarkup('also written 五胡十六國|五胡十六国', 'simplified'),
    'also written 五胡十六国',
  );
});

test('extractCedictReference extracts relation and target', () => {
  assert.deepEqual(
    extractCedictReference('variant of 令愛|令爱[ling4 ai4]'),
    {
      relation: 'variant of',
      traditional: '令愛',
      simplified: '令爱',
      pinyin: 'lìng ài',
      raw: 'variant of 令愛|令爱[ling4 ai4]',
    },
  );
  assert.deepEqual(
    extractCedictReference('used in 令嬡|令嫒[ling4 ai4]'),
    {
      relation: 'used in',
      traditional: '令嬡',
      simplified: '令嫒',
      pinyin: 'lìng ài',
      raw: 'used in 令嬡|令嫒[ling4 ai4]',
    },
  );
});

test('pure variant definitions are humanized instead of resurrecting raw CEDICT markup', () => {
  const result = sanitizeDictionaryDefinitions(['variant of 令愛|令爱[ling4 ai4]'], { preferredScript: 'simplified' });
  assert.deepEqual(result.definitions, ['variant of 令爱 (lìng ài)']);
  assert.deepEqual(result.measure_words, []);

  const usedInResult = sanitizeDictionaryDefinitions(['used in 令嬡|令嫒[ling4 ai4]'], { preferredScript: 'simplified' });
  assert.deepEqual(usedInResult.definitions, ['used in 令嫒 (lìng ài)']);
});

test('formatCompactMeaning extracts concise meaning without mid-word truncation', () => {
  assert.equal(formatCompactMeaning('woman, girl; female'), 'woman, girl');
  assert.equal(formatCompactMeaning('to love, to like, to be fond of; love, affection'), 'to love');
  assert.equal(formatCompactMeaning('square; direction; side'), 'square');
  assert.equal(formatCompactMeaning(''), '');
});


