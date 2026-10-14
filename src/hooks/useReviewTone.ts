/**
 * @fileoverview Turns the whole app honey (`data-tone="review"` on <html>, see
 * the tone block in `src/index.css`) while a review/mistake-cleanup pass runs.
 * Ref-counted so the flashcard screen and the shared practice header can both
 * claim it without one's cleanup stripping the other's.
 */
import { useEffect } from 'react';

let holders = 0;
let transition: ViewTransition | undefined;

function syncTone() {
  const root = document.documentElement;
  const wanted = holders > 0 ? 'review' : undefined;
  if (root.dataset.tone === wanted && !transition) return;
  transition?.skipTransition();
  const apply = () => {
    // A skipped transition can still run its update callback: always apply the latest claim.
    if (holders > 0) root.dataset.tone = 'review';
    else delete root.dataset.tone;
  };
  if (!document.startViewTransition || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    transition = undefined;
    root.classList.remove('review-tone-transition');
    apply();
    return;
  }
  root.classList.add('review-tone-transition');
  const current = document.startViewTransition(apply);
  transition = current;
  const clean = () => {
    if (transition !== current) return;
    transition = undefined;
    root.classList.remove('review-tone-transition');
  };
  void current.ready.catch(() => {}); // Skipping is expected during rapid navigation or StrictMode replay.
  void current.finished.then(clean, clean);
}

/** One claim per mounted review surface; only the first claim and final release change tone. */
export function claimReviewTone(): () => void {
  holders += 1;
  if (holders === 1) syncTone();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders === 0) syncTone();
  };
}

export function useReviewTone(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    return claimReviewTone();
  }, [active]);
}
