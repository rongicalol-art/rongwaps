/**
 * Review-card geometry. Shared by the flashcard study deck and the writing
 * activity's reference card so both stay the same size inside the workspace.
 */

/** Width of a review card, derived from the viewport and the persistent side rail. */
export function getCardWidth() {
  const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth;
  const workspaceNavWidth = typeof document === 'undefined'
    ? (viewportWidth >= 768 ? 288 : 0)
    : Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--workspace-nav-width')) || 0;
  const shellPadding = viewportWidth >= 1024 ? 64 : viewportWidth >= 640 ? 48 : 32;
  // The available width follows the shell's responsive padding and persistent
  // side rail instead of overflowing the workspace at narrow desktop sizes.
  const availableWidth = viewportWidth - workspaceNavWidth - shellPadding;
  const targetMaxWidth = viewportWidth >= 1024 ? 620 : viewportWidth >= 768 ? 540 : viewportWidth >= 640 ? 480 : 340;
  return Math.round(Math.min(targetMaxWidth, Math.max(280, availableWidth)));
}
