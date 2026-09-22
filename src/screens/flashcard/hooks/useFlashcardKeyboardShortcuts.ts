import { useEffect, useRef } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import type { FlashcardViewMode } from '../FlashcardScreen';

export interface UseFlashcardKeyboardShortcutsOptions {
  completed: boolean;
  mode: FlashcardViewMode;
  activeBreakdown: string | null;
  currentIndex: number;
  maxVisitedIndex: number;
  cardsLength: number;
  currentCard: Flashcard | null;
  isReviewDeck: boolean;
  autoPlayAudio: boolean;
  pauseFlow: () => void;
  triggerNav: (dir: number) => void;
  triggerKeyboardRate: (level: number, dir: number) => void;
  setIsFlipped: (value: boolean | ((prev: boolean) => boolean)) => void;
  onManualRevealAudio: () => void;
}

export function useFlashcardKeyboardShortcuts({
  completed,
  mode,
  activeBreakdown,
  currentIndex,
  maxVisitedIndex,
  cardsLength,
  currentCard,
  isReviewDeck,
  autoPlayAudio,
  pauseFlow,
  triggerNav,
  triggerKeyboardRate,
  setIsFlipped,
  onManualRevealAudio,
}: UseFlashcardKeyboardShortcutsOptions) {
  const currentIndexRef = useRef(currentIndex);
  const cardsLengthRef = useRef(cardsLength);
  const maxVisitedIndexRef = useRef(maxVisitedIndex);
  const currentCardRef = useRef(currentCard);
  const isReviewDeckRef = useRef(isReviewDeck);
  const completedRef = useRef(completed);
  const modeRef = useRef(mode);

  currentIndexRef.current = currentIndex;
  cardsLengthRef.current = cardsLength;
  maxVisitedIndexRef.current = maxVisitedIndex;
  currentCardRef.current = currentCard;
  isReviewDeckRef.current = isReviewDeck;
  completedRef.current = completed;
  modeRef.current = mode;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completedRef.current || modeRef.current === 'list') return;
      if (document.querySelector('[role="dialog"][aria-label^="Lesson "]')) return;
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      )
        return;
      if (activeBreakdown) return;
      if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      if (['ArrowLeft', 'ArrowRight', ' ', 'm', 'M', 'n', 'N'].includes(e.key)) {
        pauseFlow();
      }

      const idx = currentIndexRef.current;
      const maxIdx = maxVisitedIndexRef.current;
      const card = currentCardRef.current;
      const reviewDeck = isReviewDeckRef.current;

      if (e.key === 'ArrowLeft') {
        if (idx > 0) triggerNav(-1);
      } else if (e.key === 'ArrowRight') {
        const canGoNext = (!reviewDeck || idx < maxIdx) && idx < cardsLengthRef.current;
        if (canGoNext) triggerNav(1);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev: boolean) => {
          const next = !prev;
          if (next && card && !autoPlayAudio) {
            onManualRevealAudio();
          }
          return next;
        });
      } else if (e.key === 'm' || e.key === 'M') {
        if (!card) return;
        triggerKeyboardRate(3, -1);
      } else if (e.key === 'n' || e.key === 'N') {
        if (!card) return;
        triggerKeyboardRate(1, 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeBreakdown,
    autoPlayAudio,
    onManualRevealAudio,
    pauseFlow,
    setIsFlipped,
    triggerKeyboardRate,
    triggerNav,
  ]);
}
