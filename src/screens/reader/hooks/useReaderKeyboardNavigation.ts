import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';

interface ReaderKeyboardNavigationOptions {
  isStudyDrawerOpen: boolean;
  setStudyDrawerOpen: (open: boolean) => void;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  togglePlay: () => void;
  prevSentence: () => void;
  nextSentence: () => void;
}

/** Window-level keyboard shortcuts for the reader: Escape, Space, and arrows. */
export function useReaderKeyboardNavigation({
  isStudyDrawerOpen,
  setStudyDrawerOpen,
  onClose,
  onNext,
  onPrevious,
  togglePlay,
  prevSentence,
  nextSentence,
}: ReaderKeyboardNavigationOptions) {
  const isStudyDrawerOpenRef = useRef(isStudyDrawerOpen);
  isStudyDrawerOpenRef.current = isStudyDrawerOpen;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (event.key === 'Escape') {
        event.stopPropagation();
        if (isStudyDrawerOpenRef.current) {
          setStudyDrawerOpen(false);
          return;
        }
        if (useAppStore.getState().dictionaryWord) {
          useAppStore.getState().setDictionaryWord(null);
          return;
        }
        onClose();
      } else if (event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        togglePlay();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        if (event.altKey || event.metaKey) {
          prevSentence();
        } else {
          onPrevious();
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        if (event.altKey || event.metaKey) {
          nextSentence();
        } else {
          onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrevious, togglePlay, prevSentence, nextSentence, setStudyDrawerOpen]);
}
