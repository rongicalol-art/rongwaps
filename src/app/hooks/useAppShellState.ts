import { useAppStore } from '../../store/useAppStore';

/**
 * Per-slice selectors for the shell: a no-argument useAppStore() call would
 * subscribe the shell to every store change (including SRS progress updates).
 */
export function useAppShellState() {
  return {
    activeBookId: useAppStore((state) => state.activeBookId),
    setActiveBookId: useAppStore((state) => state.setActiveBookId),
    characterPreference: useAppStore((state) => state.characterPreference),
    setCharacterPreference: useAppStore((state) => state.setCharacterPreference),
    isSettingsOpen: useAppStore((state) => state.isSettingsOpen),
    setIsSettingsOpen: useAppStore((state) => state.setIsSettingsOpen),
    isLibraryFolderView: useAppStore((state) => state.libraryActiveView === 'folder'),
    dictionaryWord: useAppStore((state) => state.dictionaryWord),
    setDictionaryWord: useAppStore((state) => state.setDictionaryWord),
  };
}
