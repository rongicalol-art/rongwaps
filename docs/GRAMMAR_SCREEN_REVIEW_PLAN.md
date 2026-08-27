# Grammar Screen Review & Book Viewer V2 Plan

## Outcome

Keep the new linear grammar lesson, content-aware pattern rows, and one-line interactive disclosure. Replace the current book viewer interaction model before polishing anything else.

The current viewer looks immersive, but its controls are not clickable, keyboard focus can disappear with the controls, focus does not return to the launch button, and custom transform/pointer logic creates avoidable zoom and rendering edge cases.

The replacement should behave like a small, dependable PDF reader:

- fullscreen viewer;
- persistent, clickable controls;
- only show navigation actions that currently have a destination;
- Fit is the minimum zoom;
- layout-sized page with native scrolling when zoomed;
- browser/System Back and Escape close the viewer;
- no auto-hide, swipe navigation, custom drag translation, or tap-to-toggle controls.

## What should stay

These DeepSeek changes are directionally correct and should not be reverted:

- Linear `Learn -> Exercise -> next Grammar` flow.
- No bottom grammar dock or Learn/Practice switch.
- One primary Continue action at the end of Learn.
- Practice-style compact grammar header.
- Reading aids in a workspace-bounded drawer.
- Per-row content-weighted grammar columns.
- Centered definitions below their own rows.
- Separate pattern-row cards; the first row owns the slot legend.
- One-line `Explore this pattern` disclosure placed before Examples.
- Lazy mounting of interactive grammar content.
- Full-viewport book reference that replaces the grammar workspace.

All current unit tests, typecheck, lint, and production build pass as of this review.

## Review findings

### P0 — visible viewer controls cannot receive pointer input

`src/screens/grammar-lesson/components/BookPageViewer.tsx:277-280`

`overlayClasses()` puts `pointer-events-none` on both control overlays. Every descendant button therefore computes to `pointer-events: none`. The visible Close, Previous, Next, Zoom Out, Reset, and Zoom In controls are dead; a pointer click reaches the stage instead.

Required fix:

- The toolbar containers and their buttons must use `pointer-events-auto`.
- Do not solve this only by changing the one class: the auto-hide interaction should be removed as part of Viewer V2.

### P0 — focus restoration fails after closing the book viewer

`src/screens/grammar-lesson/GrammarLessonScreen.tsx:102-107`

`src/screens/grammar-lesson/components/BookPageViewer.tsx:58-62`

The viewer focus hook tries to restore the previously focused book-page button while the entire grammar dialog is still `inert`. The focus call fails and focus ends on `<body>`.

Required fix:

- Create `bookPageButtonRef` in `GrammarLessonScreen` and pass it to `GrammarStudyPage`/`ActionButton`.
- Let the parent own viewer close and focus restoration.
- On close: remove viewer state/inert first, then focus `bookPageButtonRef.current` in the next animation frame.
- Add an optional `restoreFocus={false}` or `returnFocusRef` capability to `useModalFocus` only if needed; do not allow both the hook and the parent to compete to restore focus.
- Verify Close, Escape, and browser/System Back all return focus to the same launch button.

### P1 — controls can become invisible while keyboard-focused

`src/screens/grammar-lesson/components/BookPageViewer.tsx:64-76`

`src/screens/grammar-lesson/components/BookPageViewer.tsx:277-280`

The 2.5-second timer fades the controls to `opacity: 0`, but they remain in the focus order. A keyboard user can be focused on an invisible Close or navigation button.

Required fix:

- Remove `controlsVisible`, `hideTimerRef`, `wakeControls()`, tap-to-toggle behavior, and all opacity auto-hide logic.
- Keep a compact toolbar persistently visible. Reliability is more important than cinematic chrome on a reference page.

### P1 — unavailable Back/Previous actions are still presented

`src/screens/grammar-lesson/components/BookPageViewer.tsx:341-363`

The first page still displays a disabled Previous arrow; the final page still displays a disabled Next arrow. This conflicts with the product rule: if there is no destination, do not show the action.

Required fix:

