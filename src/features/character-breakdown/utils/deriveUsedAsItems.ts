import type { Flashcard } from '../../../data/flashcards';
import { vocabularyCache } from '../../../utils/cache';
import { isStandardHanzi } from '../../../utils/characters/hanzi';
import { groupWordsByBook, type WordOrderContext } from '../../../utils/vocabulary/wordOrdering';

export interface UsedAsGroupItem {
  char: string;
  badgeInfo: { bookId: number; lessonId: number } | null;
}

/**
 * Buckets "used as component" characters into in-course vs out-of-course,
 * resolving each character's owning book/lesson badge from the loaded
 * vocabulary cache.
 */
export function deriveUsedAsItems(usedAsComponents: string[]): {
  inCourseItems: UsedAsGroupItem[];
  outOfCourseItems: UsedAsGroupItem[];
} {
  const keys = ['vocab-all-all', 'vocab-1-all', 'vocab-2-all', 'vocab-3-all', 'vocab-4-all', 'vocab-5-all', 'vocab-6-all'];
  const loadedList: Flashcard[] = [];
  keys.forEach(k => {
    const v = vocabularyCache.get<Flashcard[]>(k);
    if (v && v.length > 0) {
      loadedList.push(...v);
    }
  });

  const uniqueMap = new Map<string, Flashcard>();
  loadedList.forEach(c => uniqueMap.set(c.id, c));

  // Single-pass index over loaded vocabulary so we avoid O(|components| * |allVocabs|) scans and sorts.
  const componentSet = new Set(usedAsComponents);
  const exactByChar = new Map<string, Flashcard>();
  const bestContainingByChar = new Map<string, Flashcard>();

  for (const card of uniqueMap.values()) {
    if (componentSet.has(card.front) && !exactByChar.has(card.front)) {
      exactByChar.set(card.front, card);
    }
    const seenChars = new Set<string>();
    for (const ch of card.front) {
      if (seenChars.has(ch)) continue;
      seenChars.add(ch);
      if (!componentSet.has(ch) || card.front === ch) continue;
      const prev = bestContainingByChar.get(ch);
      if (
        !prev ||
        card.bookId < prev.bookId ||
        (card.bookId === prev.bookId && card.lessonId < prev.lessonId)
      ) {
        bestContainingByChar.set(ch, card);
      }
    }
  }

  const items = usedAsComponents.map(c => {
    const match = exactByChar.get(c) ?? bestContainingByChar.get(c);
    return {
      char: c,
      badgeInfo: match ? { bookId: match.bookId, lessonId: match.lessonId } : null,
    };
  });

  const inCourse = items.filter(item => item.badgeInfo !== null);
  const outOfCourse = items
    .filter(item => item.badgeInfo === null && isStandardHanzi(item.char))
    .slice(0, 35);

  return {
    inCourseItems: inCourse,
    outOfCourseItems: outOfCourse,
  };
}

type InCourseItem = UsedAsGroupItem & { badgeInfo: NonNullable<UsedAsGroupItem['badgeInfo']> };
const asWord = (item: InCourseItem) => ({ ...item, front: item.char, ...item.badgeInfo });

/** In-course used-as items grouped in the shared word order (current book, then 1-4, easiest first). */
export function groupUsedAsByBook(items: UsedAsGroupItem[], context: WordOrderContext) {
  return groupWordsByBook(
    items.filter((item): item is InCourseItem => item.badgeInfo !== null).map(asWord),
    context,
  );
}
