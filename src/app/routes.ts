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
 * Public legal pages. They render outside the workspace shell (no sign-in, no
 * sync, no side nav) so they can be linked from the sign-in window and read by
 * anyone, including people who have not created an account.
 */
export const LEGAL_ROUTES = {
  privacy: '/privacy',
  terms: '/terms',
} as const;

export type LegalPage = keyof typeof LEGAL_ROUTES;

export function legalPageFromPathname(pathname: string): LegalPage | null {
  const normalized = pathname.replace(/\/+$/, '');
  const match = (Object.keys(LEGAL_ROUTES) as LegalPage[]).find((page) => LEGAL_ROUTES[page] === normalized);
  return match ?? null;
}
