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

Used for the 3D bottom-edge tactile effect on buttons and cards via a two-layer stationary base architecture (`absolute inset-x-0 bottom-0 top-[length:var(--depth-*)]` base + `relative mb-[length:var(--depth-*)] group-active:translate-y-[length:var(--depth-*)]` front). The bottom border of the button remains 100% stationary on press (0.00px bottom border movement) and siblings underneath experience 0.00px layout shift. Never use `active:border-b-0` or translate the outer button container, which causes adjacent content to jump or plunges the bottom border below the baseline.

- `--depth-sm` (2px) — Quiet controls, small badges, tiles
- `--depth-md` (4px) — Primary controls, choice options, small cards
- `--depth-lg` (5px) — Hero buttons, primary actions (`ActionButton`)
- `--depth-xl` (6px) — Elevated containers, large tactile audio buttons

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

## 7. Overlay layers (`z-*`)

Overlay stacking has one owner: the `--z-index-*` scale in `src/index.css` `@theme`, surfaced as Tailwind `z-*` utilities. **Claim the rung for the kind of surface you own; never invent a numeric `z-[…]` value.** A rung is a layer, not a component: two surfaces may share one only when they can never be open at once, or when one is nested inside the other (nesting is what separates `ConfirmationDialog` from the drawer/dialog that opened it).

| Utility | Value | Layer / owners |
|---|---|---|
| `z-tooltip` | 90 | Pointer-anchored tooltips (`ReaderWordTooltip`) |
| `z-content` | 100 | Content layer of an overlay surface, below its chrome: activity screen roots (`QuizScreen`, `ListeningScreen`, `WritingScreen`), `LessonComplete`, in-window loading (`LoadingScreen`) |
| `z-activity-header` | 150 | Sticky header strip of the activity surface (`ActivityModals`) |
| `z-activity` | 200 | The activity modal shell (`ActivityModalWrapper`) |
| `z-dock` | 250 | Floating docks and their scrims (`PracticeModeDock`, `SearchModeDock`, `WritingDock`, the mobile nav scrim) |
| `z-overlay` | 300 | Overlay-host container inside an activity/column (`activity-overlays-root`, `character-breakdown-overlay-container`) |
| `z-detail` | 400 | Workspace-bounded detail window (`WorkspaceDetailShell`) |
| `z-detail-raised` | 450 | Detail window stacked above another detail window (`V3TreeScreen`) |
| `z-window` | 500 | Full-viewport windows (`GrammarLessonScreen`), full-screen loading (`LoadingScreen fullScreen`), drawer base layer (`BottomDrawer`) |
| `z-shell` | 600 | App chrome that outranks every window (sidebar and mobile nav panel in `LayoutShell`) and full-screen viewers that cover it (`BookPageViewer`, grammar book fallback) |
| `z-drawer` | 650 | Reader study drawer (`ReaderStudyDrawer`) |
| `z-dialog` | 700 | Dialogs and settings windows (`ConfirmationDialog`, `FolderModal`, `DictionaryDetailOverlay`, `PracticeSettingsScreen`) |
| `z-popover` | 800 | Hover/anchored popovers (`PosBadge`, `MemoryHookPopover`) |
| `z-auth` | 900 | Sign-in window (`SignInWindow`) |
| `z-devtools` | 1000 | Developer tools (`DebugToolsOverlay`) |

Two rules keep the table meaningful:

- **Ascend in depth, not in importance.** A popover (800) outranks a dialog (700) because it opens *on top of* one, not because it matters more.
- **Stacking contexts, not numbers, decide the outcome.** An ancestor with `position` + `z-index` (the shell content column is `relative z-10`) traps its descendants' z-index inside it, so a body-portaled overlay always paints above an in-tree one with the same value. When a surface must beat another that is portaled to the body, it needs a higher rung *and* a portal, not just a bigger number.

`z-0`…`z-50` stay what they are: ordinary local stacking for children of one component (`z-10`, `z-20`, `z-30` for a surface's own layers, `z-50` for a dock's opened menu). Reach for a rung the moment an element has to stack against *another* surface rather than against its own siblings.

## 8. Typography & Translations

Typography rules maintain visual harmony across Latin UI text, Chinese glyphs, and explanatory translations:

- **Font stack hierarchy**:
  - `font-sans` (`--font-sans`): Nunito-first interface stack for all English UI text, headings, buttons, and translations.
  - `font-chinese` (`--font-chinese`): harmonized sans CJK stack (`Nunito`, `PingFang TC`, `Noto Sans CJK`, fallbacks) for Chinese character display — glyphs share the UI's rounded sans voice. The Study settings "Character font" choice (`characterFont`, sans by default) writes `data-character-font` on `<html>`: `kai` swaps this token to `--font-kaiti` (TW-EduKai calligraphy) and `huninn` swaps it to `--font-chinese-huninn` (the bundled rounded Traditional face, jf open 粉圓 / Huninn, OFL 1.1, subset to the course glyphs and loaded only while selected).
  - `font-chinese-sans` / `font-kaiti` / `font-chinese-huninn`: explicit stacks for previews and one-off surfaces; `--font-chinese` resolves to `--font-chinese-sans` unless a `data-character-font` override is set. Because `Nunito` is placed first in every stack, ASCII Latin characters within mixed strings render in `Nunito`, while Chinese glyphs fall through to the CJK family. Huninn is a Traditional face: simplified-only forms and rare component glyphs fall through to the system CJK/RW-Extras fallbacks.
  - Huninn ships a single 400 weight, so `data-character-font='huninn'` also sets `font-synthesis-weight: none`: faked bold merges the strokes of dense glyphs (臺, 灣) into a blob, and the rounded option instead renders every weight as drawn.
