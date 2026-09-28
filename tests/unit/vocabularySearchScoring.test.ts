import assert from 'node:assert/strict';
import test from 'node:test';
import { getSmartScore } from '../../src/utils/vocabularySearchScoring';
import type { Flashcard } from '../../src/data/flashcards';

const mockCard: Flashcard = {
  id: 'b1l01-01',
  front: '你好',
  back: 'hello; hi',
  pinyin: 'nǐ hǎo',
  bookId: 1,
  lessonId: 1,
};

test('vocabularySearchScoring: exact Chinese match scores highest', () => {
  const scoreExact = getSmartScore(mockCard, '你好', '你好', 'ni hao');
  const scorePrefix = getSmartScore(mockCard, '你', '你', 'ni');
  assert.ok(scoreExact > scorePrefix);
  assert.ok(scoreExact >= 10000);
});

test('vocabularySearchScoring: exact definition match scores high', () => {
  const scoreEnglish = getSmartScore(mockCard, 'hello', 'hello', 'hello');
  assert.ok(scoreEnglish >= 4000);
});

test('vocabularySearchScoring: unrelated query scores 0', () => {
  const scoreNone = getSmartScore(mockCard, '再見', '再見', 'zai jian');
  assert.equal(scoreNone, 0);
});
