import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseExamples,
  mapVocabularyRows,
  prepareVocabulary,
} from '../src/utils/vocabularyMapping';

test('vocabularyMapping: parseExamples parses string, json string, and array examples', () => {
  assert.deepEqual(parseExamples('Single sentence'), [{ chinese: 'Single sentence', pinyin: '', english: '' }]);
  assert.deepEqual(
    parseExamples(JSON.stringify([{ chinese: '你好', pinyin: 'nǐ hǎo', english: 'hello' }])),
    [{ chinese: '你好', pinyin: 'nǐ hǎo', english: 'hello' }],
  );
  assert.deepEqual(
    parseExamples([{ chinese: '你好', pinyin: 'nǐ hǎo', english: 'hello' }]),
    [{ chinese: '你好', pinyin: 'nǐ hǎo', english: 'hello' }],
  );
  assert.deepEqual(parseExamples(null), []);
  assert.deepEqual(parseExamples(''), []);
});

test('vocabularyMapping: mapVocabularyRows and prepareVocabulary maps and filters', () => {
  const rawRows = [
    { id: 'b1l02-01', traditional: '學生', meaning: 'student', pinyin: 'xuéshēng' },
    { id: 'b1l01-01', traditional: '你好', meaning: 'hello', pinyin: 'nǐ hǎo' },
  ];

  const mapped = mapVocabularyRows(rawRows);
  assert.equal(mapped.length, 2);
  assert.equal(mapped[0].front, '學生');

  const prepared = prepareVocabulary(rawRows);
  assert.equal(prepared.length, 2);
  // Canonical sort by id
  assert.equal(prepared[0].id, 'b1l01-01');
  assert.equal(prepared[1].id, 'b1l02-01');

  // Filter by lesson
  const filtered = prepareVocabulary(rawRows, 1);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'b1l01-01');
});
