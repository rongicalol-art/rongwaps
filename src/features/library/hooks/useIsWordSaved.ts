import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useUserFlashcards } from './useUserFlashcards';

export interface WordSavedStatus {
  isSaved: boolean;
  isFavorite: boolean;
  isSavedInFolder: boolean;
  savedFolderCount: number;
}

/**
 * Universal hook to check whether a headword is saved in Favorites
 * or any custom flashcard folder.
 */
export function useIsWordSaved(
  word: string | null | undefined,
  traditional?: string,
  simplified?: string,
): WordSavedStatus {
  const favorites = useAppStore((state) => state.favorites);
  const flashcards = useUserFlashcards();

  return useMemo(() => {
    if (!word && !traditional && !simplified) {
      return { isSaved: false, isFavorite: false, isSavedInFolder: false, savedFolderCount: 0 };
    }

    const candidates = new Set<string>();
    if (word) candidates.add(word);
    if (traditional) candidates.add(traditional);
    if (simplified) candidates.add(simplified);

    let isFavorite = false;
    for (const cand of candidates) {
      if (favorites.includes(cand)) {
        isFavorite = true;
        break;
      }
    }

    const matchedFolderIds = new Set<string>();
    for (const card of flashcards) {
      const match =
        (card.traditional && candidates.has(card.traditional)) ||
        (card.simplified && candidates.has(card.simplified));
      if (match && card.folderId) {
        matchedFolderIds.add(card.folderId);
      }
    }

    const isSavedInFolder = matchedFolderIds.size > 0;
    const isSaved = isFavorite || isSavedInFolder;

    return {
      isSaved,
      isFavorite,
      isSavedInFolder,
      savedFolderCount: matchedFolderIds.size,
    };
  }, [word, traditional, simplified, favorites, flashcards]);
}
