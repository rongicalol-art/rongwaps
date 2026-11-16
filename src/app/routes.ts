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
 * Public lesson pages (`/books/1/lesson-4`): a taste of one lesson for search engines and
 * signed-out visitors. Only lessons with a page resolve; anything else falls through to the app.
 */
export const LESSON_PAGE_BOOK = 1;
export const LESSON_PAGE_LESSONS = 16;

export function lessonPagePath(lessonId: number): string {
  return `${GUIDE_ROUTES.books}/${LESSON_PAGE_BOOK}/lesson-${lessonId}`;
}

export function lessonPageFromPathname(pathname: string): number | null {
  const match = /^\/books\/(\d)\/lesson-(\d{1,2})\/*$/.exec(pathname);
  if (!match || Number(match[1]) !== LESSON_PAGE_BOOK || match[2].startsWith('0')) return null;
  const lessonId = Number(match[2]);
  return lessonId >= 1 && lessonId <= LESSON_PAGE_LESSONS ? lessonId : null;
}
