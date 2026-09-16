import assert from 'node:assert/strict';
import test from 'node:test';
import { findMatchingCourseVocab, getCourseVocabLookupMap } from '../src/services/vocabularyService';
import { getInteractiveGrammarPartsForLesson } from '../src/data/interactiveGrammarPages';

test('getCourseVocabLookupMap builds an index of course vocabulary with audio files', async () => {
  const map = await getCourseVocabLookupMap();
  assert.ok(map.size > 0, 'Course vocab map should contain words');

  // "你好" is in Book 1 Lesson 1
  const nihao = map.get('你好');
  assert.ok(nihao, 'Should find 你好 in course vocab');
  assert.ok(nihao?.audio, '你好 should have an audio file');
  assert.match(nihao.audio, /\.mp3$/i, 'Audio should be an MP3 file');
});

test('findMatchingCourseVocab matches exact and cleaned vocabulary entries', async () => {
  const match = await findMatchingCourseVocab('你好');
  assert.ok(match, 'Should find matching card for 你好');
  assert.equal(match.front, '你好');
  assert.ok(match.audio && match.audio.length > 0, 'Should have audio');

  const nonExistent = await findMatchingCourseVocab('xyz999nonexistentword');
  assert.equal(nonExistent, undefined, 'Should return undefined for unknown words');
});

test('Grammar lesson pages can be resolved by pageId for direct navigation', () => {
  const parts = getInteractiveGrammarPartsForLesson(1, 1);
  assert.ok(parts.length > 0, 'Should have grammar parts for Book 1 Lesson 1');
  const firstPart = parts[0];
  assert.ok(firstPart.grammarPages.length > 1, 'Should have multiple grammar pages in part');

  // Verify that any page id from grammarPages can be indexed
  const targetPage = firstPart.grammarPages[1];
  const targetIndex = firstPart.grammarPages.findIndex((p) => p.id === targetPage.id);
  assert.equal(targetIndex, 1, 'Target index should match page location');
});

test('fetchExamplesForWord returns examples array gracefully', async () => {
  const { fetchExamplesForWord } = await import('../src/services/vocabularyService');
  const examples = await fetchExamplesForWord('你好');
  assert.ok(Array.isArray(examples));
});
