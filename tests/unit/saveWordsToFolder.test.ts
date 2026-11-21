import assert from 'node:assert/strict';
import test from 'node:test';
import { saveWordsToFolder } from '../../src/features/library/saveWordsToFolder';
import { flashcardService } from '../../src/services/flashcardService';
import { useAppStore } from '../../src/store/useAppStore';
import type { UserFlashcard, UserFolder } from '../../src/types/models';

const WORDS = [
  { traditional: '白天', simplified: '白天', pinyin: 'báitiān', translation: 'daytime' },
  { traditional: '幫忙', simplified: '帮忙', pinyin: 'bāngmáng', translation: 'to help out' },
  { traditional: '長', simplified: '长', pinyin: 'zhǎng', translation: 'to grow (taller)' },
];

test('saving a word list makes its folder once and never adds a word the folder already holds', async (t) => {
  const created: UserFlashcard[] = [];
  const madeFolders: UserFolder[] = [];
  t.mock.method(flashcardService, 'createFolder', async (_userId: string, folder: UserFolder) => { madeFolders.push(folder); });
  t.mock.method(flashcardService, 'createFlashcards', async (cards: UserFlashcard[]) => { created.push(...cards); });
  t.mock.method(flashcardService, 'refetchFolderFlashcards', async () => {});
  t.mock.method(flashcardService, 'getCachedFlashcards', () => created);
  useAppStore.setState({ customFolders: [] });
  t.after(() => useAppStore.setState({ customFolders: [] }));

  const folderId = await saveWordsToFolder('user-1', 'TOCFL A1 words', WORDS.slice(0, 2));
  assert.equal(madeFolders.length, 1);
  assert.equal(madeFolders[0].name, 'TOCFL A1 words');
  assert.deepEqual(useAppStore.getState().customFolders.map((folder) => folder.id), [folderId]);
  assert.deepEqual(created.map((card) => [card.traditional, card.simplified, card.pinyin, card.translation, card.folderId, card.userId]), [
    ['白天', '白天', 'báitiān', 'daytime', folderId, 'user-1'],
    ['幫忙', '帮忙', 'bāngmáng', 'to help out', folderId, 'user-1'],
  ]);
  assert.ok(created[0].createdAt > created[1].createdAt, 'newest first keeps the list order');

  // A second visit, with one more word left to learn: same folder, only the new word.
  assert.equal(await saveWordsToFolder('user-1', 'TOCFL A1 words', WORDS), folderId);
  assert.equal(madeFolders.length, 1);
  assert.deepEqual(created.map((card) => card.traditional), ['白天', '幫忙', '長']);

  // Someone else's shared folder of the same name is not ours to fill.
  useAppStore.setState({ customFolders: [{ id: 'shared', name: 'TOCFL A2 words', color: 'blue', role: 'editor' }] });
  const own = await saveWordsToFolder('user-1', 'TOCFL A2 words', WORDS.slice(0, 1));
  assert.notEqual(own, 'shared');
  assert.equal(madeFolders.length, 2);
});
