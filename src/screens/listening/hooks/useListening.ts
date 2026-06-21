import { useState, useEffect, useMemo } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';

export function useListening(activeBookId: number, selectedLessons: number[], isLibraryDeck: boolean = false, isReviewDeck: boolean = false) {
  const { markCardReviewed, sessionProgressIndex, setSessionProgressIndex, clearSessionProgressIndex, libraryActiveFolder } = useAppStore();
  const sessionKey = isReviewDeck ? `shared_deck_review_${activeBookId}` : isLibraryDeck ? `shared_deck_library_${libraryActiveFolder}` : `shared_deck_${activeBookId}_${selectedLessons?.slice().sort().join(',') || 'all'}`;
  
  const [screenState, setScreenState] = useState<'playing' | 'complete'>('playing');
  const [currentIndex, setCurrentIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  const storeIndex = sessionProgressIndex[sessionKey];
  useEffect(() => {
    if (storeIndex !== undefined && storeIndex !== currentIndex) {
      setCurrentIndex(storeIndex);
    }
  }, [storeIndex]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  const { cards: loadedCards, isLoading } = useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeCards, setActiveCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    setCards(loadedCards);
    setActiveCards(loadedCards);
    if (loadedCards.length > 0) {
      audioService.preload(loadedCards.map(c => c.audio));
    }
  }, [loadedCards]);
  
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});

  useEffect(() => {
    if (activeCards.length > 0 && currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  // Read playlist...
  const playlist = useMemo(() => {
    return activeCards.length > 0 ? activeCards : [];
  }, [activeCards]);

  const currentCard = playlist[currentIndex];

  // Generate shuffled options
  const options = useMemo(() => {
    if (!currentCard || cards.length === 0) return [];
    
    // Get 2 random other meanings
    const otherCards = cards.filter(c => c.id !== currentCard.id);
    const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
    const wrongOptions = shuffledOthers.slice(0, 2).map(c => c.back);
    
    const allOptions = [currentCard.back, ...wrongOptions];
    return allOptions.sort(() => 0.5 - Math.random());
  }, [currentCard, cards]);

  const playAudio = async (rate: number = 1.0) => {
    if (!currentCard) return;
    
    setIsPlaying(true);
    await audioService.play(currentCard.audio, rate, currentCard.front);
    setIsPlaying(false);
  };

  // Play audio on new word
  useEffect(() => {
    if (screenState !== 'playing') return;
    if (currentIndex >= playlist.length) return;
    const t = setTimeout(() => playAudio(1.0), 400);
    return () => clearTimeout(t);
  }, [currentIndex, screenState, playlist]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // Save progress
  useEffect(() => {
    setSessionProgressIndex(sessionKey, currentIndex);
  }, [currentIndex, sessionKey, setSessionProgressIndex]);

  const handleCheck = () => {
    if (!selectedOption) return;
    
    if (isChecked) {
      // Proceed to next action
      setIsChecked(false);
      setSelectedOption(null);
      
      // Proceed to next or complete
      if (currentIndex < playlist.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        clearSessionProgressIndex(sessionKey);
        setScreenState('complete');
      }
    } else {
      // Check answer
      setIsChecked(true);
      if (currentCard) {
        const correct = selectedOption === currentCard.back;
        markCardReviewed(currentCard.id, correct ? 4 : 2);
        setSessionResults(prev => ({ ...prev, [currentCard.id]: correct ? 4 : 2 }));
      }
    }
  };

  const handleSkip = () => {
    if (isChecked) return handleCheck();
    setIsChecked(true);
    if (currentCard) {
      markCardReviewed(currentCard.id, 2);
      setSessionResults(prev => ({ ...prev, [currentCard.id]: 2 }));
    }
  };

  const resetAll = () => {
    setActiveCards(cards);
    setCurrentIndex(0);
    setScreenState('playing');
    setSessionResults({});
    setIsChecked(false);
    setSelectedOption(null);
  };

  const reviewUnlearned = () => {
    const unlearnedIds = Object.entries(sessionResults)
      .filter(([id, q]) => q === 1 || q === 2)
      .map(([id]) => id);
      
    const unlearnedCards = cards.filter(c => unlearnedIds.includes(c.id));
    if (unlearnedCards.length === 0) {
       resetAll();
       return;
    }
    setActiveCards(unlearnedCards);
    setCurrentIndex(0);
    setScreenState('playing');
    setSessionResults({});
    setIsChecked(false);
    setSelectedOption(null);
  };

  const unlearnedCount = Object.values(sessionResults).filter(q => (q as number) === 1 || (q as number) === 2).length;
  const learnedCount = Object.values(sessionResults).filter(q => (q as number) > 2).length;

  const isCorrect = selectedOption === currentCard?.back;

  return {
    screenState,
    setScreenState,
    currentIndex,
    playlist,
    currentCard,
    options,
    isPlaying,
    playAudio,
    selectedOption,
    setSelectedOption,
    isChecked,
    handleCheck,
    handleSkip,
    isCorrect,
    isLoading,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount
  };
}
