import { isFolderOwner, canEditFolder } from '../../../utils/vocabulary/folderCollaboration';
import { debugLogger } from '../../../utils/debug/debugLogger';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppIcon } from '../../../lib/widgets';
import { useAuth } from '../../../hooks/useAuth';
import { useUserFlashcards } from '../../../features/library';
import { useAppStore } from '../../../store/useAppStore';
import { folderCollabService } from '../../../services/folderCollabService';
import type { UserFolder } from '../../../types/models';
import { flashcardService, type FlashcardTextPatch } from '../../../services/flashcardService';
import { userService } from '../../../services/userService';
import { getDictionaryEntriesBatch } from '../../../services/dictionaryService';
import { DBDictionaryEntry } from '../../../types/database';
import { UserFlashcard } from '../../../types/models';
import {
  STARRED_FOLDER_COLOR,
  FOLDER_COLOR_PALETTE,
  resolveFolderColor,
  serializeFolderColor,
} from '../../../utils/folderColors';

const COLLECTIONS = [
  {
    id: 'starred',
    title: 'Saved words',
    label: 'Dictionary Favorites',
    icon: React.createElement(AppIcon, { name: 'bookmarkFilled', size: 36, className: STARRED_FOLDER_COLOR.accent }),
    accentBg: STARRED_FOLDER_COLOR.accentBg,
    accentBorder: STARRED_FOLDER_COLOR.accentBorder,
    accentColor: STARRED_FOLDER_COLOR.accent,
    colorFront: STARRED_FOLDER_COLOR.front,
    colorBack: STARRED_FOLDER_COLOR.back,
    lightBg: STARRED_FOLDER_COLOR.lightBg,
    onAccent: STARRED_FOLDER_COLOR.onAccent,
    count: 0,
  }
];

/** Stable empties so a malformed persisted value does not churn identities. */
const NO_FAVORITES: string[] = [];

