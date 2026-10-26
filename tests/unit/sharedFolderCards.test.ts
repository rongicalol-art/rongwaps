import test from 'node:test';
import assert from 'node:assert/strict';
import { flashcardsToSharedFolderJson, generateSharedFolderSlug, sharedFolderCardsFromJson } from '../../src/utils/vocabulary/sharedFolderCards';
import type { UserFlashcard } from '../../src/types/models';

test('shared folder card JSON round trips supported fields', () => {
  const card: UserFlashcard = {
    id: 'card-1', folderId: 'folder-1', userId: 'user-1', createdAt: 1,
    simplified: '苹果', traditional: '蘋果', pinyin: 'píngguǒ', translation: 'apple',
    notes: 'fruit', measure_words: ['個', '斤'],
  };
  assert.deepEqual(sharedFolderCardsFromJson(flashcardsToSharedFolderJson([card])), [{
    simplified: '苹果', traditional: '蘋果', pinyin: 'píngguǒ', translation: 'apple', notes: 'fruit', measureWords: ['個', '斤'],
  }]);
});

test('malformed shared card JSON entries are dropped and strings are bounded/coerced', () => {
  const cards = sharedFolderCardsFromJson([
    null,
    'bad',
    { simplified: '词', translation: 12, pinyin: true, notes: 'n'.repeat(2100), measureWords: ['個', null] },
    { simplified: 'missing translation' },
  ]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].translation, '12');
  assert.equal(cards[0].pinyin, 'true');
  assert.equal(cards[0].notes.length, 2000);
  assert.deepEqual(cards[0].measureWords, ['個']);
});

test('shared folder slugs are ten URL-safe characters', () => {
  const slug = generateSharedFolderSlug();
  assert.match(slug, /^[A-Za-z0-9_-]{10}$/);
});
