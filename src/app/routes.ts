/**
 * Route is the source of truth for the top-level workspace; the persisted
 * store tab only decides where a bare '/' boots.
 */
export const TAB_ROUTES = {
  path: '/path',
  search: '/search',
  library: '/library',
  profile: '/profile',
} as const;

export type TabRoute = keyof typeof TAB_ROUTES;

export function tabFromPathname(pathname: string): TabRoute | null {
  const first = pathname.split('/')[1];
  return first && first in TAB_ROUTES ? (first as TabRoute) : null;
}

/**
 * Public study guides (Books & Lessons, Grammar & Exercises, TOCFL Prep).
 * Rendered outside the workspace shell without sign-in or sync.
 */
export const GUIDE_ROUTES = {
  books: '/books',
  grammar: '/grammar',
  tocfl: '/tocfl',
} as const;

export type GuidePage = keyof typeof GUIDE_ROUTES;

export function guidePageFromPathname(pathname: string): GuidePage | null {
  const normalized = pathname.replace(/\/+$/, '');
  const match = (Object.keys(GUIDE_ROUTES) as GuidePage[]).find((page) => GUIDE_ROUTES[page] === normalized);
  return match ?? null;
}

/**
 * Public pages (About, Sources & Licenses, legal). They render outside the workspace shell (no sign-in, no
 * sync, no side nav) so they can be linked from the sign-in window and read by
 * anyone, including people who have not created an account.
 */
export const LEGAL_ROUTES = {
  about: '/about',
  sources: '/sources',
  privacy: '/privacy',
  terms: '/terms',
} as const;

export type LegalPage = keyof typeof LEGAL_ROUTES;

export function legalPageFromPathname(pathname: string): LegalPage | null {
  const normalized = pathname.replace(/\/+$/, '');
  const match = (Object.keys(LEGAL_ROUTES) as LegalPage[]).find((page) => LEGAL_ROUTES[page] === normalized);
  return match ?? null;
}

/**
 * Public lesson pages (`/books/2/lesson-4`): a taste of one lesson for search engines and
 * signed-out visitors. Only lessons with a page resolve; anything else falls through to the app.
 * Book 4 joins when it opens.
 */
export const LESSON_PAGE_BOOKS = [1, 2, 3] as const;
export const LESSON_PAGE_LESSONS = 16;

export interface LessonPageRef { bookId: number; lessonId: number }

export function isLessonPage(bookId: number, lessonId: number): boolean {
  return (LESSON_PAGE_BOOKS as readonly number[]).includes(bookId)
    && Number.isInteger(lessonId) && lessonId >= 1 && lessonId <= LESSON_PAGE_LESSONS;
}

export function lessonPagePath(bookId: number, lessonId: number): string {
  return `${GUIDE_ROUTES.books}/${bookId}/lesson-${lessonId}`;
}

export function lessonPageFromPathname(pathname: string): LessonPageRef | null {
  const match = /^\/books\/(\d)\/lesson-(\d{1,2})\/*$/.exec(pathname);
  if (!match || match[2].startsWith('0')) return null;
  const ref = { bookId: Number(match[1]), lessonId: Number(match[2]) };
  return isLessonPage(ref.bookId, ref.lessonId) ? ref : null;
}

/**
 * Public TOCFL word lists (`/tocfl/vocabulary/a1`): the official list for one level, for search
 * engines and signed-out visitors. `level` is the TBCL level (1–7) the app's level badges use.
 * Higher levels join when their meanings are written.
 */
export const WORD_LIST_LEVELS = [
  { slug: 'novice', level: 1 },
  { slug: 'a1', level: 2 },
  { slug: 'a2', level: 3 },
] as const;

export type WordListLevel = (typeof WORD_LIST_LEVELS)[number];

export function wordListPath(slug: WordListLevel['slug']): string {
  return `${GUIDE_ROUTES.tocfl}/vocabulary/${slug}`;
}

export function wordListFromPathname(pathname: string): WordListLevel | null {
  const match = /^\/tocfl\/vocabulary\/([a-z0-9]+)\/*$/.exec(pathname);
  return WORD_LIST_LEVELS.find((entry) => entry.slug === match?.[1]) ?? null;
}

/**
 * Public grammar pages (`/grammar/ne-and-you`): one grammar pattern each, for search engines and
 * signed-out visitors. The address list lives with the pages (src/screens/grammar-page/data), so
 * this only recognises the shape; the screen sends an unknown address back to the grammar guide.
 */
export function grammarPagePath(slug: string): string {
  return `${GUIDE_ROUTES.grammar}/${slug}`;
}

export function grammarPageSlugFromPathname(pathname: string): string | null {
  return /^\/grammar\/([a-z0-9]+(?:-[a-z0-9]+)*)\/*$/.exec(pathname)?.[1] ?? null;
}
