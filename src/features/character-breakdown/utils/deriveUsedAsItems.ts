import { FLASHCARDS_DATA } from '../../../data/flashcards';
import type { Flashcard } from '../../../data/flashcards';
import { vocabularyCache } from '../../../utils/cache';

export interface UsedAsGroupItem {
  char: string;
  badgeInfo: { bookId: number; lessonId: number } | null;
}

/**
 * Buckets "used as component" characters into in-course vs out-of-course,
 * resolving each character's owning book/lesson badge from the loaded
 * vocabulary cache (falling back to the bundled flashcard set).
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
  let allVocabs = Array.from(uniqueMap.values());

  if (allVocabs.length === 0) {
    allVocabs = FLASHCARDS_DATA;
  }

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
  const outOfCourse = items.filter(item => item.badgeInfo === null);

  // Sort course items by book and lesson
  inCourse.sort((a, b) => {
    if (a.badgeInfo!.bookId !== b.badgeInfo!.bookId) {
      return a.badgeInfo!.bookId - b.badgeInfo!.bookId;
    }
    return a.badgeInfo!.lessonId - b.badgeInfo!.lessonId;
  });

  return {
    inCourseItems: inCourse,
    outOfCourseItems: outOfCourse,
  };
}
