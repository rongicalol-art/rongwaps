import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import {
  searchInIndex,
  searchDictionaryOffline,
  type CompactSearchEntry,
} from '../../src/services/dictionarySearchService';
import { stemEnglishWord } from '../../src/utils/vocabulary/englishStem';

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

test('searchInIndex matches morphological derivations and inflections like procrastination and laziness', () => {
  assert.equal(stemEnglishWord('procrastination'), stemEnglishWord('procrastinate'));
  assert.equal(stemEnglishWord('laziness'), stemEnglishWord('lazy'));
  assert.equal(stemEnglishWord('went'), stemEnglishWord('go'));
  assert.equal(stemEnglishWord('swimming'), stemEnglishWord('swim'));

  const procResults = searchInIndex(index, 'procrastination', 10);
  const procWords = procResults.map((r) => r.simplified);
  assert.ok(
    procWords.includes('拖延症') && procWords.includes('拖延'),
    `Expected 拖延症 and 拖延 in top procrastination results, got: ${procWords.join(', ')}`,
  );
  assert.equal(procResults[0]?.simplified, '拖延症');

  const lazyResults = searchInIndex(index, 'laziness', 10);
  const lazyWords = lazyResults.map((r) => r.simplified);
  assert.ok(
    lazyWords.includes('懒') && lazyWords.includes('懒惰'),
    `Expected 懒 and 懒惰 in top laziness results, got: ${lazyWords.join(', ')}`,
  );

  const wentResults = searchInIndex(index, 'went', 5);
  assert.equal(wentResults[0]?.simplified, '去');
});

test('searchInIndex expands semantic and colloquial English synonyms', () => {
  const slacker = searchInIndex(index, 'slacker', 10).map((r) => r.simplified);
  assert.ok(slacker.includes('懒') || slacker.includes('懒惰'), `Expected slacker to find 懒/懒惰, got: ${slacker.join(', ')}`);

  const dawdle = searchInIndex(index, 'dawdle', 10).map((r) => r.simplified);
  assert.ok(dawdle.includes('拖延') || dawdle.includes('延迟'), `Expected dawdle to find 拖延/延迟, got: ${dawdle.join(', ')}`);

  const brag = searchInIndex(index, 'bragging', 10).map((r) => r.simplified);
  assert.ok(brag.includes('吹嘘') || brag.includes('吹牛') || brag.includes('夸耀'), `Expected bragging to find 吹嘘/吹牛/夸耀, got: ${brag.join(', ')}`);
});

test('searchInIndex supports Pleco-style wildcards (* and ?) for Chinese and Pinyin', () => {
  const syndromeMatches = searchInIndex(index, '*症', 20).map((r) => r.simplified);
  assert.ok(syndromeMatches.includes('拖延症'), `Expected *症 wildcard to find 拖延症, got: ${syndromeMatches.join(', ')}`);

  const idiomPattern = searchInIndex(index, '不?不?', 20).map((r) => r.simplified);
  assert.ok(
    idiomPattern.every((w) => Array.from(w).length === 4 && w[0] === '不' && w[2] === '不'),
    `Expected 不?不? to match 4-char 不X不Y idioms, got: ${idiomPattern.join(', ')}`,
  );
});

test('searchInIndex filters by explicit Pinyin tone numbers and supports Mixed Hanzi+English/Pinyin queries', () => {
  const ma3 = searchInIndex(index, 'ma3', 10);
  assert.ok(ma3.length > 0, 'Expected matches for ma3');
  assert.ok(
    ma3.every((r) => /[ǎǒěǐǔǚ]/.test(r.pinyin_accented)),
    `Expected all ma3 results to have 3rd tone, got: ${ma3.map((r) => r.pinyin_accented).join(', ')}`,
  );

  const mixed = searchInIndex(index, '心 anxious', 10).map((r) => r.simplified);
  assert.ok(mixed.includes('担心'), `Expected mixed query "心 anxious" to find 担心, got: ${mixed.join(', ')}`);
});

test('searchInIndex returns matching results for Pinyin queries and Jianpin initials', () => {
  const results = searchInIndex(index, 'nihao', 10);
  assert.ok(results.length > 0, 'Expected matches for "nihao"');
  assert.equal(results[0].simplified, '你好');
  assert.equal(results[0].match_type, 'exact');

  const jianpin = searchInIndex(index, 'tyz', 10);
  assert.ok(
    jianpin.some((r) => r.simplified === '拖延症'),
    'Expected Jianpin initialism "tyz" to find 拖延症',
  );
});

test('searchInIndex matches prefix for Chinese characters', () => {
  const results = searchInIndex(index, '学', 10);
  assert.ok(results.length > 0, 'Expected matches for "学"');
  assert.ok(
    results.some((r) => r.simplified.startsWith('学') || r.simplified === '学'),
    'Expected prefix or exact match for 学',
  );
});

test('searchDictionaryOffline gracefully handles empty queries and segments multi-word Chinese clauses', async () => {
  const empty = await searchDictionaryOffline('');
  assert.deepEqual(empty, []);

  const segmented = await searchDictionaryOffline('我有拖延症', 10);
  const words = segmented.map((r) => r.simplified);
  assert.ok(
    words.includes('拖延症') || words.includes('拖延'),
    `Expected phrase segmentation to extract 拖延症 from 我有拖延症, got: ${words.join(', ')}`,
  );
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
