import { resolveLevel } from '../lesson/levels';
import type { LevelIndex } from '../packValidators';

/**
 * The one ordering rule for every related-word list: the learner's current
 * book first, then the other books in order, dictionary words (bookId 0) last.
 * Inside a book, easiest to hardest by level, then lesson order.
 */

export interface OrderableWord {
  front: string;
  bookId: number;
  lessonId: number;
}

export interface WordOrderContext {
  activeBookId?: number | null;
  levels: LevelIndex | null;
}

const UNKNOWN_LEVEL = 99;

export function bookRank(bookId: number, activeBookId?: number | null): number {
  if (activeBookId != null && bookId === activeBookId) return -1;
  return bookId === 0 ? Number.POSITIVE_INFINITY : bookId;
}

export function levelRank(text: string, levels: LevelIndex | null): number {
  return resolveLevel(text, levels)?.level ?? UNKNOWN_LEVEL;
}

/** Stable: equal words keep their incoming order. */
export function sortWords<T extends OrderableWord>(words: readonly T[], { activeBookId, levels }: WordOrderContext): T[] {
  return words
    .map((word, index) => ({
      word,
      index,
      book: bookRank(word.bookId, activeBookId),
      level: levelRank(word.front, levels),
    }))
    .sort((a, b) => {
      if (a.book !== b.book) return a.book < b.book ? -1 : 1;
      return a.level - b.level || a.word.lessonId - b.word.lessonId || a.index - b.index;
    })
    .map(({ word }) => word);
}

export function groupWordsByBook<T extends OrderableWord>(
  words: readonly T[],
  context: WordOrderContext,
): Array<{ bookId: number; cards: T[] }> {
  const groups: Array<{ bookId: number; cards: T[] }> = [];
  for (const word of sortWords(words, context)) {
    const last = groups[groups.length - 1];
    if (last && last.bookId === word.bookId) last.cards.push(word);
    else groups.push({ bookId: word.bookId, cards: [word] });
  }
  return groups;
}
