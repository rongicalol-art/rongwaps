import { useEffect, useRef } from 'react';
import type { InteractiveGrammarPart } from '../../../types/models';

interface GrammarLessonKeyboardNavigationOptions {
  isBookOpen: boolean;
  isConfusionOpen: boolean;
  previousPage: InteractiveGrammarPart['grammarPages'][number] | null;
  continueAfterStudy: () => void;
  goBackToPreviousGrammar: () => void;
  navigateToPart: (direction: 'next' | 'previous') => void;
  currentGrammarIndex: number;
  part: InteractiveGrammarPart;
  onClose: () => void;
}

/** Window-level keyboard shortcuts for the grammar lesson window. */
export function useGrammarLessonKeyboardNavigation({
  isBookOpen,
  isConfusionOpen,
  previousPage,
  continueAfterStudy,
  goBackToPreviousGrammar,
  navigateToPart,
  currentGrammarIndex,
  part,
  onClose,
}: GrammarLessonKeyboardNavigationOptions) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isBookOpen || isConfusionOpen) return;
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key === 'ArrowRight' && event.shiftKey) {
        event.preventDefault();
        navigateToPart('next');
      } else if (event.key === 'ArrowLeft' && event.shiftKey) {
        event.preventDefault();
        navigateToPart('previous');
      } else if (event.key === ']' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        navigateToPart('next');
      } else if (event.key === '[' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        navigateToPart('previous');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.repeat && currentGrammarIndex >= part.grammarPages.length - 1) return;
        continueAfterStudy();
      } else if (event.key === 'ArrowLeft' && previousPage) {
        event.preventDefault();
        goBackToPreviousGrammar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBookOpen, isConfusionOpen, previousPage, continueAfterStudy, goBackToPreviousGrammar, navigateToPart, currentGrammarIndex, part]);
}
