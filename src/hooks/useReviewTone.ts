/**
 * @fileoverview Turns the whole app honey (`data-tone="review"` on <html>, see
 * the tone block in `src/index.css`) while a review/mistake-cleanup pass runs.
 * Ref-counted so the flashcard screen and the shared practice header can both
 * claim it without one's cleanup stripping the other's.
 */
import { useEffect } from 'react';

let holders = 0;

/** Where the next tone change spreads out from (viewport px); cleared once the change finishes. */
export function setToneOrigin(x: number, y: number) {
  document.documentElement.style.setProperty('--tone-x', `${x}px`);
  document.documentElement.style.setProperty('--tone-y', `${y}px`);
}
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
  // The spread ends exactly at the farthest corner, so its whole duration is visible (an oversized radius finishes early).
  const ox = parseFloat(root.style.getPropertyValue('--tone-x'));
  const oy = parseFloat(root.style.getPropertyValue('--tone-y'));
  const x = Number.isFinite(ox) ? ox : window.innerWidth / 2;
  const y = Number.isFinite(oy) ? oy : window.innerHeight / 2;
  root.style.setProperty('--tone-x', `${x}px`);
  root.style.setProperty('--tone-y', `${y}px`);
  root.style.setProperty('--tone-r', `${Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))}px`);
  root.classList.add('review-tone-transition');
  const current = document.startViewTransition(apply);
  transition = current;
  const clean = () => {
    if (transition !== current) return;
    transition = undefined;
    root.classList.remove('review-tone-transition');
    root.style.removeProperty('--tone-x');
    root.style.removeProperty('--tone-y');
    root.style.removeProperty('--tone-r');
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
