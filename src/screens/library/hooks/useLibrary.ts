import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PiBookmarkSimpleFill, PiSparkleFill } from 'react-icons/pi';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { flashcardService } from '../../../services/flashcardService';
import { getDictionaryEntriesBatch } from '../../../services/dictionaryService';
import { useDictionarySearch, SearchResult } from '../../../hooks/useDictionarySearch';
import { DBDictionaryEntry } from '../../../types/database';
import { UserFlashcard } from '../../../types/models';

type ViewState = 'home';

const COLLECTIONS = [
  {
    id: 'starred',
    title: 'Starred Words',
    label: 'Dictionary Favorites',
    accentBg: 'bg-[#FFDF00]',
    accentBorder: 'border-[#D89000]',
    accentColor: 'text-[#D89000]',
    lightBg: 'bg-[#FFDF00]/10',
    icon: React.createElement(PiBookmarkSimpleFill, { size: 48, className: "text-white drop-shadow-sm" })
  },
  {
    id: 'custom',
    title: 'Custom Cards',
    label: 'Smart Flashcards',
    accentBg: 'bg-[#CE82FF]',
    accentBorder: 'border-[#A559D6]',
    accentColor: 'text-[#A559D6]',
    lightBg: 'bg-[#CE82FF]/10',
    icon: React.createElement(PiSparkleFill, { size: 48, className: "text-white drop-shadow-sm" })
  }
];

