# Prompt/Agent Instructions

Auto-injected each project session. Keep these core rules concise; read the linked docs only when the task needs them.

## Code structure

- Shared UI primitives and patterns used by two or more features live in `src/lib/widgets/`; feature-specific components and containers stay beside their screen under `src/screens/<feature>/`. Cross-screen domain UI reused by multiple screens may live under `src/features/<domain>/`; generic presentation still belongs in `src/lib/widgets/`. Complex logic belongs in hooks; pure helpers in `src/utils/`; static content/types in `src/data/`.
- Keep screens as small containers: `[hooks/state] -> [derived data] -> [UI]`. Prefer feature folders with `components/`, `hooks/`, `utils/`, and a public `index.ts` as complexity grows.
- Keep `App.tsx` to routing, global shell, and lightweight state. Do not lift complex cross-screen state there.
- Shared DB/API types go in `src/types/database.ts`; app/UI models go in `src/types/models.ts`.
- Rough size targets: screens/hooks under 250 lines; presentational widgets/helpers under 150. Extract when a file becomes hard to reason about.

## State, data, and security

- Use `src/store/useAppStore.ts` for persisted cross-screen state such as `activeBookId`, `learnedCards`, and `srsData`; keep visual-only state local.
- External fetching belongs in `src/services/`. Screens and widgets must not import Supabase, fetch, Axios, or direct DB clients; use hooks that call services.
- Cache high-frequency lookups in memory where useful, such as a `Map` in `src/utils/cache.ts`.
- Mnemonics use the existing DB/API flow and IDs (`word_{text}` for words, `{char}` for characters); consult `docs/API_SPEC.md`, `docs/DATABASE_SCHEMA.md`, and `src/services/aiService.ts` for implementation details.

## UI system

- RongWaps is premium-playful: clear Duolingo-like hierarchy, vivid semantic accents, rounded geometry, and tactile depth only for primary/direct-manipulation actions.
- Reuse existing widgets before creating new buttons, cards, inputs, or modals. Promote a component to `src/lib/widgets/` only when it is prop-driven, presentation-first, and clearly shared (or is an app-wide primitive such as `AppIcon`, a button, header, or dialog). Feature components may own feature hooks/services; shared widgets should not own app fetching or global feature state. Document only stable public widgets in `WIDGETS.md`, with props and one usage example.
- Use `ActionButton`, `IconActionButton`, and `SegmentedControl` for shared action patterns. Keep utility actions quiet; use one dominant primary action per surface.
- Functional icons go through semantic `AppIcon` using the approved Phosphor family. Do not introduce competing icon families or platform flag emoji; use `CountryFlag`.
- Use semantic tokens, never hardcoded neutral colors: `ui-border`, `ui-divider`, `ui-muted`, `ui-ink`, `ui-canvas`, `ui-surface`, `brand-*`, and `feedback-*`. Shared values belong in `src/data/designTokens.ts` and `src/index.css`.
- Use `font-sans` for UI copy and `font-chinese` for Chinese glyphs. Never hardcode font families; keep normal letter spacing except short uppercase labels.
- Do not put tactile buttons inside tactile containers or use card depth on plain page sections. Preserve focus rings, accessibility labels, reduced motion, loading/empty/error states, and long-text behavior.

## Layout and responsive behavior

- RongWaps is mobile-first. Validate substantial UI work at mobile and desktop sizes.
- The shell `main` is the only workspace scroll container. Do not add nested `overflow-y-auto`/`h-full` screen scrollers.
- Top-level workspace headers use the canonical sticky fade: `sticky top-0 z-40 bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent backdrop-blur-[2px]`.
- Desktop Books keeps permanent side navigation. Other top-level workspaces may hide it and show a quiet restore control. Mobile uses the closable drawer and compact `MainHeader`.
- Full-screen study windows, drawers, settings, dictionary views, and overlays stay inside the desktop workspace and use the shared `workspace-window` bounds; mobile may use the full viewport.

## Grammar and feature-specific guidance

- Grammar is source-first and reading-centered: keep the source Reading stored once, group its grammar points in the same Part, and currently use `Grammar -> next Grammar -> Part complete`; the final Continue marks the Part complete and closes the grammar window without a separate completion screen. Exercise data remains authored but learner-facing practice is temporarily hidden while the beta flow is grammar-only.
- For grammar work, read `docs/GRAMMAR_LESSON_TEMPLATE.md`, the relevant grammar plan/source, and `DECISIONS.md` before changing behavior or layout. Those documents hold the detailed patterns, exercises, source-page rules, lookup behavior, and current decisions.
- For other feature-specific work, inspect the relevant document in `docs/` instead of expanding this file with a permanent rule.

## Documentation and judgment

- Add a project-wide user rule here only when it is genuinely durable. Update `WIDGETS.md` when adding a reusable widget. Keep docs and code aligned.
- Prefer the simplest structure that meets the current requirement. Reuse or consolidate before adding abstractions, configuration, or dependencies. Flag only real trade-offs; never remove required validation, security, accessibility, or error handling.
