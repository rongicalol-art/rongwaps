import { create } from 'zustand';

interface LibraryState {
  favorites: string[];
  toggleFavorite: (word: string) => void;
  dictionaryWord: string | null;
  setDictionaryWord: (word: string | null) => void;
  libraryActiveFolder: string;
  setLibraryActiveFolder: (folderId: string) => void;
  customFolders: { id: string; name: string; color: string }[];
  setCustomFolders: (folders: { id: string; name: string; color: string }[]) => void;
  addCustomFolder: (name: string, color: string, id?: string) => void;
  deleteCustomFolder: (id: string) => void;
}

export const useLibraryStore = create<LibraryState>()((set) => ({
  favorites: [],
  toggleFavorite: (word) => set((s) => ({
    favorites: s.favorites.includes(word)
      ? s.favorites.filter(w => w !== word)
      : [...s.favorites, word],
  })),
  dictionaryWord: null,
  setDictionaryWord: (word) => set({ dictionaryWord: word }),
  libraryActiveFolder: 'all',
  setLibraryActiveFolder: (folderId) => set({ libraryActiveFolder: folderId }),
  customFolders: [],
  setCustomFolders: (folders) => set({ customFolders: folders }),
  addCustomFolder: (name, color, id) => set((s) => ({
    customFolders: [...s.customFolders, { id: id || crypto.randomUUID(), name, color }],
  })),
  deleteCustomFolder: (id) => set((s) => ({
    customFolders: s.customFolders.filter(f => f.id !== id),
  })),
}));