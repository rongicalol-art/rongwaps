import { GRAMMAR_PAGES } from './data';
import type { GrammarPageData, GrammarPageLink } from './grammarPageTypes';

type Book = Readonly<Record<string, GrammarPageData>>;

/** One chunk per book, so a grammar page downloads only its own book's pages. */
const LOADERS: Record<number, () => Promise<{ PAGES: Book }>> = {
  1: () => import('./data/book-1'),
};

const loaded = new Map<number, Book>();
const pending = new Map<number, Promise<Book>>();

export const grammarPageLink = (slug: string): GrammarPageLink | undefined => GRAMMAR_PAGES.find((link) => link[0] === slug);

/** The prerender and tests hand every book over up front instead of loading it. */
export function provideGrammarPageBook(bookId: number, pages: Book): void {
  loaded.set(bookId, pages);
}

export const loadedGrammarPageBook = (bookId: number): Book | undefined => loaded.get(bookId);

/** One promise per book, stable across renders, for React's `use`. */
export function loadGrammarPageBook(bookId: number): Promise<Book> {
  let promise = pending.get(bookId);
  if (!promise) {
    promise = LOADERS[bookId]().then(({ PAGES }) => { loaded.set(bookId, PAGES); return PAGES; });
    pending.set(bookId, promise);
  }
  return promise;
}