- Render Previous only when `pageIndex > 0`.
- Render Next only when `pageIndex < pages.length - 1`.
- If `pages.length === 1`, show only `Page 1 of 1`; render no page arrows.
- Keep title/counter centered with an intentional layout even when one arrow is absent. Use fixed toolbar regions or an invisible non-interactive spacer, not a disabled control.
- A page-arrow click changes the printed page only; it must never close the viewer or navigate browser history.

### P1 — browser/System Back behavior is undefined

The fullscreen viewer is modal application state, but it does not participate in browser history. Android Back, mouse Back, or browser Back can leave the grammar experience instead of closing the viewer.

Required behavior:

- Opening the viewer creates one temporary history sentinel.
- Browser/System Back closes the viewer and returns to the same grammar scroll position.
- Close and Escape remove the sentinel without leaving a duplicate history entry.
- Previous/Next printed-page navigation does not push history entries.
- Parent grammar Close retains its existing behavior when the viewer is not open.

Implementation note:

- Isolate this in `useBookViewerHistory(isOpen, onRequestClose)` or equivalent; do not scatter `pushState`/`popstate` logic through the renderer.
- Preserve the previous `history.state` and use a unique viewer key so cleanup cannot consume an unrelated history entry.

### P1 — the viewer consumes wheel input even when it cannot pan

`src/screens/grammar-lesson/components/BookPageViewer.tsx:124-145`

The wheel handler always calls `preventDefault()`. At Fit/100%, it then calculates a pan that clamps back to zero. Ordinary mouse-wheel and trackpad gestures feel broken.

Required fix:

- Viewer V2 should use a native `overflow: auto` page stage.
- At Fit, normal wheel input should have no custom handler.
- At zoom above Fit, native scrolling pans the enlarged page.
- Keep `Ctrl`/`Cmd` + wheel zoom only if it can be implemented without blocking ordinary scrolling; otherwise ship buttons and `+`/`-`/`0` first.
- Use `overscroll-behavior: contain` so scrolling never leaks to the grammar page.

### P1 — transform zoom is the likely source of white hairlines

`src/screens/grammar-lesson/components/BookPageViewer.tsx:87-117`

`src/screens/grammar-lesson/components/BookPageViewer.tsx:311-323`

The page starts at fractional fitted dimensions and is then translated/scaled with a CSS transform. Browser zoom, DPR scaling, and fractional transform values can anti-alias the page edges, producing thin bright lines against the black stage. Resize also does not re-clamp the current translation.

Required fix: replace transform-based zoom with layout-based sizing.

Recommended model:

```ts
interface FittedPageSize {
  width: number;
  height: number;
}

type ZoomLevel = 1 | 1.25 | 1.5 | 2 | 3 | 4;
```

1. Read the image's natural size after load.
2. Use `ResizeObserver` on the available stage to calculate a Fit size that preserves the page ratio.
3. Round Fit width and height to whole CSS pixels.
4. Render a page wrapper at `fitWidth * zoom` by `fitHeight * zoom`.
5. Render the image as `display: block; width: 100%; height: 100%` inside that wrapper.
6. Let the stage scroll natively when the wrapper exceeds it.
7. Give `<img>` explicit intrinsic `width` and `height` attributes from the known export dimensions or loaded natural size.
8. Use `overflow: clip` on the page wrapper and no image transform.
9. Use semantic dark tokens (`ui-ink-strong`, `ui-surface`) rather than raw black/white where practical.

This removes custom `tx`/`ty`, `clampPan()`, drag calculations, fractional transform translation, and most of the current 300-line interaction surface.

### P1 — global arrow handling consumes keys at page boundaries

`src/screens/grammar-lesson/components/BookPageViewer.tsx:147-178`

The handler prevents Arrow Left/Right even when there is no previous/next page. This makes a boundary key look active even though it has no outcome.

Required fix:

- Handle Arrow Left only when `pageIndex > 0`.
- Handle Arrow Right only when `pageIndex < pages.length - 1`.
- Call `preventDefault()` only when a page actually changes.
- Keep `+`, `-`, and `0` only if the respective zoom transition is available.
- Do not render or announce Zoom Out at Fit or Zoom In at maximum zoom.

### P1 — the progress rail describes grammar steps as cards

`src/lib/widgets/PartProgressRail.tsx:149-170`

