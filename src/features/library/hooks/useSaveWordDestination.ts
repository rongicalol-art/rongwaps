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

function formatPinyin(pinyin: string[] | string | null | undefined): string {
  if (!pinyin) return '';
  if (Array.isArray(pinyin)) return pinyin.join(' ');
  return pinyin;
}

const NO_FAVORITES: string[] = [];
/** CEDICT classifier lines ("CL:個|个[ge4]") are not meanings. */
const MEASURE_WORD_NOTE = /^CL:/;
const SURNAME_SENSE = /^(surname|family name)\b/i;
/** Dictionary shorthand a new learner should not have to decode. */
const TECHNICAL_SENSE = /^(abbr\.|variant of|old variant|also written|also pr\.|see |same as|erhua|short for|Taiwan pr\.|used in|\(|-)|\[[^\]]*\d\]|\|/i;

export function isTechnicalSense(sense: string): boolean {
  return SURNAME_SENSE.test(sense) || TECHNICAL_SENSE.test(sense);
}

function listSenses(defs: string | string[] | Record<string, unknown> | null | undefined): string[] {
  if (!defs) return [];
  const raw = typeof defs === 'string' ? [defs] : Array.isArray(defs) ? defs : Object.values(defs).map(String);
  return raw.map((d) => String(d).trim()).filter((d) => d && !MEASURE_WORD_NOTE.test(d));
}

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
  const updateLocalFlashcard = useAppStore((state) => state.updateLocalFlashcard);

  const flashcards = useUserFlashcards();

  const [resolvedMetadata, setResolvedMetadata] = useState<{
    pinyin: string;
    definitions: string;
  } | null>(null);
  /** Every sense the dictionary knows for this word, surnames last. */
  const [dictionarySenses, setDictionarySenses] = useState<string[]>([]);
  /** The senses the user wants saved; `null` until they change the default. */
  const [pickedParts, setPickedParts] = useState<string[] | null>(null);

  const headword = target?.traditional || target?.word || '';
  const simplified = target?.simplified || target?.word || headword;

  // Resolve dictionary entry details if missing
  useEffect(() => {
    let cancelled = false;

    if (!target) {
      setResolvedMetadata(null);
      setDictionarySenses([]);
      setPickedParts(null);
      return;
    }

    setPickedParts(null);
    const pinyinStr = formatPinyin(target.pinyin);
    const shownSenses = listSenses(target.definitions);
    // What the screen showed wins; otherwise the first non-surname senses.
    const defaultSenses = (list: string[]) => {
      const common = list.filter((d) => !isTechnicalSense(d));
      return (common.length ? common : list).slice(0, 2).join(' · ');
    };
    const shownDefs = shownSenses.length === 1 ? shownSenses[0] : defaultSenses(shownSenses);

    if (pinyinStr && shownDefs) {
      setResolvedMetadata({ pinyin: pinyinStr, definitions: shownDefs });
    }

    getDictionaryEntries(headword).then((entries) => {
      if (cancelled) return;
      const first = entries[0];
      const all = entries.flatMap((entry) => listSenses(entry.definitions));
      const unique = Array.from(new Set(all));
      setDictionarySenses([
        ...unique.filter((d) => !isTechnicalSense(d)),
        ...unique.filter((d) => isTechnicalSense(d)),
      ]);
      setResolvedMetadata({
        pinyin: pinyinStr || formatPinyin(first?.pinyin),
        definitions: shownDefs || defaultSenses(unique),
      });
    }).catch(() => {
      if (!cancelled) {
        setResolvedMetadata({ pinyin: pinyinStr || '', definitions: shownDefs || '' });
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

  // Map of folderId -> flashcardId for this word, plus the meaning it was saved with.
  const { savedFolderCardsMap, savedTranslation } = useMemo(() => {
    const map = new Map<string, string>();
    let translation = '';
    if (!headword) return { savedFolderCardsMap: map, savedTranslation: translation };

    for (const card of flashcards) {
      const match =
        card.traditional === headword ||
        card.simplified === headword ||
        (target?.simplified && (card.simplified === target.simplified || card.traditional === target.simplified));
      if (match && card.folderId) {
        map.set(card.folderId, card.id);
        if (!translation && card.translation) translation = card.translation;
      }
    }
    return { savedFolderCardsMap: map, savedTranslation: translation };
  }, [flashcards, headword, target?.simplified]);

  // The meaning that will be (or was) saved: the user's pick, else what the
  // word is already saved with, else what the opening screen showed.
  const defaultMeaning = savedTranslation || resolvedMetadata?.definitions || '';
  const selectedSenses = pickedParts ?? (defaultMeaning ? [defaultMeaning] : []);
  const meaning = selectedSenses.join('; ');
  const senseOptions = useMemo(() => {
    const seen = new Set<string>();
    // The meaning the screen showed is always pickable, even when the word was saved earlier with another one.
    return [resolvedMetadata?.definitions ?? '', defaultMeaning, ...dictionarySenses].filter((sense) => {
      if (!sense || seen.has(sense)) return false;
      seen.add(sense);
      return true;
    });
  }, [resolvedMetadata?.definitions, defaultMeaning, dictionarySenses]);

  const pickSense = useCallback((sense: string) => {
    const next = [sense];
    setPickedParts(next);

    // Saved cards follow the pick, so what is stored is what was intended.
    const translation = next.join('; ');
    for (const cardId of savedFolderCardsMap.values()) {
      if (currentUser) {
        void flashcardService.updateFlashcardTranslation(currentUser.id, cardId, translation).catch(() => {});
      } else {
        updateLocalFlashcard(cardId, { translation });
      }
    }
  }, [savedFolderCardsMap, currentUser, updateLocalFlashcard]);

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
        translation: meaning,
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
    meaning,
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
      translation: meaning,
      createdAt: Date.now(),
    };

    if (currentUser) {
      await flashcardService.createFlashcard(newCard);
    } else {
      addLocalFlashcard(newCard);
    }

    audioService.preloadNeural([headword]).catch(() => {});
  }, [headword, simplified, currentUser, addCustomFolder, addLocalFlashcard, resolvedMetadata, meaning]);

  return {
    headword,
    simplified,
    pinyin: resolvedMetadata?.pinyin || '',
    definitions: meaning,
    senseOptions,
    selectedSense: meaning,
    pickSense,
    isFavorite,
    savedFolderCardsMap,
    customFolders,
    toggleFavorite,
    toggleFolder,
    createFolderAndAdd,
  };
}
