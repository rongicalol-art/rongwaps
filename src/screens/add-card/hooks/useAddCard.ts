import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { flashcardService } from '../../../services/flashcardService';
import { useDictionarySearch, SearchResult } from '../../../hooks/useDictionarySearch';

type ViewState = 'front' | 'back';
type Direction = 'fwd' | 'back' | 'none';

export function useAddCard(onClose: () => void) {
  const { currentUser } = useAuth();
  const { customFolders, libraryActiveFolder } = useAppStore();
  
  const folderId = libraryActiveFolder;
  const folderName = folderId === 'starred' ? 'Starred' : customFolders.find(f => f.id === folderId)?.name || 'Library';
  
  // App State
  const [view, setView] = useState<ViewState>('front');
  const [direction, setDirection] = useState<Direction>('none');
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
    
    setDirection('fwd');
    setView('back');
  };

  const handleNext = () => {
    if (cardData.front.trim()) {
      const exactMatch = suggestions.find(s => s.traditional === cardData.front.trim() || s.simplified === cardData.front.trim());
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

      setDirection('fwd');
      setView('back');
    }
  };

  const handleBack = () => {
    setDirection('back');
    setView('front');
  };

  const handleSave = async () => {
    if (!currentUser) {
      setSaveError("Please login via the Profile tab to save your vocabulary cards.");
      return;
    }
    if (cardData.meaning.trim() && cardData.front.trim()) {
      try {
        await flashcardService.createFlashcard({
          id: crypto.randomUUID(),
          userId: currentUser.id,
          folderId: folderId === 'starred' ? 'custom' : folderId,
          simplified: cardData.front.trim(),
          traditional: cardData.front.trim(),
          pinyin: cardData.pinyin.trim(),
          translation: cardData.meaning.trim(),
          measure_words: cardData.measureWords && cardData.measureWords.length > 0 ? cardData.measureWords : undefined,
          createdAt: Date.now()
        });

        setSaveError(null);
        setDirection('fwd');
        setCardData({ front: '', meaning: '', pinyin: '', availableMeanings: [], measureWords: [] });
        setView('front');
      } catch (e) {
        console.error("Failed to save flashcard", e);
        setSaveError("Failed to save card. Please try again.");
      }
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
    setView,
    direction,
    setDirection,
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
