import { debugLogger } from '../../../utils/debug/debugLogger';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { flashcardService } from '../../../services/flashcardService';
import { useDictionarySearch, SearchResult } from '../../../hooks/useDictionarySearch';
import { resolveFolderColor } from '../../../utils/folderColors';
import { meaningText } from '../../../utils/vocabulary/dictionaryDefinitions';

export function useAddCard(onClose: () => void) {
  const { currentUser } = useAuth();
  const customFolders = useAppStore((state) => state.customFolders);
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const addLocalFlashcard = useAppStore((state) => state.addLocalFlashcard);

  const folderId = libraryActiveFolder;
  const targetFolder = customFolders.find((f) => f.id === folderId);
  const folderName = folderId === 'starred' ? 'Starred' : targetFolder?.name || 'Library';
  const folderAccent =
    folderId === 'starred'
      ? 'text-feedback-warning-edge'
      : targetFolder
      ? resolveFolderColor(targetFolder.color).accent
      : 'text-brand-primary';

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

  // Smart Dictionary Suggestions
  const { results: suggestions } = useDictionarySearch(cardData.front);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      frontInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectSuggestion = (entry: SearchResult) => {
    const defs =
      entry.definitions && Array.isArray(entry.definitions)
        ? entry.definitions
        : typeof entry.definitions === 'string'
        ? [entry.definitions]
        : Object.values(entry.definitions as Record<string, string>);
    const firstDef = defs.length > 0 ? defs[0] : '';

    setCardData((prev) => ({
      ...prev,
      front: entry.traditional || entry.simplified,
      meaning: firstDef,
      pinyin: entry.pinyin_accented || '',
      availableMeanings: defs,
      measureWords: entry.measure_words || [],
    }));
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      void handleSave();
    }
  };

  return {
    folderName,
    folderAccent,
    cardData,
    setCardData,
    saveError,
    setSaveError,
    saving,
    frontInputRef,
    suggestions,
    handleSelectSuggestion,
    handleSave,
    handleKeyDown,
  };
}
