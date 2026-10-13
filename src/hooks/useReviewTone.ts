/**
 * @fileoverview Turns the whole app honey (`data-tone="review"` on <html>, see
 * the tone block in `src/index.css`) while a review/mistake-cleanup pass runs.
 * Ref-counted so the flashcard screen and the shared practice header can both
 * claim it without one's cleanup stripping the other's.
 */
import { useEffect } from 'react';

let holders = 0;

export function useReviewTone(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    const root = document.documentElement;
    holders += 1;
    root.dataset.tone = 'review';
    return () => {
      holders -= 1;
      if (holders === 0) delete root.dataset.tone;
    };
  }, [active]);
}
