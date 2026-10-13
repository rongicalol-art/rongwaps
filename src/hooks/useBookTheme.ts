/**
 * @fileoverview Applies the active book's tone (accent family + text, line and
 * canvas roles) to the global CSS custom properties, so every screen themed
 * with semantic tokens (`bg-brand-primary`, `text-ui-ink`, `border-ui-divider`)
 * follows the book without any per-component plumbing.
 *
 * The tokens are declared in `src/index.css` @theme and overridden at runtime
 * on `document.documentElement`; inline styles beat the stylesheet `:root`
 * values. The review tone (`data-tone="review"`) wins over these via !important.
 */
import { useLayoutEffect } from 'react';
import type { SAMPLE_BOOKS } from '../data/books';

export type BookTheme = (typeof SAMPLE_BOOKS)[number]['theme'];

const THEME_CSS_VARS: Record<keyof BookTheme, string> = {
  primary: '--color-brand-primary',
  primaryEdge: '--color-brand-primary-edge',
  primaryDeep: '--color-brand-primary-deep',
  primarySoft: '--color-brand-primary-soft',
  primarySoftEdge: '--color-brand-primary-soft-edge',
  primaryTrack: '--color-brand-primary-track',
  primaryWash: '--color-brand-primary-wash',
  practiceCanvas: '--color-ui-practice-canvas',
  inkStrong: '--color-ui-ink-strong',
  ink: '--color-ui-ink',
  mutedStrong: '--color-ui-muted-strong',
  muted: '--color-ui-muted',
  border: '--color-ui-border',
  divider: '--color-ui-divider',
};

export function useBookTheme(theme: BookTheme): void {
  // Layout effect: the book colours land before the first paint, never a frame later.
  useLayoutEffect(() => {
    const root = document.documentElement;
    (Object.keys(THEME_CSS_VARS) as (keyof BookTheme)[]).forEach((key) => {
      root.style.setProperty(THEME_CSS_VARS[key], theme[key]);
    });
  }, [theme]);
}
