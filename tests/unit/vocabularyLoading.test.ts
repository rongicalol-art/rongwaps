import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchVocabulary, searchVocabulary } from '../../src/services/vocabularyService';
import { vocabularyCache } from '../../src/utils/cache';

test('concurrent vocabulary and search reads share their prepared result, then reuse it', async () => {
  vocabularyCache.clear();
  const [first, second] = await Promise.all([fetchVocabulary(1, 1), fetchVocabulary(1, 1)]);
  assert.ok(first.length > 0);
  assert.ok(first.every((card) => card.bookId === 1 && card.lessonId === 1));
  assert.strictEqual(first, second);
  assert.strictEqual(await fetchVocabulary(1, 1), first);

  const [a, b] = await Promise.all([searchVocabulary('hello'), searchVocabulary('hello')]);
  assert.ok(a.length > 0);
  assert.strictEqual(a, b);
  assert.strictEqual(await searchVocabulary('hello'), a);
  assert.deepEqual(await fetchVocabulary(999), []);
});
