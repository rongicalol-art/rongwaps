---
paths:
  - "src/screens/**"
  - "src/lib/widgets/**"
  - "src/features/**"
  - "src/app/**"
  - "src/index.css"
  - "src/data/designTokens.ts"
---
# UI code rules

How the look is built. The look itself (taste, motion, pictures) is `.claude/OWNER_PREFERENCES.md`: read it before design work. Token values: `docs/DESIGN_TOKENS.md`. Widget catalog: `docs/WIDGETS.md` (add a row when you add a shared widget).

## Components and tokens
- Shared widgets first: `ActionButton`, `IconActionButton`, `SegmentedControl`, `KeyChip` (key hints), `AppIcon` (Phosphor only; `PlayfulNavIcon` for navigation and modes), `CountryFlag` (no flag emoji). One dominant primary action per surface.
- Colour only through tokens (`ui-*`, `brand-*`, `feedback-*`; text on fills: `brand-on-primary`, `ui-on-solid`, `ui-on-inverse`), because literals don't follow dark mode. A test rejects hex, `text-white` and `bg-white`; Tailwind palette classes (`bg-amber-500`) slip past it, so watch for them. A new token is defined in both the light and dark blocks of `src/index.css` (`docs/DESIGN_TOKENS.md` §5a).
- Fonts: `font-sans` for UI, `font-chinese` for Chinese glyphs, so the learner's chosen font applies. No hardcoded families.
- Use the spacing and radius scale. Arbitrary pixel values are for component geometry no token covers (card heights, tile sizes), not for colour, type or radius. Focus via `.focus-ring` / `.focus-ring-inline`.
- Tactile depth is for primary and direct actions: a stationary base layer plus a moving front surface. Mutating `border-b` on active, or translating the whole container, makes neighbours jump. No tactile button inside a tactile container, no depth on plain page sections.
- Shared widgets own no fetching and no global state; feature components may use hooks and services.

## Motion
- Tailwind v4 `translate-*` classes set the CSS `translate` property. Animating `transform` translate on the same element adds both offsets, so things drift off-centre and sweeps stop halfway. Animate the property the class sets, or keep translate classes off animated elements.
- Easing and timing come from `EASE_OUT` and `SETTLE_EASE` in `src/screens/flashcard/flashcardMotion.ts` (press about 180ms, settles 400-650ms). Prefer WAAPI, transform and opacity over anything that reflows layout.

## Layout
- `LayoutShell` root is the only owner of the workspace tone (`bg-ui-canvas`; `bg-ui-practice-canvas` for practice). Route containers, headers and screens stay transparent.
- Anything that takes over the workspace is a `WorkspaceWindow` (or `.workspace-window` for edge-pinned bars): it paints its own tone and pads by the sidebar, so the nav stays visible on desktop and tablet. Don't hand-roll the offset. Details opened over a window fill it. Loading = `LoadingScreen` inside the window on the matching tone. Mobile may use the full viewport, with a closable drawer and the compact `MainHeader`.
- Shell `main` is the single screen scroller; bounded overlays manage their own scrolling.
- Top-level workspace headers use the canonical sticky fade: `sticky top-0 z-40 bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent backdrop-blur-[2px]`. They span edge to edge (`maxWidth="none"`), back/close far left, utilities far right, `px-4 sm:px-6 lg:px-10`; only content below is width-constrained.
- Multi-tab dialogs and settings: segmented tabs in the header bar, stable height with internal scroll, so switching tabs doesn't shift the layout.
- A change to the shared practice header is checked across flashcards, quiz, listening and writing together.
