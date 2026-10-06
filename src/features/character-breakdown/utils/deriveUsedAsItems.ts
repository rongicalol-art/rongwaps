import type { Flashcard } from '../../../data/flashcards';
import { vocabularyCache } from '../../../utils/cache';
import { isStandardHanzi } from '../../../utils/hanzi';
import { groupWordsByBook, type WordOrderContext } from '../../../utils/wordOrdering';

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
  const allVocabs = Array.from(uniqueMap.values());

  const items = usedAsComponents.map(c => {
    const exact = allVocabs.find(card => card.front === c);
    const containing = allVocabs.filter(card => card.front.includes(c) && card.front !== c);

    let badgeInfo = null;
    if (exact) {
      badgeInfo = { bookId: exact.bookId, lessonId: exact.lessonId };
    } else if (containing.length > 0) {
      const sortedContaining = [...containing].sort((a, b) => {
        if (a.bookId !== b.bookId) return a.bookId - b.bookId;
        return a.lessonId - b.lessonId;
      });
      badgeInfo = { bookId: sortedContaining[0].bookId, lessonId: sortedContaining[0].lessonId };
    }

    return {
      char: c,
      badgeInfo,
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
