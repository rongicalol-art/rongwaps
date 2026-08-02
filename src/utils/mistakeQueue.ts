import type { MistakeRepeat } from '../store/usePracticePreferencesStore';

export function queueMissedItem<T extends { id: string }>(
  items: T[],
  item: T,
  currentIndex: number,
  repeat: MistakeRepeat,
) {
  if (repeat === 'off' || items.slice(currentIndex + 1).some((candidate) => candidate.id === item.id)) {
    return items;
  }

  if (repeat === 'end') return [...items, item];

  const insertionIndex = Math.min(currentIndex + 4, items.length);
  return [
    ...items.slice(0, insertionIndex),
    item,
    ...items.slice(insertionIndex),
  ];
}
