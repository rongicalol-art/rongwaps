import { canEditFolder } from '../../../utils/vocabulary/folderCollaboration';
import { debugLogger } from '../../../utils/debug/debugLogger';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { flashcardService } from '../../../services/flashcardService';
import { useDictionarySearch, SearchResult } from '../../../hooks/useDictionarySearch';

type ViewState = 'front' | 'back';

import { resolveFolderColor } from '../../../utils/folderColors';
import { meaningText } from '../../../utils/vocabulary/dictionaryDefinitions';

export function useAddCard(onClose: () => void) {
  const { currentUser } = useAuth();
  const customFolders = useAppStore((state) => state.customFolders);
  const libraryActiveFolder = useAppStore((state) => state.libraryActiveFolder);
  const addLocalFlashcard = useAppStore((state) => state.addLocalFlashcard);
  
  const folderId = libraryActiveFolder;
  const targetFolder = customFolders.find(f => f.id === folderId);
  const folderName = folderId === 'starred' ? 'Starred' : targetFolder?.name || 'Library';
  const folderAccent = folderId === 'starred'
    ? 'text-feedback-warning-text'
    : targetFolder
    ? resolveFolderColor(targetFolder.color).accent
    : 'text-brand-primary';
  
  // App State
  const [view, setView] = useState<ViewState>('front');
  const [cardData, setCardData] = useState({ 
    front: '', 
    meaning: '', 
    pinyin: '', 
    availableMeanings: [] as string[], 
    measureWords: [] as string[] 
  });
  
  // UI State
  const [isFocused, setIsFocused] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const meaningInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Smart Dictionary Suggestions
  const { results: suggestions, isSearching } = useDictionarySearch(cardData.front);

  // Auto-resize textarea
  useLayoutEffect(() => {
    if (meaningInputRef.current) {
      meaningInputRef.current.style.height = 'auto';
      meaningInputRef.current.style.height = meaningInputRef.current.scrollHeight + 'px';
    }
  }, [cardData.meaning, view]);

  // Auto-focus inputs on screen change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (view === 'front' && frontInputRef.current) {
        frontInputRef.current.focus();
      } else if (view === 'back' && meaningInputRef.current) {
        meaningInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [view]);

  const handleSelectSuggestion = (entry: SearchResult) => {
    const defs = entry.definitions && Array.isArray(entry.definitions) ? entry.definitions : [];
    const firstDef = defs.length > 0 ? defs[0] : '';

    setCardData({
      ...cardData,
      front: entry.traditional || entry.simplified,
      meaning: firstDef,
      pinyin: entry.pinyin_accented || '',
      availableMeanings: defs,
      measureWords: entry.measure_words || []
    });
    
    setView('back');
  };

  const handleNext = () => {
    if (cardData.front.trim()) {
      const typed = cardData.front.trim();
      // Continue uses exactly what was typed; a result is only taken when tapped.
      const exactMatch = suggestions.find(s => s.traditional === typed || s.simplified === typed);
      let newMeanings = cardData.availableMeanings;
      let newMeaning = cardData.meaning;
      let newPinyin = cardData.pinyin;
      let newMeasureWords = cardData.measureWords;

      if (exactMatch && newMeanings.length === 0) {
        newMeanings = Array.isArray(exactMatch.definitions) ? exactMatch.definitions : [];
        if (!newMeaning && newMeanings.length > 0) newMeaning = newMeanings[0];
        if (!newPinyin) newPinyin = exactMatch.pinyin_accented || '';
        if (newMeasureWords.length === 0 && exactMatch.measure_words) newMeasureWords = exactMatch.measure_words;
      }

      if (newMeanings.length > 0 || newPinyin || newMeaning || newMeasureWords.length > 0) {
        setCardData({
          ...cardData,
          meaning: newMeaning || cardData.meaning,
          pinyin: newPinyin || cardData.pinyin,
          availableMeanings: newMeanings,
          measureWords: newMeasureWords
        });
      }

      setView('back');
    }
  };

  const handleBack = () => {
    setView('front');
  };

  const handleSave = async () => {
    if (!canEditFolder(targetFolder)) { setSaveError('You can only view this folder.'); return; }
    if (cardData.meaning.trim() && cardData.front.trim()) {
      const newCard = {
        id: crypto.randomUUID(),
        userId: currentUser?.id || 'guest',
        folderId: folderId === 'starred' ? 'custom' : folderId,
        simplified: cardData.front.trim(),
        traditional: cardData.front.trim(),
        pinyin: cardData.pinyin.trim(),
        translation: meaningText(cardData.meaning),
        measure_words: cardData.measureWords && cardData.measureWords.length > 0 ? cardData.measureWords : undefined,
        createdAt: Date.now()
      };

      // Close the screen first so the exit transition starts instantly
      onClose();

      // Defer the state write until the transition is complete
      setTimeout(async () => {
        try {
          if (currentUser) {
            await flashcardService.createFlashcard(newCard);
          } else {
            addLocalFlashcard(newCard);
          }
        } catch (e) {
          debugLogger.error('Supabase', "Failed to save flashcard asynchronously:", e);
        }
      }, 350);
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
    folderAccent,
    view,
    setView,
    cardData,
    setCardData,
    isFocused,
    setIsFocused,
    saveError,
    setSaveError,
    frontInputRef,
    meaningInputRef,
    suggestions,
    isSearching,
    handleSelectSuggestion,
    handleNext,
    handleBack,
    handleSave,
    handleKeyDown
  };
}
