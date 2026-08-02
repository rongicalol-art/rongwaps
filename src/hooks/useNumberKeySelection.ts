import { useEffect } from 'react';

interface UseNumberKeySelectionOptions<T> {
  items: readonly T[];
  onSelect: (item: T) => void;
  disabled?: boolean;
}

export function useNumberKeySelection<T>({
  items,
  onSelect,
  disabled = false,
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
  }, [disabled, items, onSelect]);
}
