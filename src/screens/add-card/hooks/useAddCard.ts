import { debugLogger } from '../../../utils/debug/debugLogger';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { flashcardService } from '../../../services/flashcardService';
import { useDictionarySearch, SearchResult } from '../../../hooks/useDictionarySearch';
import { meaningText } from '../../../utils/vocabulary/dictionaryDefinitions';

export type AddCardView = 'front' | 'back';

export function useAddCard(onClose: () => void) {
  const { currentUser } = useAuth();
  const customFolders = useAppStore((state) => state.customFolders);
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const addLocalFlashcard = useAppStore((state) => state.addLocalFlashcard);

  const folderId = libraryActiveFolder;
  const targetFolder = customFolders.find((f) => f.id === folderId);
  const folderName = folderId === 'starred' ? 'Saved words' : targetFolder?.name || 'Custom cards';

  const [view, setView] = useState<AddCardView>('front');
  const [direction, setDirection] = useState<'fwd' | 'back' | 'none'>('none');

  const [cardData, setCardData] = useState({
    front: '',
    meaning: '',
    pinyin: '',
    notes: '',
    availableMeanings: [] as string[],
    measureWords: [] as string[],
  });

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const meaningInputRef = useRef<HTMLInputElement>(null);

  // Smart Dictionary Suggestions
  const { results: suggestions } = useDictionarySearch(cardData.front);

  // Focus management
  useEffect(() => {
    const timer = setTimeout(() => {
      if (view === 'front') {
        frontInputRef.current?.focus();
      } else {
        meaningInputRef.current?.focus();
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [view]);

  const handleSelectSuggestion = (entry: SearchResult) => {
    const defs = entry.definitions
      ? Array.isArray(entry.definitions)
        ? (entry.definitions as string[])
        : typeof entry.definitions === 'string'
        ? [entry.definitions]
        : Object.values(entry.definitions as Record<string, string>)
      : [];
    const firstDef = defs.length > 0 ? String(defs[0] ?? '') : '';

    setCardData((prev) => ({
      ...prev,
      front: entry.traditional || entry.simplified,
      meaning: prev.meaning || firstDef,
      pinyin: prev.pinyin || entry.pinyin_accented || '',
      availableMeanings: defs.map((d) => String(d ?? '')),
      measureWords: entry.measure_words || [],
    }));
  };

  const handleNext = () => {
    if (!cardData.front.trim()) return;

    // If an exact dictionary match exists and meaning wasn't filled yet, auto-populate
    const exactMatch = suggestions.find(
      (s) =>
        s.traditional === cardData.front.trim() ||
        s.simplified === cardData.front.trim(),
    );

    if (exactMatch && !cardData.meaning) {
      const defs = exactMatch.definitions
        ? Array.isArray(exactMatch.definitions)
          ? exactMatch.definitions
          : typeof exactMatch.definitions === 'string'
          ? [exactMatch.definitions]
          : Object.values(exactMatch.definitions)
        : [];
      const firstDef = defs.length > 0 ? String(defs[0] ?? '') : '';

      setCardData((prev) => ({
        ...prev,
        meaning: firstDef,
        pinyin: prev.pinyin || exactMatch.pinyin_accented || '',
        availableMeanings: defs.map((d) => String(d ?? '')),
        measureWords: exactMatch.measure_words || prev.measureWords,
      }));
    }

    setDirection('fwd');
    setView('back');
  };

  const handleBack = () => {
    setDirection('back');
    setView('front');
  };

  const handleSave = async () => {
    if (!cardData.front.trim() || !cardData.meaning.trim() || saving) return;
    setSaving(true);

    const newCard = {
      id: crypto.randomUUID(),
      userId: currentUser?.id || 'guest',
      folderId: folderId === 'starred' ? 'custom' : folderId,
      simplified: cardData.front.trim(),
      traditional: cardData.front.trim(),
      pinyin: cardData.pinyin.trim() || undefined,
      translation: meaningText(cardData.meaning),
      notes: cardData.notes.trim() || undefined,
      measure_words:
        cardData.measureWords && cardData.measureWords.length > 0
          ? cardData.measureWords
          : undefined,
      createdAt: Date.now(),
    };

    try {
      if (currentUser) {
        await flashcardService.createFlashcard(newCard);
      } else {
        addLocalFlashcard(newCard);
      }
      onClose();
    } catch (e) {
      debugLogger.error('Supabase', 'Failed to save flashcard:', e);
      setSaveError("Couldn't save card. Please try again.");
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return {
    folderName,
    view,
    direction,
    cardData,
    setCardData,
    saveError,
    setSaveError,
    saving,
    frontInputRef,
    meaningInputRef,
    suggestions,
    handleSelectSuggestion,
    handleNext,
    handleBack,
    handleSave,
    handleKeyDown,
  };
}
