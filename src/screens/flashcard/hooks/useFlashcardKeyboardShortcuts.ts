import { useEffect, useRef } from 'react';
import type { Flashcard } from '../../../data/flashcards';

export interface UseFlashcardKeyboardShortcutsOptions {
  completed: boolean;
  /** The review deal intro owns the keyboard (Space / Enter deal it). */
  isIntroActive?: boolean;
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
  onToggleFlow: () => void;
  onPlayExample: () => void;
}

export function useFlashcardKeyboardShortcuts({
  completed,
  isIntroActive = false,
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
  onToggleFlow,
  onPlayExample,
}: UseFlashcardKeyboardShortcutsOptions) {
  const currentIndexRef = useRef(currentIndex);
  const cardsLengthRef = useRef(cardsLength);
  const maxVisitedIndexRef = useRef(maxVisitedIndex);
  const currentCardRef = useRef(currentCard);
  const isReviewDeckRef = useRef(isReviewDeck);
  const completedRef = useRef(completed);
  const introRef = useRef(isIntroActive);
  const onToggleHintRef = useRef(onToggleHint);

  currentIndexRef.current = currentIndex;
  cardsLengthRef.current = cardsLength;
  maxVisitedIndexRef.current = maxVisitedIndex;
  currentCardRef.current = currentCard;
  isReviewDeckRef.current = isReviewDeck;
  completedRef.current = completed;
  introRef.current = isIntroActive;
  onToggleHintRef.current = onToggleHint;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completedRef.current || introRef.current || e.defaultPrevented || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[role="dialog"][aria-label^="Lesson "]')) return;
      const target = e.target instanceof HTMLElement ? e.target : document.activeElement;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
      if (activeBreakdown) return;
      if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      if (['ArrowLeft', 'ArrowRight', ' ', '1', '2', '3'].includes(e.key) || e.key === 'h' || e.key === 'H') {
        pauseFlow();
      }

      const idx = currentIndexRef.current;
      const maxIdx = maxVisitedIndexRef.current;
      const card = currentCardRef.current;
      const reviewDeck = isReviewDeckRef.current;

      if (e.key.toLowerCase() === 'f') {
        if (card) { e.preventDefault(); onToggleFlow(); }
      } else if (e.key.toLowerCase() === 'e') {
        if (card) { e.preventDefault(); onPlayExample(); }
      } else if (e.key === 'ArrowLeft') {
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
    onToggleFlow,
    onPlayExample,
    pauseFlow,
    setIsFlipped,
    triggerKeyboardRate,
    triggerNav,
  ]);
}