- **Universal translation style (`.ui-translation`)**:
  - Translations (English glosses accompanying Chinese example sentences, patterns, and words) must use the `.ui-translation` utility class rather than one-off weights or tones.
  - `.ui-translation` sets `font-family: var(--font-sans)`, `font-weight: 700`, `color: var(--color-ui-muted-strong)`, and `line-height: 1.625` — the same bold voice as definitions and memory-hook body copy, in the shared muted gray token.
- **Inline Chinese in prose (`.prose-chinese`)**:
  - Applied to prose containers whose inline Chinese must match the example-sentence scale (grammar explanations). It scales every `.font-chinese` descendant to `1.25em` (mobile) / `1.3333em` (sm+) — e.g. 16px prose → 20px characters, 18px prose → 24px characters — so characters do not read smaller than the bold Latin around them. Line boxes stay inside the prose leading (20px glyphs in `leading-7`, 24px in `sm:leading-8`).
  - Component-specific sizing (e.g. `text-xs`, `text-sm`, `text-base`) can be paired with `.ui-translation` to fit information density.
  - Meta chrome (uppercase eyebrows, badges, counts, `B# · L#` refs, pinyin lines, loading/status hints) keeps its quiet muted tokens; it is label text, not body copy.

## 9. Safe Area & Dock Layout Tokens

RongWaps supports both web and iOS standalone PWA (`viewport-fit=cover`). To avoid arbitrary pixel values and hardcoded `env(safe-area-inset-bottom)` math scattered across components, layout dimensions and safe-area offsets are centralized in `src/index.css`.

### Custom Properties (`:root`)

- `--safe-area-bottom: env(safe-area-inset-bottom, 0px);` — Hardware home-indicator inset.
- `--dock-height: 60px;` — Universal height for all floating dock pills.
- `--dock-bottom: max(1rem, calc(var(--safe-area-bottom) + 0.75rem));` — Elevation of floating docks above screen bottom.
- `--dock-clearance: max(6.5rem, calc(var(--safe-area-bottom) + 5.5rem));` — Bottom padding for scrollable views containing docks.
- `--sheet-safe-pb: max(1rem, calc(var(--safe-area-bottom) + 0.5rem));` — Bottom padding for edge-to-edge docked sheets and sticky action footers.

### Semantic Utility Classes (`@layer utilities`)

| Utility | Property / Value | Usage & Owners |
|---|---|---|
| `.bottom-dock-safe` | `bottom: var(--dock-bottom)` (responsive: `sm:bottom-5`, `md:bottom-6`) | Floating docks (`PracticeModeDock`, `ReadingBottomDock`, `WritingDock`, `SearchModeDock`). Lifts dock comfortably above iOS home indicator. |
| `.pb-dock-clearance` | `padding-bottom: var(--dock-clearance)` (responsive: `sm:pb-28`) | Scroll containers containing floating docks (`FlashcardScreen`, `FlashcardList`, `SearchScreen`, `LessonComplete`, `ScreenSkeleton`). Prevents last element from hiding behind dock. |
| `.pb-sheet-safe` | `padding-bottom: var(--sheet-safe-pb)` | Docked sheets and sticky bottom footers (`FeedbackBottomBar`, `CurriculumLibrary`, `LibraryScreen`, `GrammarLessonScreen`, `BookViewerFooter`, `BottomCharacterTabs`). |
| `.pb-safe-area` | `padding-bottom: max(1rem, var(--safe-area-bottom))` | Scrollable drawer/sheet inner content (`BottomDrawer`, `ReaderStudyDrawer`). |
| `.dock-pill` | `height: var(--dock-height); min-height: var(--dock-height)` | Fixed 60px height for all dock pills. |
| `.btn-touch-primary` | `min-height: 52px; sm:min-height: 56px` | Touch-friendly primary action buttons (`Continue`, `Check`, `Start`, `Review`). |

### Rules

- **Never hardcode `env(safe-area-inset-bottom)` in component files.** Use `.bottom-dock-safe`, `.pb-dock-clearance`, `.pb-sheet-safe`, or `.pb-safe-area`.
- **Never use arbitrary dock dimensions** (e.g. `bottom-[max(...)]`, `pb-[calc(...)]`, `h-[60px]`). Use the semantic utility classes.


