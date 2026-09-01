# RongWaps Design Tokens

This document outlines the standard tokens and utility classes for UI consistency across RongWaps. Tokens are defined in `src/index.css` (`@theme` block) and bridged to TypeScript via `src/data/designTokens.ts`.

## 1. Border Radius (`rounded-*`)

Do not use arbitrary pixel values like `rounded-[14px]`. Use the semantic scale:

- `rounded-xs` (8px) — Tiny inline elements, badges, tags
- `rounded-sm` (12px) — Small buttons (`sm`), menu items, standard inputs
- `rounded-compact` (14px) — Medium buttons (`md`), choice options
- `rounded-control` (16px) — Standard UI controls, large buttons (`lg`), segmented controls
- `rounded-feature` (24px) — Dialogs, standard cards, feature containers
- `rounded-modal` (32px) — Bottom drawers, large overlays

## 2. Depth (`--depth-*`)

Used for the bottom-edge tactile effect on buttons and cards. Used in arbitrary values like `border-b-[length:var(--depth-sm)]`.

- `--depth-sm` (2px) — Quiet controls, secondary actions
- `--depth-md` (4px) — Primary controls, small cards
- `--depth-lg` (5px) — Hero buttons, primary actions
- `--depth-xl` (6px) — Elevated containers (e.g. side navigation)

## 3. Ambient Shadows (`shadow-ambient-*`)

Soft, blurred shadows used *only* for elevation (popovers, dialogs, drawers), NOT for standard cards (which use tactile depth).

- `shadow-ambient-sm` — Tooltips, small dropdowns
- `shadow-ambient-md` — Standard popovers, menus
- `shadow-ambient-lg` — Dialogs, bottom drawers

## 4. Focus Rings

Always use standard utility classes for focus states instead of manual `ring-*` stacking.

- `.focus-ring` — Standard focus ring for buttons, inputs, controls.
- `.focus-ring-inline` — Tighter focus ring for text links, inline chips, or compact icon buttons.

## 5. Colors

Do not use hardcoded hex values (e.g. `#FFFFFF`, `#E5E5E5`). Use semantic tokens:

- **Backgrounds**: `bg-ui-canvas`, `bg-ui-surface` (white)
- **Borders/Lines**: `border-ui-border`, `border-ui-divider`
- **Text**: `text-ui-ink` (primary), `text-ui-ink-strong` (headings), `text-ui-muted` (secondary)
- **Brand**: `brand-primary` (blue), `brand-secondary` (orange)
- **Feedback**: `feedback-success` (green), `feedback-warning` (gold/yellow), `feedback-danger` (red)

Each brand/feedback color has an `-edge` variant (for the tactile bottom border) and a `-surface` or `/10` variant for soft backgrounds.
