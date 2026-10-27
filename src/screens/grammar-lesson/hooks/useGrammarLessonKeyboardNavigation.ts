import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';

interface GrammarLessonKeyboardNavigationOptions {
  isBookOpen: boolean;
  isPracticing: boolean;
  /** A previous page, or an open exercise to step back out of. */
  canGoBack: boolean;
  continueAfterStudy: () => void;
  goBackToPreviousGrammar: () => void;
  currentGrammarIndex: number;
  grammarPageCount: number;
  onClose: () => void;
}

/** Window-level keyboard shortcuts for the grammar lesson window. */
export function useGrammarLessonKeyboardNavigation({
  isBookOpen,
  isPracticing,
  canGoBack,
  continueAfterStudy,
  goBackToPreviousGrammar,
  currentGrammarIndex,
  grammarPageCount,
  onClose,
}: GrammarLessonKeyboardNavigationOptions) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isBookOpen || useAppStore.getState().socialPanel) return;
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key === 'ArrowRight') {
        if (isPracticing) return;
        event.preventDefault();
        if (event.repeat && currentGrammarIndex >= grammarPageCount - 1) return;
        continueAfterStudy();
      } else if (event.key === 'ArrowLeft' && canGoBack) {
        if (isPracticing) return;
        event.preventDefault();
        goBackToPreviousGrammar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBookOpen, isPracticing, canGoBack, continueAfterStudy, goBackToPreviousGrammar, currentGrammarIndex, grammarPageCount]);
}
