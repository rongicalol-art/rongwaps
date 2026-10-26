# Ron's Mandarin Visual System

> **Source of truth:** CSS variables in `src/index.css` + `src/data/designTokens.ts`; full scale in `docs/DESIGN_TOKENS.md`. This file names the *roles*; read the values from the source, never copy hex into code.

## Personality

An encouraging Chinese-learning companion: calm, tactile, warm, capable. Premium = deliberate hierarchy, quiet chrome, smooth motion, coherent assets. Not muted-to-death, not neon.

## Colour roles

| Role | Tokens | Notes |
| --- | --- | --- |
| Canvas | `ui-canvas`, `ui-practice-canvas` | Warm off-white; same tone on Books and study screens. Never blue-tinted, pure white, or dark. |
| Surfaces | `ui-surface`, `ui-surface-hover`, `ui-hover` | Cards, tiles, buttons. Back cards in a stack use `ui-surface-hover`. |
| Ink | `ui-ink-strong`, `ui-ink`, `ui-muted-strong`, `ui-muted` | Warm grays. Titles strong, secondary muted-strong. |
| Lines | `ui-border`, `ui-divider` | Outlines must read clearly. |
| Book accent | `brand-primary` (+ `-edge`, `-deep`, `-soft`, `-soft-edge`, `-track`, `-wash`, `brand-on-primary`) | Re-mapped per book by `useBookTheme`; progress, selection, primary buttons, done states. |
| Review tone | `data-tone="review"` overrides | Muted honey; text and lines shift warm with it. |
| Secondary | `brand-secondary` (+ `-edge`, `-soft`) | Warm orange, sparing. |
| Feedback | `feedback-success/warning/danger` (+ `-edge`, `-surface`, `-hover`, `warning-ink`) | Meaning only (answers, errors). Not for "done". |

Book accents vary; neutrals stay stable across books.

## Depth & shape

- Depth tokens `--depth-sm/md/lg/xl` (2/4/5/6px). Primary actions: thick solid bottom edge in their own darker shade, compresses on press (two-layer stationary base, see `.claude/rules/ui.md`).
- Flashcards / feature cards: 3px border, `--depth-xl` bottom edge, `rounded-feature`. Tiles in sheets: `TILE_BORDER` / `TILE_RADIUS` from `flashcardMotion.ts`.
- Radius tokens: `xs 8`, `sm 12`, `compact 14`, `control 16`, `feature 24`, `modal 32`. Smaller radius as density rises. Pills squarish.
- No drop shadows on docks, windows, or stacks; edges and fills carry depth. No blur, glass, or background textures. No gradients on surfaces; the one exception is brief celebration accents (Session complete's glow behind the mascot and the tile shine sweep).

## Typography

- `font-sans`: Nunito for all UI copy; titles heavy (black/extrabold), compact, literal.
- `font-chinese`: Chinese study and subtitle font (rounded Huninn/Rounded-SC default; Kai stack when selected applies app-wide to all Chinese text). Never hardcode fonts to sans.
- Same role = same style everywhere (block titles, labels, meta). No long uppercase.

## Iconography & illustration

- Navigation and modes: the flat colourful icon set (`PlayfulNavIcon`). Controls: Phosphor via `AppIcon`. One family per control surface.
- Status checks: small, gray, smooth, no background.
- Celebration: lottie (trophy) or the content itself.
- Original illustrations share rounded geometry, flat fills, tiny expressive faces, one learning prop; no text in art; no pop-culture characters. Reading art 16:9, never cropped.

## Motion tokens

- `EASE_OUT` and `SETTLE_EASE` in `src/screens/flashcard/flashcardMotion.ts`; press ~180ms; settles 400–650ms; stagger 30–60ms.
- Prefer WAAPI/transform/opacity; no layout-thrashing animations; reduced motion = instant final state.

## Review questions

1. Can a learner find the next action in two seconds?
2. Does each colour have a job? Is anything saturated enough to hurt the eyes?
3. Is there any label, pill, count, or description that could be removed?
4. Are depth and motion proportional to importance, and does every motion explain where something went?
5. Do text styles match across sibling blocks?
6. Does mobile have its own hierarchy, and does desktop keep the side nav without awkward empty space?
7. Hover, focus, pressed, empty, loading, long-word, and reduced-motion states all intentional?
