import React, { useState, useEffect } from 'react';
import { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { audioService } from '../../../services/audioService';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';

// Helper to shuffle arrays
const shuffle = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

export function useQuizLoader(activeBookId: number, selectedLessons: number[], isLibraryDeck: boolean = false, isReviewDeck: boolean = false) {
  return useActivityDataLoader(activeBookId, selectedLessons, isReviewDeck, isLibraryDeck);
}

/**
 * Manages a multiple-choice quiz session.
 *
 * For each card, 3 options are shown: the correct answer + 2 random
 * wrong answers from the same deck. The check flow is two-phase:
 *   First click → check the answer and show correct/wrong feedback
 *   Second click → advance to the next card (or complete the session)
 */
export function useQuizChoices(cards: Flashcard[], sessionKey: string, onEnd: () => void) {
  const { markCardReviewed, sessionProgressIndex, setSessionProgressIndex, clearSessionProgressIndex } = useAppStore();
  
  const [activeCards, setActiveCards] = useState<Flashcard[]>(cards);
  useEffect(() => { setActiveCards(cards); }, [cards]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  const storeIndexChoices = sessionProgressIndex[sessionKey];
  useEffect(() => {
    if (storeIndexChoices !== undefined && storeIndexChoices !== currentIndex) {
      setCurrentIndex(storeIndexChoices);
    }
  }, [storeIndexChoices]);

  useEffect(() => {
    if (activeCards.length > 0 && currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  // Save progress
  useEffect(() => {
    setSessionProgressIndex(sessionKey, currentIndex);
  }, [currentIndex, sessionKey, setSessionProgressIndex]);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [options, setOptions] = useState<Flashcard[]>([]);
  
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  // Preload audio
  useEffect(() => {
    if (activeCards.length > 0) {
      audioService.preload(activeCards.map(c => c.audio));
    }
  }, [activeCards]);

  const currentCard = activeCards[currentIndex];

  useEffect(() => {
    if (currentCard && activeCards.length > 0) {
      const others = cards.filter(c => c.id !== currentCard.id);
      const wrongCount = Math.min(2, others.length); // 3 options total
      const shuffledOthers = shuffle(others).slice(0, wrongCount);
      setOptions(shuffle([currentCard, ...shuffledOthers]));
      setSelectedOption(null);
      setIsChecked(false);
    }
  }, [currentCard?.id]);

  const isCorrect = selectedOption === currentCard?.back;

  const handleCheck = () => {
    if (!selectedOption) return;
    
    if (isChecked) {
      setIsChecked(false); // Reset before moving to next card
      if (currentIndex < activeCards.length - 1) {
        setCurrentIndex(c => c + 1);
      } else {
        clearSessionProgressIndex(sessionKey);
        setCompleted(true);
      }
    } else {
      setIsChecked(true);
      if (currentCard) {
        audioService.play(currentCard.audio, 1.0, currentCard.front);
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
      audioService.play(currentCard.audio, 1.0, currentCard.front);
      markCardReviewed(currentCard.id, 2);
      setSessionResults(prev => ({ ...prev, [currentCard.id]: 2 }));
    }
  };

  const resetAll = () => {
    setActiveCards(cards);
    setCurrentIndex(0);
    setCompleted(false);
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
    setCompleted(false);
    setSessionResults({});
    setIsChecked(false);
    setSelectedOption(null);
  };

  const unlearnedCount = Object.values(sessionResults).filter(q => (q as number) === 1 || (q as number) === 2).length;
  const learnedCount = Object.values(sessionResults).filter(q => (q as number) > 2).length;

  return {
    activeCards,
    currentIndex,
    currentCard,
    options,
    selectedOption,
    setSelectedOption,
    isChecked,
    isCorrect,
    handleCheck,
    handleSkip,
    completed,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount
  };
}

/**
 * Manages a typing-based quiz session where users type the answer
 * (pinyin or English meaning) for each flashcard.
 *
 * Answer matching uses a multi-step normalization pipeline:
 *   1. Strip punctuation (both English and Chinese)
 *   2. Collapse whitespace
 *   3. Strip diacritics (tone marks) so "nǐ" matches "ni"
 *   4. Strip tone numbers so "ni3" matches "ni"
 *
 * The user's input is compared against the card's back (English) and
 * pinyin fields. Any match counts as correct.
 *
 * The check flow is two-phase:
 *   First click → check the answer and show correct/wrong feedback
 *   Second click → advance to the next card (or complete the session)
 */
export function useQuizTyping(cards: Flashcard[], sessionKey: string, onEnd: () => void) {
  const { markCardReviewed, sessionProgressIndex, setSessionProgressIndex, clearSessionProgressIndex } = useAppStore();
  
  const [activeCards, setActiveCards] = useState<Flashcard[]>(cards);
  useEffect(() => { setActiveCards(cards); }, [cards]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    return sessionProgressIndex[sessionKey] || 0;
  });

  const storeIndexTyping = sessionProgressIndex[sessionKey];
  useEffect(() => {
    if (storeIndexTyping !== undefined && storeIndexTyping !== currentIndex) {
      setCurrentIndex(storeIndexTyping);
    }
  }, [storeIndexTyping]);

  useEffect(() => {
    if (activeCards.length > 0 && currentIndex >= activeCards.length) {
      setCurrentIndex(0);
    }
  }, [activeCards.length, currentIndex]);

  // Save progress
  useEffect(() => {
    setSessionProgressIndex(sessionKey, currentIndex);
  }, [currentIndex, sessionKey, setSessionProgressIndex]);
  
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  
  const [sessionResults, setSessionResults] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  // Preload audio
  useEffect(() => {
    if (activeCards.length > 0) {
      audioService.preload(activeCards.map(c => c.audio));
    }
  }, [activeCards]);

  const currentCard = activeCards[currentIndex];

  const handleCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    if (status !== 'idle') {
      if (currentIndex < activeCards.length - 1) {
        setCurrentIndex(c => c + 1);
        setInput('');
        setStatus('idle');
      } else {
        clearSessionProgressIndex(sessionKey);
        setCompleted(true);
      }
      return;
    }
    
    if (currentCard) {
      audioService.play(currentCard.audio, 1.0, currentCard.front);
    }
    
    // ── Normalization pipeline ──────────────────────────────────────────
    // We normalize both the user's input and the correct answers so that
    // minor differences (punctuation, whitespace, tone marks, tone numbers)
    // don't cause a wrong answer. This makes the typing quiz forgiving
    // and focused on actual knowledge, not formatting.
    const normalizedInput = input.toLowerCase().trim().replace(/[.,!?。，！？]/g, '');
    const cleanInput = normalizedInput.replace(/\s+/g, ' ');
    // Strip diacritics (e.g. nǐ → ni) and tone numbers (e.g. ni3 → ni)
    const superCleanInput = cleanInput.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[1-5]/g, "").replace(/\s+/g, '');
    
    const correctAnswers = [
      currentCard.back.toLowerCase(),
      currentCard.pinyin?.toLowerCase() || ''
    ].flatMap(a => a.split(',').map(s => s.trim().replace(/[.,!?。，！？]/g, '')));
    
    const isCorrect = correctAnswers.some(ans => {
      if (!ans) return false;
      const cleanAns = ans.replace(/\s+/g, ' ');
      const superCleanAns = ans.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[1-5]/g, "").replace(/\s+/g, '');
      return cleanAns === cleanInput || superCleanAns === superCleanInput;
    });

    setStatus(isCorrect ? 'correct' : 'wrong');
    markCardReviewed(currentCard.id, isCorrect ? 4 : 2);
    setSessionResults(prev => ({ ...prev, [currentCard.id]: isCorrect ? 4 : 2 }));
  };

  const handleSkip = () => {
    if (status !== 'idle') return handleCheck();
    if (currentCard) {
      audioService.play(currentCard.audio, 1.0, currentCard.front);
    }
    setStatus('wrong');
    markCardReviewed(currentCard?.id || '', 2);
    setSessionResults(prev => ({ ...prev, [currentCard?.id || '']: 2 }));
  };

  const resetAll = () => {
    setActiveCards(cards);
    setCurrentIndex(0);
    setCompleted(false);
    setSessionResults({});
    setStatus('idle');
    setInput('');
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
    setCompleted(false);
    setSessionResults({});
    setStatus('idle');
    setInput('');
  };

  const unlearnedCount = Object.values(sessionResults).filter(q => (q as number) === 1 || (q as number) === 2).length;
  const learnedCount = Object.values(sessionResults).filter(q => (q as number) > 2).length;

  return {
    activeCards,
    currentIndex,
    currentCard,
    input,
    setInput,
    status,
    handleCheck,
    handleSkip,
    completed,
    resetAll,
    reviewUnlearned,
    unlearnedCount,
    learnedCount
  };
}
