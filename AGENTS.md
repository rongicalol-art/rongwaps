# Prompt/Agent Instructions

Auto-injected each session. Core rules terse; read linked docs only when task needs them.

## Code structure

- Shared UI used by 2+ features live in `src/lib/widgets/`. Feature-specific components stay beside screen under `src/screens/<feature>/`. Cross-screen domain UI reused by multiple screens lives in `src/features/<domain>/`. Complex logic in hooks; pure helpers in `src/utils/`; static content + types in `src/data/` or `src/types/`.
- Screens = small containers: `[hooks/state] -> [derived data] -> [UI]`. Feature folders with `components/`, `hooks/`, `utils/`, public `index.ts` as complexity grows.
- `App.tsx` = routing, global shell, light state only. No complex cross-screen state there.
- DB/API types in `src/types/database.ts`; domain/UI models in `src/types/models.ts` (domain splits like `grammar.ts` where fit).
- Size targets: screens/hooks under 250 lines; widgets/helpers under 150. Extract when file hard to reason about.

## State, data, security

- Persisted cross-screen state in `src/store/useAppStore.ts` + slices (`activeBookId`, `learnedCards`, `srsData`); visual-only state stays local.
- External fetching in `src/services/`. Screens/widgets must not import Supabase, fetch, or direct DB clients; hooks call services.
- Reference content = **pack-first** (`public/data/...` cached in IndexedDB via `staticContentService`) with DB fallbacks.
- Cache hot lookups in memory, e.g. `Map` in `src/utils/cache.ts`.
- Mnemonics use pre-cached static/DB data + IDs (`word_{text}` words, `{char}` chars); learner-facing generation disabled. See `docs/DATABASE_SCHEMA.md` + `src/services/mnemonicCache.ts`.

## UI system

- RongWaps premium-playful: Duolingo-like hierarchy, vivid semantic accents, rounded geometry, tactile depth only for primary/direct actions.
- Reuse widgets before new buttons/cards/inputs/modals. Promote to `src/lib/widgets/` only if prop-driven, presentation-first, clearly shared (or app-wide primitive like `AppIcon`, button, header, dialog). Feature components may own feature hooks/services; shared widgets own no app fetching or global state. Document stable public widgets in `WIDGETS.md` with props + one example.
- Shared actions: `ActionButton`, `IconActionButton`, `SegmentedControl`. Utility actions quiet; one dominant primary action per surface.
- Icons via semantic `AppIcon`, approved Phosphor family. No competing icon families or platform flag emoji; use `CountryFlag`.
- Semantic tokens, never hardcoded neutral colors: `ui-border`, `ui-divider`, `ui-muted`, `ui-ink`, `ui-canvas`, `ui-surface`, `brand-*`, `feedback-*`. No hardcoded hex (`#FFF`, `#E5E5E5`) or arbitrary pixel values. Full scale: `docs/DESIGN_TOKENS.md`.
- Focus: standard `.focus-ring` (or `.focus-ring-inline`), not manual ring utilities.
- Fonts: `font-sans` UI copy, `font-chinese` Chinese glyphs. Never hardcode font families; normal letter spacing except short uppercase labels.
- No tactile buttons inside tactile containers, no card depth on plain page sections. Borderless bottom-edge tactile pattern (`border-b-[length:var(--depth-sm)] active:border-b-0 active:translate-y-[length:var(--depth-sm)]`) for interactive surfaces. Preserve accessibility labels, reduced motion, loading/empty/error states, long-text behavior.
- Settings panels + popovers minimal, tactile, uncluttered: direct label-and-control pairs, no redundant body copy; quiet category labels (`text-xs font-black uppercase tracking-wider text-ui-muted-strong`) over heavy section banners.

## Layout + responsive

