/**
 * @fileoverview Applies the active book's accent palette to the global
 * `brand-*` CSS custom properties so every screen themed with semantic
 * tokens follows the book's color (blue / orange / brown / green).
 *
 * The tokens are declared in `src/index.css` @theme and overridden at
 * runtime on `document.documentElement`; inline styles always win over
 * the stylesheet `:root` values, so `bg-brand-primary` and friends pick
 * up the book color without any per-component plumbing.
 */
import { useEffect } from 'react';
import type { SAMPLE_BOOKS } from '../data/books';

export type BookTheme = (typeof SAMPLE_BOOKS)[number]['theme'];

const THEME_CSS_VARS: Record<keyof BookTheme, string> = {
  primary: '--color-brand-primary',
  primaryEdge: '--color-brand-primary-edge',
  primaryDeep: '--color-brand-primary-deep',
  primarySoft: '--color-brand-primary-soft',
  primarySoftEdge: '--color-brand-primary-soft-edge',
  primaryTrack: '--color-brand-primary-track',
  practiceCanvas: '--color-ui-practice-canvas',
};

export function useBookTheme(theme: BookTheme): void {
  useEffect(() => {
    const root = document.documentElement;
    (Object.keys(THEME_CSS_VARS) as (keyof BookTheme)[]).forEach((key) => {
      root.style.setProperty(THEME_CSS_VARS[key], theme[key]);
    });
  }, [theme]);
}