export function useLibrary() {
  const { currentUser } = useAuth();
  const favoritesRaw = useAppStore((state) => state.favorites);
  // IndexedDB/cloud is untrusted input; a null here used to crash the tab.
  const favorites = Array.isArray(favoritesRaw) ? favoritesRaw : NO_FAVORITES;
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const setLibraryActiveFolder = useAppStore((state) => state.setLibraryActiveFolder);
  const searchQuery = useAppStore((state) => state.librarySearchQuery);
  const setSearchQuery = useAppStore((state) => state.setLibrarySearchQuery);
  const customFoldersRaw = useAppStore((state) => state.customFolders);
  const customFolders = useMemo(
    () => (Array.isArray(customFoldersRaw) ? customFoldersRaw.filter((folder) => Boolean(folder)) : []),
    [customFoldersRaw],
  );
  const addCustomFolder = useAppStore((state) => state.addCustomFolder);
  const deleteCustomFolder = useAppStore((state) => state.deleteCustomFolder);
  const updateCustomFolder = useAppStore((state) => state.updateCustomFolder);
  const deleteLocalFlashcard = useAppStore((state) => state.deleteLocalFlashcard);
  const setLibraryActiveView = useAppStore((state) => state.setLibraryActiveView);
  // The folder view is store-backed so the header's back action and this screen
  // always agree; deriving it (instead of mirroring it into local state) keeps
  // one source of truth and removes the sync effect between the two.
  const editable = canEditFolder(customFolders.find((folder) => folder.id === libraryActiveFolder));
  const activeView = useAppStore((state) => state.libraryActiveView);
  const setActiveView = setLibraryActiveView;

  const [deleteFolderTarget, setDeleteFolderTarget] = useState<UserFolder | null>(null);
  const deletingFoldersRef = useRef<Set<string>>(new Set());

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    const folderId = deleteFolderTarget.id;
    setDeleteFolderTarget(null);

    if (libraryActiveFolder === folderId) { setLibraryActiveFolder('all'); setActiveView('home'); }
    deletingFoldersRef.current.add(folderId);
    deleteCustomFolder(folderId);
    // A folder owns its cards: deleting it deletes them (there is no fallback folder).
    if (!currentUser) {
      customFlashcards.filter((card) => card.folderId === folderId).forEach((card) => deleteLocalFlashcard(card.id));
    }

    if (currentUser) {
      try {
        if (!isFolderOwner(deleteFolderTarget)) {
          await folderCollabService.leave(folderId);
          const fresh = await userService.getFolders();
          if (useAppStore.getState().currentUser?.id !== currentUser.id) return;
          useAppStore.getState().setCustomFolders(fresh);
          await flashcardService.refetchFlashcards(currentUser.id);
        } else await flashcardService.deleteFolder(currentUser.id, folderId);
      } catch (err) {
        debugLogger.error('Supabase', "Failed to delete folder in Supabase:", err);
        try {
          const serverFolders = await userService.getFolders();
          useAppStore.getState().setCustomFolders(serverFolders);
          useAppStore.getState().setSyncError(
            "Couldn't delete the folder — check your connection and try again.",
          );
        } catch (reconcileErr) {
          debugLogger.error('Supabase', "Failed to reconcile folders after delete error:", reconcileErr);
        }
      } finally {
        deletingFoldersRef.current.delete(folderId);
      }
    }
  };
  
  const customFlashcards = useUserFlashcards();
  const [favoriteResults, setFavoriteResults] = useState<DBDictionaryEntry[]>([]);
  const [isLoadingFavs, setIsLoadingFavs] = useState(false);

  const [showFolderModal, setShowFolderModalOpen] = useState(false);
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const setShowFolderModal = useCallback((show: boolean) => {
    setShowFolderModalOpen(show);
    if (!show) setEditFolderId(null);
  }, []);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderColorId, setSelectedFolderColorId] = useState<string>(FOLDER_COLOR_PALETTE[0].id);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const allCollections = useMemo(() => {
    const dynFolders = customFolders.map((cf, index) => {
      const folderColor = resolveFolderColor(cf.color, index);
      const count = customFlashcards.filter(c => c.folderId === cf.id).length;
      return {
        id: cf.id,
        title: cf.name,
        label: 'Custom Folder',
        accentBg: folderColor.accentBg,
        accentBorder: folderColor.accentBorder,
        accentColor: folderColor.accent,
        colorFront: folderColor.front,
        colorBack: folderColor.back,
        lightBg: folderColor.lightBg,
        onAccent: folderColor.onAccent,
        icon: React.createElement(AppIcon, { name: 'folder', size: 36, className: folderColor.accent }),
        count,
        memberCount: cf.memberCount,
      };
    });

    const starredCount = favorites.length;
    return [
      { ...COLLECTIONS[0], count: starredCount },
      ...dynFolders
    ];
  }, [customFolders, favorites.length, customFlashcards]);

  useEffect(() => {
    let cancelled = false;
    async function fetchFavorites() {
      if (favorites.length === 0) {
        setFavoriteResults([]);
        return;
      }
      setIsLoadingFavs(true);
      try {
        const batchResults = await getDictionaryEntriesBatch(favorites);
        if (cancelled) return;
        const results: DBDictionaryEntry[] = [];
        for (const word of favorites) {
          if (batchResults.has(word)) {
            results.push(batchResults.get(word)!);
          }
        }
        if (!cancelled) setFavoriteResults(results);
      } catch (err) {
        debugLogger.error('Supabase', "Error fetching library favorites:", err);
      } finally {
        if (!cancelled) setIsLoadingFavs(false);
      }
    }
    fetchFavorites();
    return () => { cancelled = true; };
  }, [favorites]);

  const openEditFolder = (folderId: string) => {
    const index = customFolders.findIndex((folder) => folder.id === folderId);
    if (index < 0) return;
    setNewFolderName(customFolders[index].name);
    setSelectedFolderColorId(resolveFolderColor(customFolders[index].color, index).id);
    setEditFolderId(folderId);
    setShowFolderModalOpen(true);
  };

  const confirmEditFolder = async (folderId: string) => {
    const patch = { name: newFolderName.trim(), color: serializeFolderColor(selectedFolderColorId) };
    setIsCreatingFolder(true);
    updateCustomFolder(folderId, patch);
    setShowFolderModal(false);
    if (currentUser) {
      try {
        await flashcardService.updateFolder(currentUser.id, folderId, patch);
      } catch {
        try {
          useAppStore.getState().setCustomFolders(await userService.getFolders());
        } catch (reconcileErr) {
          debugLogger.error('Supabase', "Failed to reconcile folders after edit error:", reconcileErr);
        }
        useAppStore.getState().setSyncError("Couldn't save the folder — check your connection and try again.");
      }
    }
    setIsCreatingFolder(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    if (editFolderId) {
      await confirmEditFolder(editFolderId);
      return;
    }

    setIsCreatingFolder(true);
    const folderId = crypto.randomUUID();
    
    const folderColor = serializeFolderColor(selectedFolderColorId);

    if (currentUser) {
      await flashcardService.createFolder(currentUser.id, {
        id: folderId,
        name: newFolderName.trim(),
        color: folderColor
      });
    }
    addCustomFolder(newFolderName.trim(), folderColor, folderId);
    
    setShowFolderModal(false);
    setIsCreatingFolder(false);
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Stable identity: the library grid memoizes its cards on this handler (and
  // the screen derives its own item-based callback from it), so it must not be
  // recreated on every hook render — which happens on every search keystroke.
  const handleDeleteCustomCard = useCallback(async (cardId: string) => {
    setDeleteTargetId(cardId);
  }, []);

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    if (!editable) return;
    const cid = deleteTargetId;
    setDeleteTargetId(null);
    if (currentUser) {
      await flashcardService.deleteFlashcard(currentUser.id, cid);
    } else {
      deleteLocalFlashcard(cid);
    }
  };

  const [editCardTarget, setEditCardTarget] = useState<UserFlashcard | null>(null);
  const saveEditedCard = async (patch: FlashcardTextPatch) => {
    if (!editCardTarget) return;
    if (!editable) return;
    const cardId = editCardTarget.id;
    setEditCardTarget(null);
    if (currentUser) {
      try {
        await flashcardService.updateFlashcard(currentUser.id, cardId, patch);
      } catch {
        useAppStore.getState().setSyncError("Couldn't save the card — check your connection and try again.");
      }
    } else {
      useAppStore.getState().updateLocalFlashcard(cardId, patch);
    }
  };

  const filteredStarred = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return favoriteResults;
    return favoriteResults.filter(entry => {
      const pinyinJoined = Array.isArray(entry.pinyin) ? entry.pinyin.join(' ').toLowerCase() : '';
      const defs = entry.definitions ? Object.values(entry.definitions).join(' ').toLowerCase() : '';
      return (entry.simplified || '').includes(q) ||
             (entry.traditional || '').includes(q) ||
             pinyinJoined.includes(q) ||
             defs.includes(q);
    });
  }, [favoriteResults, searchQuery]);

  const filteredCustom = useMemo(() => {
    const filtered = customFlashcards.filter(c => c.folderId === libraryActiveFolder);

    const q = searchQuery.toLowerCase().trim();
    if (!q) return filtered;
    return filtered.filter(card => {
      const pin = card.pinyin ? card.pinyin.toLowerCase() : '';
      const trans = card.translation ? card.translation.toLowerCase() : '';
      return (card.simplified || '').includes(q) ||
             (card.traditional || '').includes(q) ||
             pin.includes(q) ||
             trans.includes(q);
    });
  }, [customFlashcards, searchQuery, libraryActiveFolder]);

  const activeCollection = (allCollections && allCollections.find(c => c.id === libraryActiveFolder)) || (allCollections && allCollections[0]) || COLLECTIONS[0];
  const items = libraryActiveFolder === 'starred' ? filteredStarred : filteredCustom;

  // Select mode: tick several cards, then remove or move them together.
  const updateLocalFlashcard = useAppStore((state) => state.updateLocalFlashcard);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const getItemKey = useCallback(
    (item: DBDictionaryEntry | UserFlashcard) => (
      libraryActiveFolder === 'starred' ? (item as DBDictionaryEntry).traditional : (item as UserFlashcard).id
    ),
    [libraryActiveFolder],
  );
  const exitSelecting = useCallback(() => {
    setIsSelecting(false);
    setSelectedKeys(new Set());
  }, []);
  const toggleSelected = useCallback((key: string) => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const selectAll = () => setSelectedKeys(new Set(items.map(getItemKey)));

  // A different folder or the home view starts without a selection.
  useEffect(() => {
    exitSelecting();
  }, [libraryActiveFolder, activeView, editable, exitSelecting]);

  const confirmBulkRemove = async () => {
    if (!editable) return;
    const keys = [...selectedKeys];
    setBulkRemoveOpen(false);
    exitSelecting();
    if (libraryActiveFolder === 'starred') {
      keys.forEach((word) => toggleFavorite(word));
    } else if (currentUser) {
      await Promise.allSettled(keys.map((id) => flashcardService.deleteFlashcard(currentUser.id, id)));
    } else {
      keys.forEach((id) => deleteLocalFlashcard(id));
    }
  };

  const moveSelectedTo = async (folderId: string) => {
    if (!editable || !canEditFolder(customFolders.find((folder) => folder.id === folderId))) return;
    const ids = [...selectedKeys];
    if (currentUser && customFlashcards.some((card) => selectedKeys.has(card.id) && card.userId !== currentUser.id)) {
      useAppStore.getState().showFeedbackToast('Only cards you added can be moved to another folder', 'neutral', 3000);
      return;
    }
    setMoveOpen(false);
    exitSelecting();
    if (currentUser) {
      try {
        await flashcardService.moveFlashcards(currentUser.id, ids, folderId);
      } catch {
        useAppStore.getState().setSyncError("Couldn't move the cards — check your connection and try again.");
      }
    } else {
      ids.forEach((id) => updateLocalFlashcard(id, { folderId }));
    }
  };

  const recentItems = useMemo(() => {
    const custom = customFlashcards.map(c => ({
      id: c.id,
      hanzi: c.traditional || c.simplified,
      pinyin: c.pinyin || '',
      meaning: c.translation || '',
      type: 'custom' as const,
    }));
    const starred = favoriteResults.map(f => ({
      id: f.traditional,
      hanzi: f.traditional || f.simplified,
      pinyin: Array.isArray(f.pinyin) ? f.pinyin.join(' ') : f.pinyin || '',
      meaning: f.definitions ? Object.values(f.definitions)[0] || '' : '',
      type: 'starred' as const,
    }));
    return [...custom, ...starred].slice(0, 3);
  }, [customFlashcards, favoriteResults]);

  return {
    favorites,
    currentUser,
    toggleFavorite,
    setDictionaryWord,
    libraryActiveFolder,
    setLibraryActiveFolder,
    deleteFolderTarget,
    setDeleteFolderTarget,
    confirmDeleteFolder,
    searchQuery,
    setSearchQuery,
    allCollections,
    isLoadingFavs,
    showFolderModal,
    setShowFolderModal,
    newFolderName,
    setNewFolderName,
    selectedFolderColorId,
    setSelectedFolderColorId,
    isCreatingFolder,
    handleCreateFolder,
    editFolderId,
    openEditFolder,
    editCardTarget,
    setEditCardTarget,
    saveEditedCard,
    deleteTargetId,
    setDeleteTargetId,
    handleDeleteCustomCard,
    confirmDelete,
    activeCollection,
    items,
    recentItems,
    activeView,
    setActiveView,
    isSelecting,
    setIsSelecting,
    exitSelecting,
    selectedKeys,
    toggleSelected,
    selectAll,
    getItemKey,
    bulkRemoveOpen,
    setBulkRemoveOpen,
    confirmBulkRemove,
    moveOpen,
    setMoveOpen,
    moveSelectedTo,
  };
}
