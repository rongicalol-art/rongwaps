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

- **Backgrounds**: `bg-ui-canvas`, `bg-ui-practice-canvas`, `bg-ui-reader-canvas` (clean warm paper for reader), `bg-ui-surface` (white)
- **Borders/Lines**: `border-ui-border`, `border-ui-divider`
- **Text**: `text-ui-ink` (primary), `text-ui-ink-strong` (headings), `text-ui-muted` (secondary)
- **Brand**: `brand-primary` (blue), `brand-secondary` (orange)
- **Feedback**: `feedback-success` (green), `feedback-warning` (gold/yellow), `feedback-danger` (red)

Each brand/feedback color has an `-edge` variant (for the tactile bottom border) and a `-surface` or `/10` variant for soft backgrounds.

## 6. Canvas ownership (one page background)

The shell owns the workspace canvas; every other layer is transparent over it or paints its own full-viewport window. Rules:

- **Shell root (`LayoutShell`) is the only owner of the workspace tone**: `bg-ui-canvas`, switching to `bg-ui-practice-canvas` (instant, no color transition) while a practice activity is open or while a **column-only practice overlay** is open (dictionary detail — it flags `practiceCanvasOpen` so the lane beside the sidebar stays the same tone). Full-viewport overlay windows never drive this swap because they cover the whole viewport with their own canvas.
- The side navigation is a **floating surface bar**: rounded `[28px]` silhouette with a solid `bg-ui-surface` fill, and the tactile bottom block border (`border-b-[length:var(--depth-xl)] border-ui-border`). Active nav items use a soft `bg-ui-canvas` chip so they stay visible on the white bar; inactive items are transparent with a `hover:bg-ui-hover` state.
- **Full-viewport overlay windows paint their own tone across the whole viewport** — including the strip under the sidebar — and pad content by `var(--workspace-nav-width)` (`GrammarLessonScreen` is the reference pattern). Reader paints `bg-ui-practice-canvas`; Grammar paints `bg-ui-canvas`.
- **Loading, empty, and error surfaces inherit their window's tone** and never paint a page-level fill of their own: full-viewport study windows (Grammar, Reader) are **eager window shells** whose heavy content chunks load inside the mounted window under an inline spinner (`LoadingScreen inline`) — never root-level lazy windows, which flash a loading screen before the window exists. The dialogue-alignment pack and reading canvases stream into Reader the same way; audio degrades to whole-track playback until word timings land. Empty/error states that render inside the practice modal wrapper must not paint `bg-ui-canvas` (the wrapper already paints `bg-ui-practice-canvas`; offenders were `EmptyReviewState` and `WritingScreen`).
- Route containers, the workspace content column, and headers in normal flow stay transparent — screens do not set page-level backgrounds (historically `LibraryScreen` painted `bg-ui-canvas`, the profile header painted an opaque band, and the activity card-adder painted `bg-ui-practice-canvas` on top of the same-tone modal wrapper; all were redundant and removed).
- Only true full-screen windows (reader, grammar lesson, activity modal wrapper) own canvas fills, and sticky fades blend into the canvas via the canonical `from-ui-canvas` gradient recipe.
