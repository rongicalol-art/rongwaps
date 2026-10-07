import type { MistakeRepeat } from '../../store/useAppStore';

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

export interface CardSessionProgressInfo {
  displayIndex: number;
  totalCount: number;
  isRetry: boolean;
  cleanupPhase: { currentIndex: number; totalCount: number } | null;
}

export function computeCardSessionProgress(
  currentIndex: number,
  currentCardId: string | null | undefined,
  canonicalCards: Array<{ id: string }>,
  activeCards: Array<{ id: string }>,
  repeatMistakes: MistakeRepeat,
  missedCardIds: Set<string>,
  isShuffled: boolean = false,
): CardSessionProgressInfo {
  const initialTotal = canonicalCards.length || activeCards.length;
  if (initialTotal === 0) {
    return {
      displayIndex: 0,
      totalCount: 0,
      isRetry: false,
      cleanupPhase: null,
    };
  }

  const isCleanup =
    repeatMistakes === 'end' &&
    currentIndex >= initialTotal &&
    activeCards.length > initialTotal;

  if (isCleanup) {
    const cleanupIndex = currentIndex - initialTotal;
    const cleanupTotal = activeCards.length - initialTotal;
    return {
      displayIndex: cleanupIndex,
      totalCount: cleanupTotal,
      isRetry: true,
      cleanupPhase: {
        currentIndex: cleanupIndex,
        totalCount: cleanupTotal,
      },
    };
  }

  const isRetry = Boolean(currentCardId && missedCardIds.has(currentCardId));
  const cardCanonicalIndex = !isShuffled && isRetry && currentCardId
    ? canonicalCards.findIndex((c) => c.id === currentCardId)
    : -1;

  const displayIndex =
    cardCanonicalIndex >= 0
      ? cardCanonicalIndex
      : Math.min(currentIndex, Math.max(0, initialTotal - 1));

  return {
    displayIndex,
    totalCount: initialTotal,
    isRetry,
    cleanupPhase: null,
  };
}