export function useLibrary(onAddCard?: () => void) {
  const { currentUser } = useAuth();
  const { 
    favorites, 
    toggleFavorite, 
    setDictionaryWord, 
    libraryActiveFolder, 
    setLibraryActiveFolder, 
    customFolders, 
    addCustomFolder,
    deleteCustomFolder
  } = useAppStore();
  
  const [activeView, setActiveView] = useState<ViewState>('home');
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const deletingFoldersRef = useRef<Set<string>>(new Set());

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    const folderId = deleteFolderTarget.id;
    setDeleteFolderTarget(null);

    deletingFoldersRef.current.add(folderId);
    deleteCustomFolder(folderId);

    if (currentUser) {
      try {
        await flashcardService.deleteFolder(currentUser.id, folderId);
      } catch (err) {
        console.error("Failed to delete folder in Supabase:", err);
      } finally {
        deletingFoldersRef.current.delete(folderId);
      }
    }
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [builderSearch, setBuilderSearch] = useState('');
  const { results: searchResultsRaw, isSearching } = useDictionarySearch(builderSearch);
  const searchResults = useMemo(() => searchResultsRaw.slice(0, 10), [searchResultsRaw]);

  const allCollections = useMemo(() => {
    const dynFolders = customFolders.map(cf => {
      let parsedColor = { accentBg: 'bg-[#CE82FF]', accentBorder: 'border-[#A559D6]' };
      try {
        parsedColor = JSON.parse(cf.color);
      } catch (e) {
        // Fallback
      }
      return {
        id: cf.id,
        title: cf.name,
        label: 'Custom Folder',
        accentBg: parsedColor.accentBg,
        accentBorder: parsedColor.accentBorder,
        accentColor: 'text-[#4B4B4B]',
        lightBg: 'bg-[#F7F7F7]',
        icon: React.createElement(PiSparkleFill, { size: 48, className: "text-white drop-shadow-sm" })
      };
    });
    return [...COLLECTIONS, ...dynFolders];
  }, [customFolders]);
  
  const [selectedEntry, setSelectedEntry] = useState<SearchResult | null>(null);
  
  const [customFlashcards, setCustomFlashcards] = useState<UserFlashcard[]>([]);
  const [favoriteResults, setFavoriteResults] = useState<DBDictionaryEntry[]>([]);
  const [isLoadingFavs, setIsLoadingFavs] = useState(false);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [simplified, setSimplified] = useState('');
  const [traditional, setTraditional] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [translation, setTranslation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const unsubscribeCards = flashcardService.subscribeToUserFlashcards(currentUser.id, setCustomFlashcards);
      
      const unsubscribeFolders = flashcardService.subscribeToFolders(currentUser.id, (folders) => {
        if (folders) {
          const { setCustomFolders } = useAppStore.getState();
          setCustomFolders(folders as any);
        }
      });
      
      return () => {
        unsubscribeCards();
        unsubscribeFolders();
      };
    } else {
      setCustomFlashcards([]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const localFolders = useAppStore.getState().customFolders;
      flashcardService.syncOfflineFolders(currentUser.id, localFolders as any);
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
    
    if (!currentUser) {
      alert("Please login via the Profile tab to create folders in the cloud.");
      return;
    }

    setIsCreatingFolder(true);
    const colors = [
      { accentBg: 'bg-[#FF9600]', accentBorder: 'border-[#E08600]' },
      { accentBg: 'bg-[#00C1F3]', accentBorder: 'border-[#00ADD8]' },
      { accentBg: 'bg-[#58CC02]', accentBorder: 'border-[#46A302]' },
      { accentBg: 'bg-[#FF4B4B]', accentBorder: 'border-[#E03A3A]' }
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const folderId = crypto.randomUUID();
    
    if (currentUser) {
      await flashcardService.createFolder(currentUser.id, {
        id: folderId,
        name: newFolderName.trim(),
        color: JSON.stringify(randomColor)
      });
    } else {
      addCustomFolder(newFolderName.trim(), JSON.stringify(randomColor), folderId);
    }
    
    setShowFolderModal(false);
    setIsCreatingFolder(false);
  };

  const handleSelectEntry = (entry: SearchResult) => {
    setSelectedEntry(entry);
    setSimplified(entry.simplified);
    setTraditional(entry.traditional || entry.simplified);
    setPinyin(entry.pinyin_accented || '');
    
    let firstDef = '';
    if (entry.definitions) {
       if (Array.isArray(entry.definitions) && entry.definitions.length > 0) {
         firstDef = entry.definitions[0];
       } else if (typeof entry.definitions === 'object') {
         const defKeys = Object.keys(entry.definitions);
         if (defKeys.length > 0) {
            firstDef = String(entry.definitions[defKeys[0]]);
         }
       }
    }
    setTranslation(firstDef);
    setBuilderSearch('');
  };

  const handleClearSelection = () => {
    setSelectedEntry(null);
    setSimplified('');
    setTraditional('');
    setPinyin('');
    setTranslation('');
  };

  const handleCreateSmartCard = async () => {
    if (!currentUser) {
      alert("Please login via the Profile tab to save flashcards.");
      return;
    }
    if (!simplified || !translation) return;

    setIsSubmitting(true);
    const newCard: UserFlashcard = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      folderId: libraryActiveFolder === 'starred' ? 'custom' : libraryActiveFolder,
      simplified,
      traditional: traditional || simplified,
      pinyin,
      translation,
      createdAt: Date.now()
    };

    try {
      await flashcardService.createFlashcard(newCard);
      handleClearSelection();
      setActiveView('home');
      setLibraryActiveFolder('custom');
    } catch (e) {
      console.error("Failed to create smart flashcard.", e);
      alert('Failed to save flashcard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDeleteCustomCard = async (cardId: string) => {
    if (!currentUser) return;
    setDeleteTargetId(cardId);
  };

  const confirmDelete = async () => {
    if (!currentUser || !deleteTargetId) return;
    const cid = deleteTargetId;
    setDeleteTargetId(null);
    await flashcardService.deleteFlashcard(currentUser.id, cid);
  };

  const definitionOptions = useMemo(() => {
    if (!selectedEntry || !selectedEntry.definitions) return [];
    let opts: string[] = [];
    if (Array.isArray(selectedEntry.definitions)) {
      opts = selectedEntry.definitions.map(v => String(v));
    } else if (typeof selectedEntry.definitions === 'object') {
      opts = Object.values(selectedEntry.definitions).map(v => String(v));
    }
    return Array.from(new Set(opts));
  }, [selectedEntry]);

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
    activeView,
    setActiveView
  };
}
