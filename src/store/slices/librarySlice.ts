import type { UserFlashcard } from '../../types/models';

export interface SaveWordTarget {
  word: string;
  traditional?: string;
  simplified?: string;
  pinyin?: string;
  definitions?: string | string[] | Record<string, unknown> | null;
}

export interface LibraryState {
  // Global Dictionary
  dictionaryWord: string | null;
  setDictionaryWord: (word: string | null) => void;

  // Save Word Modal
  saveWordTarget: SaveWordTarget | null;
  setSaveWordTarget: (target: SaveWordTarget | null) => void;

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
   * Id of the user the current folder list was last pulled from on this
   * device. Null until folders have ever been pulled for an account — the
   * guest -> account migration only runs for lists that were never synced,
   * so a stale server-derived list is never uploaded as guest data.
   */
  foldersSyncedUserId: string | null;
  setFoldersSyncedUserId: (userId: string | null) => void;
  localFlashcards: UserFlashcard[];
  addLocalFlashcard: (card: UserFlashcard) => void;
  deleteLocalFlashcard: (id: string) => void;
  updateLocalFlashcard: (id: string, patch: Partial<UserFlashcard>) => void;
}

type SetState = (partial: Partial<LibraryState> | ((state: LibraryState) => Partial<LibraryState>)) => void;

export function createLibrarySlice(set: SetState): LibraryState {
  return {
    dictionaryWord: null,
    setDictionaryWord: (word) => set({ dictionaryWord: word }),

    saveWordTarget: null,
    setSaveWordTarget: (target) => set({ saveWordTarget: target }),

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
    // Idempotent by id: a signed-in create is mirrored here by the folder
    // subscription as well as by the creating screen.
    addCustomFolder: (name, color, id) => set((s) => {
      const folderId = id || crypto.randomUUID();
      return s.customFolders.some((f) => f.id === folderId)
        ? {}
        : { customFolders: [...s.customFolders, { id: folderId, name, color }] };
    }),
    deleteCustomFolder: (id) => set((s) => ({
      customFolders: s.customFolders.filter(f => f.id !== id),
    })),
    foldersSyncedUserId: null,
    setFoldersSyncedUserId: (userId) => set({ foldersSyncedUserId: userId }),
    localFlashcards: [],
    addLocalFlashcard: (card) => set((s) => ({
      localFlashcards: [...s.localFlashcards, card],
    })),
    deleteLocalFlashcard: (id) => set((s) => ({
      localFlashcards: s.localFlashcards.filter(c => c.id !== id),
    })),
    updateLocalFlashcard: (id, patch) => set((s) => ({
      localFlashcards: s.localFlashcards.map(c => (c.id === id ? { ...c, ...patch } : c)),
    })),
  };
}

/** Persisted slices owned by this domain. */
export const LIBRARY_PERSISTED_KEYS = [
  'favorites',
  'customFolders',
  'foldersSyncedUserId',
  'localFlashcards',
  'libraryActiveFolder',
] as const;

/** Keys this domain clears when the signed-in account changes. */
export const LIBRARY_ACCOUNT_SWITCH_DEFAULTS = {
  favorites: [],
  customFolders: [],
  foldersSyncedUserId: null,
  // The library view points at account-scoped folders. `customFolders` is
  // cleared above, so keeping the pointer would leave the library pinned to a
  // folder that no longer exists (its deck/session key is built from the id,
  // and a new card would be filed into the dead folder).
  libraryActiveFolder: 'all',
  libraryActiveView: 'home' as const,
};
