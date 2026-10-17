export function bookPagePath(bookId: number, page: number) {
  return `/data/book-pages/modern-chinese-${bookId}/page-${String(page).padStart(3, '0')}.webp`;
}
