import { useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';

interface ReaderKeyboardNavigationOptions {
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  togglePlay: () => void;
  prevSentence: () => void;
  nextSentence: () => void;
}

/** Window-level keyboard shortcuts for the reader: Escape, Space, and arrows. */
export function useReaderKeyboardNavigation({
  onClose,
  onNext,
  onPrevious,
  togglePlay,
  prevSentence,
  nextSentence,
}: ReaderKeyboardNavigationOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (useAppStore.getState().socialPanel) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (event.key === 'Escape') {
        event.stopPropagation();
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
  }, [onClose, onNext, onPrevious, togglePlay, prevSentence, nextSentence]);
}
