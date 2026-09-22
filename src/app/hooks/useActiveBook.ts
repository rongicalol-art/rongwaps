import { SAMPLE_BOOKS } from '../../data/books';
import { useBookTheme } from '../../hooks/useBookTheme';

/**
 * The workspace's active book and its theme. Library and Dictionary keep the
 * neutral first-book canvas so saved words and search results read the same
 * wherever they were opened from.
 */
export function useActiveBook(activeBookId: number, activeTab: string) {
  const isLibraryOrSearch = activeTab === 'library' || activeTab === 'search';
  const activeBook = isLibraryOrSearch
    ? SAMPLE_BOOKS[0]
    : SAMPLE_BOOKS.find((book) => book.id === activeBookId) || SAMPLE_BOOKS[0];

  useBookTheme(activeBook.theme);

  return activeBook;
}
