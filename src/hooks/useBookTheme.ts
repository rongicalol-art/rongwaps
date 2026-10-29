/**
 * @fileoverview Marks the active book on <html> (`data-book`). Its tone (accent family, text and line roles,
 * light and dark) is declared in `src/index.css`, so every screen themed with semantic tokens follows the book
 * with no per-component plumbing and no inline styles to fight the dark theme or the review tone.
 */
import { useLayoutEffect } from 'react';

export function useBookTheme(bookId: number): void {
  // Layout effect: the book colours land before the first paint, never a frame later.
  useLayoutEffect(() => {
    document.documentElement.dataset.book = String(bookId);
  }, [bookId]);
}
