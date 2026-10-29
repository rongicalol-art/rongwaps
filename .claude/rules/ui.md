---
paths:
  - "src/screens/**"
  - "src/lib/widgets/**"
  - "src/features/**"
  - "src/index.css"
  - "src/data/designTokens.ts"
---
# UI rules

Full token scale: `docs/DESIGN_TOKENS.md`. Widget catalog: `docs/WIDGETS.md`. Design work: `rongwaps-ui-director` skill.

## Look (owner preferences — repeated corrections, treat as law)
- Premium-playful, Duolingo-like hierarchy. Clean, minimal, easy to read. Remove clutter and redundant labels before adding anything.
- Backgrounds off-white (or a touch darker) so buttons/cards stand out; dark mode is warm charcoal with lighter surfaces. Never pure white page, never deep blue.
- Gray outlines should read clearly (more contrast, not less).
- No graph/dot/grid textures as backgrounds — distracting. Texture only, if at all.
- No visible border or separator on menu bars and top headers; keep them minimal and quiet.
- Pills/chips squarish, not fully circular.
- Interactive helper content (hints, examples, activities) hidden by default behind a quiet toggle when it is not the main task.
- Windows/overlays never cover the left nav bar on desktop/tablet; they use `WorkspaceWindow` (or `.workspace-window` for edge-pinned bars). Mobile may use full viewport.

## Components
- Reuse before new: `ActionButton`, `IconActionButton`, `SegmentedControl`, `AppIcon` (Phosphor only), `CountryFlag` (no flag emoji). One dominant primary action per surface; utility actions quiet.
- Tokens only: `ui-*`, `brand-*`, `feedback-*` (text on fills: `brand-on-primary`, `ui-on-solid`, `ui-on-inverse`; never `text-white`). Both themes must work (`docs/DESIGN_TOKENS.md` §5a). No hex, no hardcoded font families (`font-sans` UI, `font-chinese` glyphs). Prefer the spacing/radius scale; arbitrary pixel values only for component geometry no token covers (card heights, tile sizes) — never for colour, type, or radius. Focus via `.focus-ring` / `.focus-ring-inline`.
- No bordered box inside a bordered container; plain text hierarchy inside. Key hints use `KeyChip` (square, after the label, label stays centred).
- Animations: Tailwind v4 `translate-*` sets the CSS `translate` property; never animate `transform` translate on an element that has those classes. Verify UI in the DEV debug window (Ctrl+Shift+0 → UI Previews), never by answering on the owner's real deck.
- Tactile depth: primary/direct actions only. Two-layer stationary base (immovable base layer + moving front surface); never mutate `border-b` on active or translate the whole container. No tactile buttons inside tactile containers; no depth on plain page sections.
- Keep a11y labels, reduced motion, loading/empty/error states, long-text behavior.
- Shared widgets own no fetching or global state; feature components may own hooks/services.

## Layout
- Mobile-first. Mobile = closable drawer + compact `MainHeader`; desktop Books keeps permanent side nav.
- `LayoutShell` root is the only owner of workspace tone (`bg-ui-canvas`; `bg-ui-practice-canvas` for practice). Route containers/headers/screens stay transparent. Anything that takes over the workspace is a `WorkspaceWindow` (paints its own tone, pads by the sidebar); never hand-roll the offset. Details opened over a window fill it — they never offset themselves. Loading state = `LoadingScreen` inside the window on the matching tone.
- Shell `main` is the single screen scroller; no nested screen scrollers (bounded overlays manage their own).
- Top-level workspace headers: canonical sticky fade `sticky top-0 z-40 bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent backdrop-blur-[2px]`. Headers span edge-to-edge (`maxWidth="none"`): back/close far left, utilities far right, `px-4 sm:px-6 lg:px-10`. Only content below may be width-constrained.
- Multi-tab dialogs/settings: segmented tabs in the header bar, stable height + internal scroll (no layout shift on tab switch).
- Settings panels/popovers: minimal label-and-control pairs, no redundant copy.
