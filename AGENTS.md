# Prompt/Agent Instructions

Auto-injected each project session. Keep these core rules concise; read the linked docs only when the task needs them.

## Code structure

- Shared UI primitives and patterns used by two or more features live in `src/lib/widgets/`; feature-specific components and containers stay beside their screen under `src/screens/<feature>/`. Cross-screen domain UI reused by multiple screens lives under `src/features/<domain>/`; generic presentation still belongs in `src/lib/widgets/`. Complex logic belongs in hooks; pure helpers in `src/utils/`; static content and types in `src/data/` or `src/types/`.
- Keep screens as small containers: `[hooks/state] -> [derived data] -> [UI]`. Prefer feature folders with `components/`, `hooks/`, `utils/`, and a public `index.ts` as complexity grows.
- Keep `App.tsx` to routing, global shell, and lightweight state. Do not lift complex cross-screen state there.
- Shared DB/API types go in `src/types/database.ts`; domain and UI models go in `src/types/models.ts` (with domain splits such as `grammar.ts` where appropriate).
- Rough size targets: screens/hooks under 250 lines; presentational widgets/helpers under 150. Extract when a file becomes hard to reason about.

## State, data, and security

- Use `src/store/useAppStore.ts` for persisted cross-screen state such as `activeBookId`, `learnedCards`, and `srsData`; keep visual-only state local.
- External fetching belongs in `src/services/`. Screens and widgets must not import Supabase, fetch, or direct database clients; use hooks that call services.
- Reference content follows a **pack-first** strategy (`public/data/...` cached in IndexedDB via `staticContentService`) with database fallbacks.
- Cache high-frequency lookups in memory where useful, such as a `Map` in `src/utils/cache.ts`.
- Mnemonics use pre-cached static/DB data and IDs (`word_{text}` for words, `{char}` for characters); learner-facing generation is disabled. Consult `docs/DATABASE_SCHEMA.md` and `src/services/mnemonicCache.ts` for data contracts.

## UI system

- RongWaps is premium-playful: clear Duolingo-like hierarchy, vivid semantic accents, rounded geometry, and tactile depth only for primary/direct-manipulation actions.
- Reuse existing widgets before creating new buttons, cards, inputs, or modals. Promote a component to `src/lib/widgets/` only when it is prop-driven, presentation-first, and clearly shared (or is an app-wide primitive such as `AppIcon`, a button, header, or dialog). Feature components may own feature hooks/services; shared widgets should not own app fetching or global feature state. Document only stable public widgets in `WIDGETS.md`, with props and one usage example.
- Use `ActionButton`, `IconActionButton`, and `SegmentedControl` for shared action patterns. Keep utility actions quiet; use one dominant primary action per surface.
- Functional icons go through semantic `AppIcon` using the approved Phosphor family. Do not introduce competing icon families or platform flag emoji; use `CountryFlag`.
- Use semantic tokens, never hardcoded neutral colors: `ui-border`, `ui-divider`, `ui-muted`, `ui-ink`, `ui-canvas`, `ui-surface`, `brand-*`, and `feedback-*`. Do not use hardcoded hex values (`#FFF`, `#E5E5E5`) or arbitrary pixel values. See `docs/DESIGN_TOKENS.md` for the full scale.
- Use the standard `.focus-ring` (or `.focus-ring-inline`) class instead of manual ring utilities.
- Use `font-sans` for UI copy and `font-chinese` for Chinese glyphs. Never hardcode font families; keep normal letter spacing except short uppercase labels.
- Do not put tactile buttons inside tactile containers or use card depth on plain page sections. Use the borderless bottom-edge tactile pattern (`border-b-[length:var(--depth-sm)] active:border-b-0 active:translate-y-[length:var(--depth-sm)]`) for interactive surfaces. Preserve accessibility labels, reduced motion, loading/empty/error states, and long-text behavior.
- Keep settings panels and control popovers minimal, tactile, and uncluttered: prefer direct label-and-control pairs without redundant explanatory body copy, and use quiet category labels (`text-xs font-black uppercase tracking-wider text-ui-muted-strong`) over heavy section banners.

