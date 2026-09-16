/**
 * Single owner for the document title format.
 *
 * Every surface that owns a view name (the workspace shell, the reading
 * window, the grammar window) composes its title through here so browser tabs
 * and screen readers always see the same shape: `View · RongWaps`.
 *
 * WCAG 2.4.2 (Page Titled): an SPA never fires a page-load event, so each view
 * has to title itself. Without an owner the tab keeps whichever title
 * `index.html` shipped with, no matter how far the learner navigates.
 */
export const APP_NAME = 'RongWaps';

export function documentTitleFor(view: string | null | undefined): string {
  const label = view?.trim();
  return label ? `${label} · ${APP_NAME}` : APP_NAME;
}
