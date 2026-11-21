import { flashcardService } from '../../services/flashcardService';
import { useAppStore } from '../../store/useAppStore';
import type { UserFlashcard } from '../../types/models';
import { isFolderOwner } from '../../utils/vocabulary/folderCollaboration';
import { createLibraryFolder } from './createFolder';

export interface WordToSave {
  traditional: string;
  simplified: string;
  pinyin: string;
  translation: string;
}

const sameWord = (card: UserFlashcard, word: WordToSave) =>
  (card.traditional || card.simplified) === word.traditional && (card.pinyin ?? '') === word.pinyin;

/**
 * Saves words as cards in the learner's own folder of that name, making the folder when it is
 * missing. Words the folder already holds are skipped, so saving the same list twice adds nothing.
 * Returns the folder's id. Call it once the account's folders have been pulled.
 */
export async function saveWordsToFolder(userId: string, folderName: string, words: readonly WordToSave[]): Promise<string> {
  const existing = useAppStore.getState().customFolders.find((folder) => folder.name === folderName && isFolderOwner(folder));
  const folderId = existing?.id ?? await createLibraryFolder(folderName, 'blue', userId);
  let held: UserFlashcard[] = [];
  if (existing) {
    await flashcardService.refetchFolderFlashcards(userId, folderId, true);
    held = (flashcardService.getCachedFlashcards(userId) ?? []).filter((card) => card.folderId === folderId);
  }
  const createdAt = Date.now();
  // Newest first in the folder, so the list keeps its order: the first word gets the latest time.
  const cards = words.filter((word) => !held.some((card) => sameWord(card, word))).map((word, index, all): UserFlashcard => ({
    id: crypto.randomUUID(),
    folderId,
    userId,
    simplified: word.simplified,
    traditional: word.traditional,
    pinyin: word.pinyin,
    translation: word.translation,
    createdAt: createdAt + all.length - index,
  }));
  await flashcardService.createFlashcards(cards);
  return folderId;
}
