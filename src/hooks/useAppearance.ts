/**
 * @fileoverview Applies the light/dark appearance setting: `data-theme="dark"` on <html> selects the dark token
 * block in `src/index.css`. index.html reads the `rw-appearance` mirror before first paint, so a dark app
 * never flashes light while the store rehydrates.
 */
import { useLayoutEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { changeTone } from './useReviewTone';

const STORAGE_KEY = 'rw-appearance';

/** The browser/status bar colour follows the canvas the theme resolved to. */
function syncThemeColor() {
  const canvas = getComputedStyle(document.documentElement).getPropertyValue('--color-ui-canvas').trim();
  if (canvas) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', canvas);
}

export function useAppearance() {
  const appearance = useAppStore((state) => state.appearance);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      if (appearance === 'dark') root.dataset.theme = 'dark';
      else delete root.dataset.theme;
      syncThemeColor();
    };
    const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
    // First mount only confirms what index.html already painted; later changes spread like the review tone.
    if (current === appearance || !mounted.current) apply();
    else changeTone(apply);
    mounted.current = true;
    try {
      localStorage.setItem(STORAGE_KEY, appearance);
    } catch {
      // Private mode: the setting still applies for this session.
    }
  }, [appearance]);
}