The new grammar header reuses `PracticePartProgressRail`, whose accessible label is `Practice progress by part` and whose titles say `2 cards`. The browser snapshot currently announces `Grammar 1: 2 cards`.

Required fix:

- Generalize `PracticePartProgressRail` with optional `ariaLabel` and `unitLabel` props, defaulting to its current Practice copy.
- Grammar passes `ariaLabel="Grammar lesson progress"` and `unitLabel="steps"`.
- Do not fork a second visually identical rail.
- Consider renaming it to `SegmentedProgressRail` only if the rename remains a small, mechanical change.

### P2 — viewer image lacks explicit dimensions

`src/screens/grammar-lesson/components/BookPageViewer.tsx:311-323`

Add explicit `width` and `height` to the image to stabilize its layout and make the Fit calculation deterministic. Current exports observed during review are `1302 x 1800`, but Luna should confirm all exported pages share that size rather than hardcoding one unchecked value.

### P2 — optional-help animation changes layout height

`src/screens/grammar-lesson/components/GrammarHelpDisclosure.tsx:53-61`

The disclosure correctly unmounts its interactive children, but animating `height: 0 -> auto` performs layout work. This is acceptable for now, but if Luna touches it, prefer a short opacity/translate reveal or CSS grid-row reveal that honors reduced motion. Do not reintroduce hidden-but-mounted controls.

## Book Viewer V2 specification

### Primary user job

Read the printed source page closely, then return to the exact grammar position.

### Controls

Persistent top toolbar:

- Close — always visible.
- `Printed page 38 · 1 of 2` — centered.
- Previous — render only when available.
- Next — render only when available.

Persistent bottom toolbar:

- Zoom Out — render only above Fit.
- `Fit` at minimum; otherwise show `125%`, `150%`, etc. Clicking it resets to Fit.
- Zoom In — render only below maximum.

No other visible controls in this iteration.

### Remove from the current viewer

- Auto-hiding controls.
- Tap-to-show/hide controls.
- Swipe-to-change-page.
- Custom pointer map and drag translation.
- Double-click zoom.
- Custom pinch math.
- Custom non-zoom wheel panning.

These can be reconsidered later only after the simple viewer is reliable on mobile and desktop.

### Page presentation

- Full viewport overlay remains.
- Dark semantic stage, not a nested card.
- Page is centered at Fit with a small safe gutter on mobile and desktop.
- At zoom > Fit, the page grows in layout and the stage becomes the only scroll container inside the viewer.
- No border, white shadow, or light outline outside the actual scanned page.
- The page wrapper clips image edges so browser/DPR rounding cannot expose a seam.
- Switching pages resets to Fit and scrolls the stage to the top/center.
- Page failure state keeps Close visible and provides a clear next step.

### Focus and accessibility

- Initial focus: Close.
- Tab order: Close -> available page controls -> available zoom controls.
- No hidden or unavailable controls in the tab order.
- Escape and browser/System Back close the viewer.
- Focus returns to `View book page(s)` after every close path.
- Toolbar buttons use `IconActionButton`/`AppIcon` and descriptive labels.
- The viewer uses `role="dialog"`, `aria-modal="true"`, and a useful name.
- The stage uses `overscroll-contain` and includes safe-area padding.
- Browser page zoom remains enabled.

## File-by-file Luna implementation plan

### 1. Rewrite the viewer around native layout/scroll

File:

- `src/screens/grammar-lesson/components/BookPageViewer.tsx`

Steps:

1. Remove the auto-hide, gesture, transform, and pointer-map state.
2. Add stage size observation and fitted-page-size calculation.
3. Render the page with explicit layout dimensions and native scrolling.
4. Add persistent top and bottom toolbars with `pointer-events-auto`.
5. Conditionally render page/zoom controls only when available.
6. Reset zoom and scroll on page change.
7. Preserve loading failure, alt text, focus trap, portal, and reduced-motion behavior.
8. Keep the file below roughly 250 lines; extract pure math if needed.

### 2. Extract and test viewer math/history

New files:

- `src/screens/grammar-lesson/utils/bookViewerLayout.ts`
- `src/screens/grammar-lesson/hooks/useBookViewerHistory.ts`
- `tests/bookViewerLayout.test.ts`

