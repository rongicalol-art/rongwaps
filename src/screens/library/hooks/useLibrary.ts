import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PiStarFill, PiFolderFill } from 'react-icons/pi';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { flashcardService } from '../../../services/flashcardService';
import { getDictionaryEntriesBatch } from '../../../services/dictionaryService';
import { DBDictionaryEntry } from '../../../types/database';
import { UserFlashcard } from '../../../types/models';

type ViewState = 'home' | 'folder';

const COLLECTIONS = [
  {
    id: 'starred',
    title: 'Starred Words',
    label: 'Dictionary Favorites',
    icon: React.createElement(PiStarFill, { size: 40, className: "text-[#FFB020]" }),
    accentBg: 'bg-[#FFB020]',
    accentBorder: 'border-[#CC8D1A]'
  },
  {
    id: 'custom',
    title: 'Custom Cards',
    label: 'Smart Flashcards',
    icon: React.createElement(PiFolderFill, { size: 40, className: "text-[#CE82FF]" }),
    accentBg: 'bg-[#CE82FF]',
    accentBorder: 'border-[#A568CC]'
  }
];

export function useLibrary() {
  const { currentUser } = useAuth();
  const { 
    favorites, 
    toggleFavorite, 
    setDictionaryWord, 
    libraryActiveFolder, 
    setLibraryActiveFolder, 
    librarySearchQuery: searchQuery,
    setLibrarySearchQuery: setSearchQuery,
    customFolders, 
    addCustomFolder,
    deleteCustomFolder,
    localFlashcards,
    deleteLocalFlashcard,
    setLibraryActiveView,
    libraryActiveView: storeActiveView,
  } = useAppStore();
  
  const [activeView, setActiveViewLocal] = useState<ViewState>(storeActiveView);

  // Sync local state when the store's view is reset externally (e.g. header back button)
  useEffect(() => {
    setActiveViewLocal(storeActiveView);
  }, [storeActiveView]);

  const setActiveView = (view: ViewState) => {
    setActiveViewLocal(view);
    setLibraryActiveView(view);
  };

  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const deletingFoldersRef = useRef<Set<string>>(new Set());

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    const folderId = deleteFolderTarget.id;
    const folder = customFolders.find(f => f.id === folderId);
    setDeleteFolderTarget(null);

    deletingFoldersRef.current.add(folderId);
    deleteCustomFolder(folderId);

    if (currentUser) {
      try {
        await flashcardService.deleteFolder(currentUser.id, folderId);
      } catch (err) {
        console.error("Failed to delete folder in Supabase:", err);
        // Rollback: the server delete failed, so restore the folder locally
        // to keep UI and cloud state consistent.
        if (folder) {
          addCustomFolder(folder.name, folder.color, folder.id);
        }
      } finally {
        deletingFoldersRef.current.delete(folderId);
      }
    }
  };
  
  const [customFlashcards, setCustomFlashcards] = useState<UserFlashcard[]>([]);
  const [favoriteResults, setFavoriteResults] = useState<DBDictionaryEntry[]>([]);
  const [isLoadingFavs, setIsLoadingFavs] = useState(false);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const allCollections = useMemo(() => {
    const dynFolders = customFolders.map(cf => {
      let parsedColor = { accentBg: 'bg-[#1CB0F6]', accentBorder: 'border-[#1899D6]' };
      try {
        parsedColor = JSON.parse(cf.color);
      } catch {
        // Fallback
      }
      const count = customFlashcards.filter(c => c.folderId === cf.id).length;
      return {
        id: cf.id,
        title: cf.name,
        label: 'Custom Folder',
        accentBg: parsedColor.accentBg,
        accentBorder: parsedColor.accentBorder,
        accentColor: 'text-[#4B4B4B]',
        lightBg: 'bg-[#F7F7F7]',
        icon: React.createElement(PiFolderFill, { size: 40, className: "text-[#1CB0F6]" }),
        count
      };
    });

    const starredCount = favorites.length;
    const customCount = customFlashcards.filter(c => !c.folderId || c.folderId === 'custom').length;

    return [
      { ...COLLECTIONS[0], count: starredCount },
      { ...COLLECTIONS[1], count: customCount },
      ...dynFolders
    ];
  }, [customFolders, favorites.length, customFlashcards]);

  useEffect(() => {
    if (currentUser) {
      const unsubscribeCards = flashcardService.subscribeToUserFlashcards(currentUser.id, setCustomFlashcards);
      
      const unsubscribeFolders = flashcardService.subscribeToFolders(currentUser.id, (folders) => {
        if (folders) {
          const { setCustomFolders } = useAppStore.getState();
          setCustomFolders(folders);
        }
      });
      
      return () => {
        unsubscribeCards();
        unsubscribeFolders();
      };
    } else {
      setCustomFlashcards(localFlashcards);
    }
  }, [currentUser, localFlashcards]);

  useEffect(() => {
    if (currentUser) {
      const localFolders = useAppStore.getState().customFolders;
      flashcardService.syncOfflineFolders(currentUser.id, localFolders);
    }
  }, [currentUser]);

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
        console.error("Error fetching library favorites:", err);
      } finally {
        if (!cancelled) setIsLoadingFavs(false);
      }
    }
    fetchFavorites();
    return () => { cancelled = true; };
  }, [favorites]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    const folderId = crypto.randomUUID();
    
    // We no longer use random colors. The UI handles the unified styling.
    const folderColor = JSON.stringify({ accentBg: 'bg-[#1CB0F6]', accentBorder: 'border-[#1899D6]' });

    if (currentUser) {
      await flashcardService.createFolder(currentUser.id, {
        id: folderId,
        name: newFolderName.trim(),
        color: folderColor
      });
    } else {
      addCustomFolder(newFolderName.trim(), folderColor, folderId);
    }
    
    setShowFolderModal(false);
    setIsCreatingFolder(false);
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDeleteCustomCard = async (cardId: string) => {
    setDeleteTargetId(cardId);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const cid = deleteTargetId;
    setDeleteTargetId(null);
    if (currentUser) {
      await flashcardService.deleteFlashcard(currentUser.id, cid);
    } else {
      deleteLocalFlashcard(cid);
    }
  };

  const filteredStarred = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return favoriteResults;
    return favoriteResults.filter(entry => {
      const pinyinJoined = entry.pinyin ? entry.pinyin.join(' ').toLowerCase() : '';
      const defs = entry.definitions ? Object.values(entry.definitions).join(' ').toLowerCase() : '';
      return entry.simplified.includes(q) || 
             entry.traditional.includes(q) || 
             pinyinJoined.includes(q) || 
             defs.includes(q);
    });
  }, [favoriteResults, searchQuery]);

  const filteredCustom = useMemo(() => {
    let filtered = customFlashcards;
    if (libraryActiveFolder !== 'custom' && libraryActiveFolder !== 'starred') {
       filtered = customFlashcards.filter(c => c.folderId === libraryActiveFolder);
    } else if (libraryActiveFolder === 'custom') {
       filtered = customFlashcards.filter(c => !c.folderId || c.folderId === 'custom');
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return filtered;
    return filtered.filter(card => {
      const pin = card.pinyin ? card.pinyin.toLowerCase() : '';
      const trans = card.translation ? card.translation.toLowerCase() : '';
      return card.simplified.includes(q) || 
             card.traditional?.includes(q) || 
             pin.includes(q) || 
             trans.includes(q);
    });
  }, [customFlashcards, searchQuery, libraryActiveFolder]);

  const activeCollection = allCollections.find(c => c.id === libraryActiveFolder) || allCollections[0];
  const items = libraryActiveFolder === 'starred' ? filteredStarred : filteredCustom;

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
    isCreatingFolder,
    handleCreateFolder,
    deleteTargetId,
    setDeleteTargetId,
    handleDeleteCustomCard,
    confirmDelete,
    activeCollection,
    items,
    recentItems,
    activeView,
    setActiveView
  };
}
