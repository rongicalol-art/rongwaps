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

test('short English queries find meanings rather than substrings or dictionary notes', () => {
  const greetings = searchInIndex(index, 'hi', 10);
  assert.ok(greetings.slice(0, 2).some((word) => word.simplified === '你好'));
  assert.ok(greetings.slice(0, 2).some((word) => word.simplified === '嗨'));
  assert.ok(!greetings.some((word) => ['昰', '他', '这', '妳', '中国'].includes(word.simplified)));
  assert.equal(searchInIndex(index, 'tea', 10)[0].simplified, '茶');
});

test('tone marks, tone numbers and separators find the same pinyin word', () => {
  for (const query of ['nihao', 'ni hao', 'nǐ hǎo', 'ni3 hao3', "ni'hao", ' NǏ  HǍO ']) {
    assert.equal(searchInIndex(index, query, 10)[0]?.simplified, '你好', query);
  }
  for (const query of ['學', '学']) {
    assert.equal(searchInIndex(index, query, 10)[0]?.simplified, '学', query);
  }
});

test('relevance outranks frequency and duplicate entries keep the best meaning', () => {
  const entries: CompactSearchEntry[] = [
    [1, '甲', '', 'jiǎ', 'jia', ['the teacher arrived'], 100],
    [2, '乙', '', 'yǐ', 'yi', ['(noun) teacher; instructor'], 0],
    [3, '丙', '', 'bǐng', 'bing', ['a teacher at school'], 50],
    [4, '丙', '', 'bǐng', 'bing', ['teacher'], 0],
  ];
  assert.deepEqual(searchInIndex(entries, 'teacher').map((word) => word.id), [2, 4, 1]);
});

test('single-word typos are a fallback, never padding for a strong match', () => {
  const entries: CompactSearchEntry[] = [
    [1, '老師', '', 'lǎo shī', 'laoshi', ['teacher'], 20],
    [2, '教', '', 'jiào', 'jiao', ['teach'], 100],
  ];
  for (const query of ['techer', 'teachre', 'teachex', 'teacherr', 'laoshj']) {
    assert.equal(searchInIndex(entries, query)[0]?.id, 1, query);
  }
  assert.deepEqual(searchInIndex(entries, 'teach').map((word) => word.id), [2, 1]);
  assert.deepEqual(searchInIndex(entries, 'hi'), []);
  assert.doesNotThrow(() => searchInIndex(entries, '['));
  assert.deepEqual(searchInIndex(entries, 'teacher', 0), []);
});
