import { useEffect } from 'react';

interface UseNumberKeySelectionOptions<T> {
  items: readonly T[];
  onSelect: (item: T) => void;
  disabled?: boolean;
  /** DEV-only shortcut for submitting this question's correct answer. */
  onDebugAnswer?: () => void;
}

export function useNumberKeySelection<T>({
  items,
  onSelect,
  disabled = false,
  onDebugAnswer,
}: UseNumberKeySelectionOptions<T>) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      // The DEV preview window can sit over a live quiz; never affect the quiz underneath it.
      if (document.querySelector('.z-devtools')) return;

      if (import.meta.env.DEV && event.key.toLowerCase() === 'l' && onDebugAnswer) {
        event.preventDefault();
        onDebugAnswer();
        return;
      }

      const shortcutNumber = Number(event.key);
      const itemIndex = shortcutNumber - 1;
      if (
        !Number.isInteger(shortcutNumber) ||
        shortcutNumber < 1 ||
        itemIndex >= items.length
      ) {
        return;
      }

      event.preventDefault();
      onSelect(items[itemIndex]);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, items, onDebugAnswer, onSelect]);
}