Pure functions to test:

- Fit size for portrait page in wide stage.
- Fit size for portrait page in narrow/mobile stage.
- Whole-pixel rounded output.
- Zoom stepping and min/max boundaries.
- Previous/Next availability for first, middle, last, and one-page sets.
- Reset state on page change.

History behavior needs a browser/manual test because Node tests cannot verify browser Back accurately.

### 3. Repair parent inert/focus coordination

Files:

- `src/screens/grammar-lesson/GrammarLessonScreen.tsx`
- `src/screens/grammar-lesson/components/GrammarStudyPage.tsx`
- possibly `src/hooks/useModalFocus.ts`

Steps:

1. Create and pass a ref to the View Book action.
2. Centralize `openBookViewer()` and `closeBookViewer()` in the parent.
3. Ensure inert is removed before restoring focus.
4. Restore focus in `requestAnimationFrame` after close.
5. Ensure viewer Escape does not also close Grammar.
6. Ensure browser/System Back closes only Viewer when Viewer is open.

### 4. Generalize progress accessibility copy

Files:

- `src/lib/widgets/PartProgressRail.tsx`
- `src/lib/widgets/ScreenHeader.tsx`
- `src/screens/grammar-lesson/components/GrammarLessonHeader.tsx`
- `WIDGETS.md`

Steps:

1. Add optional progress-rail label/unit props through `ScreenHeader`.
2. Keep Practice defaults unchanged.
3. Supply grammar-specific `steps` copy.
4. Update the public widget documentation if the shared API changes.

### 5. Update the decision and grammar template

Files:

- `DECISIONS.md`
- `docs/GRAMMAR_LESSON_TEMPLATE.md`

Steps:

- Add a Viewer V2 decision that supersedes the auto-hide/custom-gesture viewer decision.
- Document persistent controls, conditional navigation, Fit-based layout zoom, native panning, and Back/Escape close behavior.
- Keep the existing decision history; do not rewrite or delete it.

## Suggested commits

1. `fix(grammar): restore book viewer controls`
2. `refactor(grammar): simplify viewer zoom and pan`
3. `fix(grammar): restore focus and back behavior`
4. `fix(grammar): label progress as lesson steps`
5. `docs(grammar): record book viewer v2`

Each commit must remain buildable. Do not mix vocabulary content, exercise grading, or unrelated widget migration into this repair.

## Acceptance checklist

### Viewer interactions

- Close is clickable immediately and after waiting 5 seconds.
- Previous is absent on page 1.
- Next is absent on the final page.
- One-page references show no page arrows.
- Arrow keys change pages only when a destination exists.
- Escape closes Viewer but not Grammar.
- Browser/System Back closes Viewer but not Grammar.
- Close, Escape, and Back all restore focus to View Book.

### Zoom/rendering

- Fit is the initial and minimum zoom.
- Zoom Out is absent at Fit.
- Zoom In is absent at maximum.
- Zooming uses layout dimensions, not `transform: scale()`.
- Zoomed content pans through the native viewer stage.
- No white hairlines appear at Fit, 125%, 150%, 200%, or browser zoom 80%/90%/100%/110%/125%.
- No horizontal or vertical page jump occurs when controls are used.
- Page changes reset to Fit.

### Responsive/accessibility

- Verify `390x844` and `1440x1000`.
- Verify mouse, trackpad, keyboard-only, and touch.
- No invisible focus targets.
- No disabled/ghost controls for unavailable actions.
- Viewer content does not leak scrolling to Grammar.
- Grammar progress announces steps, not cards.

### Quality gate

```bash
npm run content:validate
npm test
npm run typecheck
npm run lint
npm run build
```

## Luna execution guardrails

- Fix the P0 interaction/focus failures before visual polish.
- Prefer deletion over adding more gesture conditionals.
- Do not use raw reusable buttons; keep `IconActionButton`, `ActionButton`, and `AppIcon`.
- Do not add another icon family or neutral palette.
- Do not add a second page-scrolling container outside the viewer stage.
- Do not change the linear grammar flow, pattern content, or grading logic.
- Do not treat passing unit/build checks as proof that the viewer works; complete the browser checklist.

