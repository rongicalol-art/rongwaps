import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import {
  searchInIndex,
  searchDictionaryOffline,
  type CompactSearchEntry,
} from '../../src/services/dictionarySearchService';

const searchData = readJson<{ items: CompactSearchEntry[] }>('public/data/search/dictionary-search-index.json');
const index = searchData.items;

test('searchInIndex handles empty or whitespace queries gracefully', () => {
  const empty = searchInIndex(index, '');
  assert.deepEqual(empty, []);

  const spaces = searchInIndex(index, '   ');
  assert.deepEqual(spaces, []);
});

test('searchInIndex returns matching results for English queries', () => {
  const results = searchInIndex(index, 'teacher', 10);
  assert.ok(results.length > 0, 'Expected matches for "teacher"');

  const topMatches = results.map((r) => r.simplified);
  assert.ok(
    topMatches.includes('老师') || topMatches.includes('先生') || topMatches.includes('教师'),
    `Expected common Chinese translations for teacher in top matches, got: ${topMatches.join(', ')}`,
  );
});

test('searchInIndex returns matching results for Pinyin queries', () => {
  const results = searchInIndex(index, 'nihao', 10);
  assert.ok(results.length > 0, 'Expected matches for "nihao"');
  assert.equal(results[0].simplified, '你好');
  assert.equal(results[0].match_type, 'exact');
});

test('searchInIndex matches prefix for Chinese characters', () => {
  const results = searchInIndex(index, '学', 10);
  assert.ok(results.length > 0, 'Expected matches for "学"');
  assert.ok(
    results.some((r) => r.simplified.startsWith('学') || r.simplified === '学'),
    'Expected prefix or exact match for 学',
  );
});

test('searchDictionaryOffline gracefully handles empty queries in any environment', async () => {
  const empty = await searchDictionaryOffline('');
  assert.deepEqual(empty, []);
});