- Mobile-first. Validate substantial UI work at mobile + desktop sizes.
- **One page canvas (tone owner contract):** `LayoutShell` root ONLY owner of workspace tone (`bg-ui-canvas`, or `bg-ui-practice-canvas` while practice activity open or column-only practice overlay like dictionary detail flags `practiceCanvasOpen`) — sidebar lane + content column transparent over it. Side nav = **floating surface bar** (`bg-ui-surface` rounded silhouette + tactile bottom block border; active nav item = soft `bg-ui-canvas` chip, inactive = transparent + `hover:bg-ui-hover`) — `SideNav` itself stays transparent, never hardcodes fill. Full-viewport overlay windows paint their OWN tone across whole viewport incl. sidebar lane, pad content by `var(--workspace-nav-width)` (pattern: `GrammarLessonScreen`, Reader = `bg-ui-practice-canvas`, Grammar = `bg-ui-canvas`) — never drive shell swap. Loading/empty/error surfaces inherit their window's tone, never paint own page-level fill: full-viewport study windows (Grammar, Reader) are EAGER window shells — heavy chunks (`GrammarStudyPage`, `BookPageViewer`, `ReadingCanvas`/`ReadingNarrativeView`, dialogue-alignment pack) load INSIDE mounted window under `LoadingScreen inline`, never root-level lazy window (forces loading-then-window flash); states inside practice modal wrapper (e.g. `EmptyReviewState`, `WritingScreen`) must not paint `bg-ui-canvas`. Route containers, headers, normal-flow screens stay transparent; only shell root, full-screen windows, canonical sticky fades reference canvas tokens.
- Shell `main` = primary screen-level scroll container. No accidental nested screen scrollers; bounded overlays (dialogs, drawers, book viewer, popovers) manage internal scrolling.
- Top-level workspace headers use canonical sticky fade: `sticky top-0 z-40 bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent backdrop-blur-[2px]`.
- Desktop Books keeps permanent side nav. Other workspaces may hide it + show quiet restore control. Mobile: closable drawer + compact `MainHeader`.
- Full-screen study windows, drawers, settings, dictionary views, overlays stay inside desktop workspace, use shared `workspace-window` bounds; mobile may use full viewport.
- Dialog sizing + tab stability: comfortable touch targets on mobile. Multi-tab modals + settings panels: segmented tabs embedded in header bar (no stacked chrome); stable container heights + internal scroll so tab switch causes no vertical layout shift.

## Backend + server

- Express backend in `server/`, media streaming endpoints (e.g. `/api/audio/*`). Backend strictly isolated from client React app in `src/`.

## Grammar + feature-specific

- Grammar source-first, reading-centered: source Reading stored once; grammar points grouped in same Part.
- Grammar architecture/contracts/authoring: consult `docs/GRAMMAR_LESSON_TEMPLATE.md` + `DECISIONS.md` before modifying grammar screens or lesson data.
- Other feature work: inspect relevant doc in `docs/`, don't expand this file with permanent rules.

## Documentation + judgment

- Add project-wide rule here only when genuinely durable. Update `WIDGETS.md` when adding reusable widget. Keep docs + code aligned.
- Simplest structure meeting requirement. Reuse/consolidate before adding abstractions, config, dependencies. Flag only real trade-offs; never remove required validation, security, accessibility, error handling.

## Architectural rules (refactor contract)

1. New cross-screen state goes into matching store slice (`src/store/slices/`) with persistence class declared — never appended ad hoc to composed store, never a second representation of existing persisted state.
2. Pack-first content uses `createPackLoader` (`src/services/packLoader.ts`); no new `*PackService` — new content type = validation + configured loader.
3. Card-session mechanics in `useCardSession`; activities own only answer UX. No new per-activity session engine.
4. SRSData ↔ database row conversion only in `src/utils/srsRowMapping.ts` (incl. sync delta equality).
5. Business rules never duplicated between UI and services; one owner file each.
6. `server/` never imports browser application infrastructure (ESLint-enforced); shared items = types only.
7. Authored content must not require new React engine code unless genuinely new behavior type (labs/exercises data-driven).
8. Dev-only tooling gated behind `import.meta.env.DEV`, absent from prod bundles.
9. Documentation describes architecture that EXISTS — comment describing planned state = bug.
10. Before adding abstraction, name the duplication it removes; else prefer boring, obvious code.