## Layout and responsive behavior

- RongWaps is mobile-first. Validate substantial UI work at mobile and desktop sizes.
- **One page canvas (tone owner contract):** `LayoutShell` root is the ONLY owner of the workspace tone (`bg-ui-canvas`, or `bg-ui-practice-canvas` while a practice activity is open or a column-only practice overlay like the dictionary detail flags `practiceCanvasOpen`) — the sidebar lane and content column are transparent over it. The side navigation is a **floating surface bar** (`bg-ui-surface` rounded silhouette + tactile bottom block border; active nav item = soft `bg-ui-canvas` chip, inactive = transparent + `hover:bg-ui-hover`) — the `SideNav` element itself stays transparent and never hardcodes a fill. Full-viewport overlay windows paint their OWN tone across the whole viewport including the sidebar lane and pad content by `var(--workspace-nav-width)` (pattern: `GrammarLessonScreen`, Reader = `bg-ui-practice-canvas`, Grammar = `bg-ui-canvas`) — they never drive the shell swap. Loading/empty/error surfaces must inherit their window's tone, never paint their own page-level fill: full-viewport study windows (Grammar, Reader) are EAGER window shells — their heavy content chunks (`GrammarStudyPage`, `BookPageViewer`, `ReadingCanvas`/`ReadingNarrativeView`, the dialogue-alignment pack) load INSIDE the mounted window under `LoadingScreen inline`, never as a root-level lazy window (that forces a loading-then-window flash); states inside the practice modal wrapper (e.g. `EmptyReviewState`, `WritingScreen`) must not paint `bg-ui-canvas`. Route containers, headers, and normal-flow screens stay transparent; only shell root, full-screen windows, and canonical sticky fades may reference canvas tokens.
- The shell `main` is the primary screen-level scroll container. Avoid accidental nested screen scrollers, while bounded overlays (dialogs, drawers, book viewer, popovers) manage their own internal scrolling.
- Top-level workspace headers use the canonical sticky fade: `sticky top-0 z-40 bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent backdrop-blur-[2px]`.
- Desktop Books keeps permanent side navigation. Other top-level workspaces may hide it and show a quiet restore control. Mobile uses the closable drawer and compact `MainHeader`.
- Full-screen study windows, drawers, settings, dictionary views, and overlays stay inside the desktop workspace and use the shared `workspace-window` bounds; mobile may use the full viewport.
- Dialog sizing & tab stability: Ensure comfortable touch targets on mobile. In multi-tab modals and settings panels, embed segmented tab controls directly in the header bar to avoid stacked chrome, and use stable container heights with internal scroll so switching tabs does not cause vertical layout shifts.

## Backend and server

- The Express backend server lives in `server/` and provides media streaming endpoints (e.g. `/api/audio/*`). Keep backend code strictly isolated from the client React application in `src/`.

## Grammar and feature-specific guidance

- Grammar is source-first and reading-centered: keep the source Reading stored once and group its grammar points in the same Part.
- For grammar architecture, content contracts, and authoring rules, consult `docs/GRAMMAR_LESSON_TEMPLATE.md` and active decisions in `DECISIONS.md` before modifying grammar screens or lesson data.
- For other feature-specific work, inspect the relevant document in `docs/` instead of expanding this file with a permanent rule.

## Documentation and judgment

- Add a project-wide user rule here only when it is genuinely durable. Update `WIDGETS.md` when adding a reusable widget. Keep docs and code aligned.
- Prefer the simplest structure that meets the current requirement. Reuse or consolidate before adding abstractions, configuration, or dependencies. Flag only real trade-offs; never remove required validation, security, accessibility, or error handling.
