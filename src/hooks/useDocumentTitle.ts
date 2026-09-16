import { useEffect } from 'react';
import { documentTitleFor } from '../utils/documentTitle';

/**
 * Titles the current view and hands the title back when the view closes.
 *
 * Pass `null`/`undefined`/`''` while a surface has no view of its own (a closed
 * reading window, a lesson that is not open): the effect then does nothing and
 * the surface below keeps its title.
 *
 * Titles stack in mount order — the workspace shell sets its tab name, then a
 * study window opened on top overrides it, and unmounting that window restores
 * what was there before (the captured `previous`), because the shell's effect
 * does not re-run just because a window closed.
 *
 * See `src/utils/documentTitle.ts` for why this exists (WCAG 2.4.2).
 */
export function useDocumentTitle(view: string | null | undefined) {
  useEffect(() => {
    if (!view?.trim()) return;
    const previous = document.title;
    document.title = documentTitleFor(view);
    return () => {
      document.title = previous;
    };
  }, [view]);
}
