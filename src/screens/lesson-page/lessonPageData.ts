import type { LessonPageRef } from '../../app/routes';
import type { LessonPageBook, LessonPageData } from './lessonPageTypes';

/** One chunk per book, so a lesson page downloads only its own book's sample. */
const LOADERS: Record<number, () => Promise<{ PAGES: LessonPageBook }>> = {
  1: () => import('./data/book-1'),
  2: () => import('./data/book-2'),
  3: () => import('./data/book-3'),
};

const loaded = new Map<number, LessonPageBook>();
const pending = new Map<number, Promise<LessonPageBook>>();

/** The prerender and tests hand every book over up front instead of loading it. */
export function provideLessonPageBook(bookId: number, pages: LessonPageBook): void {
  loaded.set(bookId, pages);
}

export const loadedLessonPageBook = (bookId: number): LessonPageBook | undefined => loaded.get(bookId);

/** One promise per book, stable across renders, for React's `use`. */
export function loadLessonPageBook(bookId: number): Promise<LessonPageBook> {
  let promise = pending.get(bookId);
  if (!promise) {
    promise = LOADERS[bookId]().then(({ PAGES }) => { loaded.set(bookId, PAGES); return PAGES; });
    pending.set(bookId, promise);
  }
  return promise;
}

export function lessonPageData({ bookId, lessonId }: LessonPageRef): LessonPageData {
  const pages = loaded.get(bookId);
  if (!pages) throw new Error(`Book ${bookId} lesson pages are not loaded`);
  return pages[lessonId];
}
