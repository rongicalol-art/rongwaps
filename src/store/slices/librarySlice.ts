import type { UserFlashcard } from '../../types/models';

export interface LibraryState {
  // Global Dictionary
  dictionaryWord: string | null;
  setDictionaryWord: (word: string | null) => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (word: string) => void;

  // Library State
  libraryActiveFolder: string;
  setLibraryActiveFolder: (folderId: string) => void;
  libraryActiveView: 'home' | 'folder';
  setLibraryActiveView: (view: 'home' | 'folder') => void;
  customFolders: { id: string; name: string; color: string }[];
  setCustomFolders: (folders: { id: string; name: string; color: string }[]) => void;
  addCustomFolder: (name: string, color: string, id?: string) => void;
  deleteCustomFolder: (id: string) => void;
  /**
   * Sticky delete tombstones: ids of folders the user deleted. Persisted so
   * a stale local folder list (another tab/device, or a reload between the
   * delete and the debounced save) can never resurrect the row via upsert.
   */
  deletedFolderIds: string[];
  setDeletedFolderIds: (ids: string[]) => void;
  /**
   * Id of the user the current folder list was last synced to/pulled from on
   * this device. Null until folders have ever been synced for an account —
   * the guest -> account migration only runs for lists that were never
   * synced, so a stale server-derived list is never uploaded as guest data.
   */
  foldersSyncedUserId: string | null;
  setFoldersSyncedUserId: (userId: string | null) => void;
  localFlashcards: UserFlashcard[];
  addLocalFlashcard: (card: UserFlashcard) => void;
  deleteLocalFlashcard: (id: string) => void;
}

type SetState = (partial: Partial<LibraryState> | ((state: LibraryState) => Partial<LibraryState>)) => void;

export function createLibrarySlice(set: SetState): LibraryState {
  return {
    dictionaryWord: null,
    setDictionaryWord: (word) => set({ dictionaryWord: word }),

    favorites: [],
    toggleFavorite: (word) => set((state) => ({
      favorites: state.favorites.includes(word)
        ? state.favorites.filter(w => w !== word)
        : [...state.favorites, word],
    })),

    libraryActiveFolder: 'all',
    setLibraryActiveFolder: (folderId) => set({ libraryActiveFolder: folderId }),
    libraryActiveView: 'home' as 'home' | 'folder',
    setLibraryActiveView: (view) => set({ libraryActiveView: view }),
    customFolders: [],
    setCustomFolders: (folders) => set({ customFolders: folders }),
    addCustomFolder: (name, color, id) => set((s) => ({
      customFolders: [...s.customFolders, { id: id || crypto.randomUUID(), name, color }],
    })),
    deleteCustomFolder: (id) => set((s) => ({
      customFolders: s.customFolders.filter(f => f.id !== id),
      // Tombstone the deletion so no stale local list can re-upload it.
      deletedFolderIds: s.deletedFolderIds.includes(id)
        ? s.deletedFolderIds
        : [...s.deletedFolderIds, id],
    })),
    deletedFolderIds: [],
    setDeletedFolderIds: (ids) => set({ deletedFolderIds: ids }),
    foldersSyncedUserId: null,
    setFoldersSyncedUserId: (userId) => set({ foldersSyncedUserId: userId }),
    localFlashcards: [],
    addLocalFlashcard: (card) => set((s) => ({
      localFlashcards: [...s.localFlashcards, card],
    })),
    deleteLocalFlashcard: (id) => set((s) => ({
      localFlashcards: s.localFlashcards.filter(c => c.id !== id),
    })),
  };
}

/** Persisted slices owned by this domain. */
export const LIBRARY_PERSISTED_KEYS = [
  'favorites',
  'customFolders',
  'deletedFolderIds',
  'foldersSyncedUserId',
  'localFlashcards',
  'libraryActiveFolder',
] as const;

/** Keys this domain clears when the signed-in account changes. */
export const LIBRARY_ACCOUNT_SWITCH_DEFAULTS = {
  favorites: [],
  customFolders: [],
  deletedFolderIds: [],
  foldersSyncedUserId: null,
};
