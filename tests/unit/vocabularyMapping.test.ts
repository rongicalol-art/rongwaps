import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseExamples,
  mapVocabularyRows,
  prepareVocabulary,
} from '../../src/utils/vocabulary/vocabularyMapping';
import { debugLogger } from '../../src/utils/debug/debugLogger';

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

test('vocabularyMapping: plain and empty example strings are normal data, not parse warnings', () => {
  debugLogger.clear();
  assert.deepEqual(parseExamples('我想先換衣服再去運動。'), [{ chinese: '我想先換衣服再去運動。', pinyin: '', english: '' }]);
  assert.deepEqual(parseExamples('   '), []);
  assert.deepEqual(debugLogger.getLogs(), []);

  // A string that claims to be a serialized array but is broken still warns.
  assert.deepEqual(parseExamples('[{"chinese": '), [{ chinese: '[{"chinese": ', pinyin: '', english: '' }]);
  assert.equal(debugLogger.getLogs().length, 1);
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

test('vocabularyMapping: resolves deterministic audio for course cards and respects empty audio', () => {
  const rows = [
    { id: 'B1L01-1-01', traditional: '你好' },
    { id: 'B2L07-2-27', traditional: '阿里山小火車', audio: '' },
    { id: 'custom-1', traditional: '測試', audio: 'custom.mp3' },
  ];
  const mapped = mapVocabularyRows(rows);
  assert.equal(mapped[0].audio, 'modernchinese-B1L01-1-01.mp3');
  assert.equal(mapped[1].audio, '');
  assert.equal(mapped[2].audio, 'custom.mp3');
});
