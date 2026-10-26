import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../hooks/useAuth';
import { flashcardService } from '../../../services/flashcardService';
import { sharedFolderService } from '../../../services/sharedFolderService';
import { useAppStore } from '../../../store/useAppStore';
import type { SharedFolderPreview, UserFlashcard } from '../../../types/models';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

export function useSharedFolder(shareId: string) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<SharedFolderPreview | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFolderId, setSavedFolderId] = useState<string | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [cards, setCards] = useState<UserFlashcard[]>([]);
  const [cardsReady, setCardsReady] = useState(false);
  const savingRef = useRef(false);
  const customFolders = useAppStore((state) => state.customFolders);
  const foldersSyncedUserId = useAppStore((state) => state.foldersSyncedUserId);
  const copyMap = useAppStore((state) => state.sharedFolderCopies);
  const mappedCopyId = copyMap[shareId];
  const copyExists = Boolean(currentUser && foldersSyncedUserId === currentUser.id && mappedCopyId && customFolders.some((item) => item.id === mappedCopyId));
  const libraryReady = Boolean(currentUser && cardsReady && foldersSyncedUserId === currentUser.id);
  const savedCopyStillExists = Boolean(savedFolderId && customFolders.some((item) => item.id === savedFolderId));
  const readyToOpen = copyExists && mappedCopyId ? mappedCopyId : savedCopyStillExists ? savedFolderId : null;

  useEffect(() => {
    if (!/^[A-Za-z0-9_-]{8,16}$/.test(shareId)) {
      setLoadState('missing');
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setFolder(null);
    setSaveError(null);
    setSavedFolderId(null);
    setSkippedCount(0);
    sharedFolderService.get(shareId).then((result) => {
      if (cancelled) return;
      setFolder(result);
      setLoadState(result ? 'ready' : 'missing');
    }).catch((error: unknown) => {
      if (cancelled) return;
      setSaveError(error instanceof Error ? error.message : 'Could not load this folder.');
      setLoadState('error');
    });
    return () => { cancelled = true; };
  }, [shareId]);

  useEffect(() => {
    if (!currentUser) {
      setCards([]);
      setCardsReady(false);
      return;
    }
    setCardsReady(false);
    return flashcardService.subscribeToUserFlashcards(currentUser.id, (updated) => {
      setCards(Array.isArray(updated) ? updated : []);
      setCardsReady(flashcardService.getCachedFlashcards(currentUser.id) !== null);
    });
  }, [currentUser]);

  const openFolder = useCallback((folderId: string) => {
    const store = useAppStore.getState();
    store.setLibraryActiveFolder(folderId);
    store.setLibraryActiveView('folder');
    navigate('/library');
  }, [navigate]);

  const addToLibrary = useCallback(async () => {
    if (!currentUser || !folder || !libraryReady || savingRef.current) return;
    if (copyExists && mappedCopyId) {
      openFolder(mappedCopyId);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const folderId = crypto.randomUUID();
      const localFolder = { id: folderId, name: folder.name, color: folder.color ?? 'blue' };
      await flashcardService.createFolder(currentUser.id, localFolder);
      useAppStore.getState().addCustomFolder(localFolder.name, localFolder.color, localFolder.id);

      const room = Math.max(0, 5000 - cards.filter((card) => card.userId === currentUser.id).length);
      const toCopy = folder.cards.slice(0, room).map((card): UserFlashcard => ({
        id: crypto.randomUUID(),
        folderId,
        simplified: card.simplified,
        traditional: card.traditional || undefined,
        pinyin: card.pinyin || undefined,
        translation: card.translation,
        notes: card.notes || undefined,
        measure_words: card.measureWords,
        createdAt: Date.now(),
        userId: currentUser.id,
      }));
      try {
        await flashcardService.createFlashcards(toCopy);
      } catch (error) {
        useAppStore.getState().deleteCustomFolder(folderId);
        await flashcardService.deleteFolder(currentUser.id, folderId).catch(() => undefined);
        throw error;
      }

      const skipped = folder.cards.length - toCopy.length;
      setSkippedCount(skipped);
      useAppStore.getState().setSharedFolderCopy(shareId, folderId);
      setSavedFolderId(folderId);
      try {
        const saveCount = await sharedFolderService.save(shareId);
        setFolder((previous) => previous ? { ...previous, saveCount } : previous);
      } catch {
        setSaveError('Added to your library, but the save count could not be updated.');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not add this folder. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [currentUser, folder, libraryReady, copyExists, mappedCopyId, openFolder, cards, shareId]);

  const cardCount = useMemo(() => folder?.cards.length ?? 0, [folder]);
  return {
    currentUser,
    folder,
    loadState,
    saveError,
    saving,
    skippedCount,
    cardCount,
    libraryReady,
    savedFolderId: readyToOpen,
    addToLibrary,
    openFolder,
  };
}
