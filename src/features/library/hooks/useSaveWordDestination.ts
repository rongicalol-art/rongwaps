import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { flashcardService } from '../../../services/flashcardService';
import { getDictionaryEntries } from '../../../services/dictionaryService';
import { audioService } from '../../../services/audioService';
import { resolveFolderColor } from '../../../utils/folderColors';
import { useUserFlashcards } from './useUserFlashcards';
import type { SaveWordTarget } from '../../../store/slices/librarySlice';
import type { UserFlashcard } from '../../../types/models';

function formatDefinitions(defs: string | string[] | Record<string, unknown> | null | undefined): string {
  if (!defs) return '';
  if (typeof defs === 'string') return defs;
  if (Array.isArray(defs)) return defs.slice(0, 2).join(' · ');
  if (typeof defs === 'object') {
    return Object.values(defs)
      .map((v) => String(v))
      .slice(0, 2)
      .join(' · ');
  }
  return '';
}

function formatPinyin(pinyin: string[] | string | null | undefined): string {
  if (!pinyin) return '';
  if (Array.isArray(pinyin)) return pinyin.join(' ');
  return pinyin;
}

const NO_FAVORITES: string[] = [];

export function useSaveWordDestination(target: SaveWordTarget | null) {
  const { currentUser } = useAuth();
  const favoritesRaw = useAppStore((state) => state.favorites);
  // IndexedDB/cloud is untrusted input; a null here crashed the app shell.
  const favorites = Array.isArray(favoritesRaw) ? favoritesRaw : NO_FAVORITES;
  const toggleFavoriteStore = useAppStore((state) => state.toggleFavorite);
  const customFoldersRaw = useAppStore((state) => state.customFolders);
  const customFolders = useMemo(
    () => (Array.isArray(customFoldersRaw) ? customFoldersRaw.filter((folder) => Boolean(folder)) : []),
    [customFoldersRaw],
  );
  const addCustomFolder = useAppStore((state) => state.addCustomFolder);
  const addLocalFlashcard = useAppStore((state) => state.addLocalFlashcard);
  const deleteLocalFlashcard = useAppStore((state) => state.deleteLocalFlashcard);

  const flashcards = useUserFlashcards();

  const [resolvedMetadata, setResolvedMetadata] = useState<{
    pinyin: string;
    definitions: string;
  } | null>(null);

  const headword = target?.traditional || target?.word || '';
  const simplified = target?.simplified || target?.word || headword;

  // Resolve dictionary entry details if missing
  useEffect(() => {
    let cancelled = false;

    if (!target) {
      setResolvedMetadata(null);
      return;
    }

    const pinyinStr = formatPinyin(target.pinyin);
    const defsStr = formatDefinitions(target.definitions);

    if (pinyinStr && defsStr) {
      setResolvedMetadata({ pinyin: pinyinStr, definitions: defsStr });
      return;
    }

    getDictionaryEntries(headword).then((entries) => {
      if (cancelled) return;
      const first = entries[0];
      setResolvedMetadata({
        pinyin: pinyinStr || formatPinyin(first?.pinyin),
        definitions: defsStr || formatDefinitions(first?.definitions),
      });
    }).catch(() => {
      if (!cancelled) {
        setResolvedMetadata({ pinyin: pinyinStr || '', definitions: defsStr || '' });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [target, headword]);

  const isFavorite = useMemo(() => {
    if (!headword) return false;
    return favorites.includes(headword) || (target?.word ? favorites.includes(target.word) : false);
  }, [favorites, headword, target?.word]);

  // Map of folderId -> flashcardId for this word
  const savedFolderCardsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!headword) return map;

    for (const card of flashcards) {
      const match =
        card.traditional === headword ||
        card.simplified === headword ||
        (target?.simplified && (card.simplified === target.simplified || card.traditional === target.simplified));
      if (match && card.folderId) {
        map.set(card.folderId, card.id);
      }
    }
    return map;
  }, [flashcards, headword, target?.simplified]);

  const toggleFavorite = useCallback(() => {
    if (!headword) return;
    toggleFavoriteStore(headword);
  }, [headword, toggleFavoriteStore]);

  const toggleFolder = useCallback(async (folderId: string) => {
    if (!headword) return;

    const existingCardId = savedFolderCardsMap.get(folderId);

    if (existingCardId) {
      // Remove from folder
      if (currentUser) {
        await flashcardService.deleteFlashcard(currentUser.id, existingCardId);
      } else {
        deleteLocalFlashcard(existingCardId);
      }
    } else {
      // Add to folder
      const newCard: UserFlashcard = {
        id: crypto.randomUUID(),
        userId: currentUser?.id || 'guest',
        folderId,
        simplified,
        traditional: headword,
        pinyin: resolvedMetadata?.pinyin || '',
        translation: resolvedMetadata?.definitions || '',
        createdAt: Date.now(),
      };

      if (currentUser) {
        await flashcardService.createFlashcard(newCard);
      } else {
        addLocalFlashcard(newCard);
      }

      // Pre-warm neural audio
      audioService.preloadNeural([headword]).catch(() => {});
    }
  }, [
    headword,
    simplified,
    savedFolderCardsMap,
    currentUser,
    deleteLocalFlashcard,
    addLocalFlashcard,
    resolvedMetadata,
  ]);

  const createFolderAndAdd = useCallback(async (name: string, colorId: string) => {
    const trimmed = name.trim();
    if (!trimmed || !headword) return;

    const folderId = crypto.randomUUID();
    const chosenColor = resolveFolderColor(colorId);
    const folderColor = JSON.stringify({
      colorId: chosenColor.id,
      front: chosenColor.front,
      back: chosenColor.back,
      accentBg: chosenColor.accentBg,
      accentBorder: chosenColor.accentBorder,
      accent: chosenColor.accent,
    });

    if (currentUser) {
      await flashcardService.createFolder(currentUser.id, {
        id: folderId,
        name: trimmed,
        color: folderColor,
      });
    }
    addCustomFolder(trimmed, folderColor, folderId);

    // Immediately add the word to the new folder
    const newCard: UserFlashcard = {
      id: crypto.randomUUID(),
      userId: currentUser?.id || 'guest',
      folderId,
      simplified,
      traditional: headword,
      pinyin: resolvedMetadata?.pinyin || '',
      translation: resolvedMetadata?.definitions || '',
      createdAt: Date.now(),
    };

    if (currentUser) {
      await flashcardService.createFlashcard(newCard);
    } else {
      addLocalFlashcard(newCard);
    }

    audioService.preloadNeural([headword]).catch(() => {});
  }, [headword, simplified, currentUser, addCustomFolder, addLocalFlashcard, resolvedMetadata]);

  return {
    headword,
    simplified,
    pinyin: resolvedMetadata?.pinyin || '',
    definitions: resolvedMetadata?.definitions || '',
    isFavorite,
    savedFolderCardsMap,
    customFolders,
    toggleFavorite,
    toggleFolder,
    createFolderAndAdd,
  };
}
