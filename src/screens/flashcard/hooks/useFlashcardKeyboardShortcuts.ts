import { useEffect, useRef } from 'react';
import type { Flashcard } from '../../../data/flashcards';

export interface UseFlashcardKeyboardShortcutsOptions {
  completed: boolean;
  /** The review deal intro owns the keyboard (Space / Enter deal it). */
  isIntroActive?: boolean;
  isWriting?: boolean;
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
  onToggleHint?: () => void;
}

export function useFlashcardKeyboardShortcuts({
  completed,
  isIntroActive = false,
  isWriting = false,
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
  onToggleHint,
}: UseFlashcardKeyboardShortcutsOptions) {
  const currentIndexRef = useRef(currentIndex);
  const cardsLengthRef = useRef(cardsLength);
  const maxVisitedIndexRef = useRef(maxVisitedIndex);
  const currentCardRef = useRef(currentCard);
  const isReviewDeckRef = useRef(isReviewDeck);
  const completedRef = useRef(completed);
  const introRef = useRef(isIntroActive);
  const writingRef = useRef(isWriting);
  const onToggleHintRef = useRef(onToggleHint);

  currentIndexRef.current = currentIndex;
  cardsLengthRef.current = cardsLength;
  maxVisitedIndexRef.current = maxVisitedIndex;
  currentCardRef.current = currentCard;
  isReviewDeckRef.current = isReviewDeck;
  completedRef.current = completed;
  introRef.current = isIntroActive;
  writingRef.current = isWriting;
  onToggleHintRef.current = onToggleHint;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completedRef.current || introRef.current || writingRef.current) return;
      if (document.querySelector('[role="dialog"][aria-label^="Lesson "]')) return;
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      )
        return;
      if (activeBreakdown) return;
      if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      if (['ArrowLeft', 'ArrowRight', ' ', '1', '2', '3'].includes(e.key) || e.key === 'h' || e.key === 'H') {
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
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        onToggleHintRef.current?.();
      } else if (e.key === '1') {
        // Hard
        if (card) triggerKeyboardRate(1, 1);
      } else if (e.key === '2') {
        // Unsure
        if (card) triggerKeyboardRate(2, 1);
      } else if (e.key === '3') {
        // Got it
        if (card) triggerKeyboardRate(3, -1);
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
