# RongWaps System Architecture

This document describes the current application structure and the boundaries the widget refactor is establishing. The refactor is intentionally incremental: existing screen slices remain valid, while domain UI is moved out of the global widget library only when ownership is clear.

## Source layout

```text
src/
├── App.tsx                 # routing, global shell, and lightweight app state
├── screens/                # route and study experiences; each may own components/hooks/utils
├── features/               # cross-screen domain packages, created only when needed
├── app/                    # application shell components after shell extraction
├── lib/widgets/            # generic primitives and stable shared presentation patterns
├── hooks/                  # app-wide hooks that are not owned by one screen
├── services/               # external data and API access
├── store/                  # Zustand domain stores and compatibility facade
├── data/                   # static curriculum, design tokens, and authored content
├── types/                  # shared database and application models
└── utils/                  # pure helpers and caches
```

`src/screens/<feature>/` is the default home for feature-specific UI. Existing screen folders such as `grammar-lesson`, `library`, `flashcard`, `quiz`, `reading-lesson`, and `writing` are vertical slices and do not need to be moved into `src/features/`.

Profile, flashcard, and curriculum components that have one clear owner live in their screen-local `components/` folders. This keeps feature-specific presentation close to its screen without expanding the cross-screen feature packages.

`src/features/<domain>/` is reserved for domain UI genuinely reused by multiple screens, such as character breakdown, dictionary, or practice session presentation. The current practice package owns settings, practice headers, answer feedback, choice rows, and completion states. Each domain package exposes only the API needed by other modules through its `index.ts`; consumers must not reach into another feature's internal folders.

The shared library now contains only generic presentation. App-shell components live in `src/app/`, cross-screen domain UI lives in `src/features/<domain>/`, and screen-specific presentation stays beside its owning screen. The public widget API is the barrel in `src/lib/widgets/index.ts`; internal helpers such as the part-progress rail remain private to the shared component that composes them.

## Dependency direction

```text
screens ───────► features ───────► services
    │                │
    └──────────────► widgets

screens/features ─► hooks, store, data, types, utils
services/store/data/types/utils ─► no screens or UI features
widgets ─► shared tokens, types, and pure utilities only
```

The allowed rules are:

- Screens may compose feature packages and shared widgets.
- Feature packages may use services, stores, data, types, utilities, and shared widgets.
- Shared widgets are presentation-first. They must not import feature code, feature services, or feature stores.
- Services own external fetching and persistence boundaries. UI does not import Supabase, direct database clients, or raw remote-fetch code.
- Stores own cross-screen state. Visual-only state remains local to the owning component or hook.
- Services, stores, data, and utilities must not import screens or UI features.

## Enforced boundaries

The existing ESLint configuration contains a small set of core `no-restricted-imports` rules. They are intentionally narrow and require no additional lint dependency:

- `src/lib/widgets/` cannot import from `src/screens/` or `src/features/`.
- `src/services/` cannot import UI modules from `src/app/`, `src/screens/`, `src/features/`, or `src/lib/widgets/`.
- A feature package cannot reach into another feature package's internal folders. Its public directory/index API remains available for intentional cross-feature composition.

The feature rule lists the current packages explicitly (`character-breakdown`, `dictionary`, and `practice`). When a new cross-screen feature package is added, update the corresponding ESLint override so the same internal-folder boundary applies. These checks guard import direction; they do not replace ownership review or the public barrels.

## Component ownership

### Shared widgets

`src/lib/widgets/` contains:

- small, prop-driven primitives such as `ActionButton`, `IconActionButton`, `SegmentedControl`, `AppIcon`, `Skeleton`, and `CountryFlag`;
- stable presentation patterns demonstrably used by multiple features, such as dialogs, drawers, headers, progress, and workspace shells;
- only components listed in the public `WIDGETS.md` catalog and exported from the shared barrel.

A component starts feature-local. Promote it to shared widgets only after real cross-feature reuse or when it is an obvious app-wide primitive. Shared widgets should accept data and callbacks through props and should not acquire product-domain state merely to make reuse convenient.

### Screens and features

Screen containers connect hooks, stores, services, derived data, and presenters. Keep the flow readable:

```text
hooks/state → derived data → UI rendering
```

Feature-specific components stay with their screen. When the same domain presentation is needed by multiple screens, create a small `src/features/<domain>/` package with a focused public API rather than adding more domain code to the global widget barrel.

### App shell

Application-wide routing, navigation, and layout belong in `App.tsx` and, after extraction, `src/app/`. App-shell code should not be presented as generic widget-library code. The shell may compose shared widgets and feature packages, but shared widgets must not depend on the shell.

## State, data, and persistence

- Zustand stores in `src/store/` own persisted cross-screen state and domain state. `useAppStore` remains a compatibility facade while new code can use focused domain stores directly.
- Hooks coordinate UI lifecycle and service/store access. Complex logic should not be lifted into `App.tsx`.
- Services in `src/services/` own Supabase, API, authentication, audio, dictionary, vocabulary, and other external access.
- Static curriculum and authored lesson content belongs in `src/data/`. Database/API contracts belong in `src/types/database.ts`; application models belong in `src/types/models.ts`.
- Pure transformations and caches belong in `src/utils/`.

## UI foundations

Design values are centralized in `src/data/designTokens.ts` and the semantic CSS/Tailwind tokens in `src/index.css`. Components use semantic `ui-*`, `brand-*`, and `feedback-*` tokens rather than hardcoded neutral colors or local font-family declarations.

Functional icons go through the semantic `AppIcon` gateway. Motion uses the project's current `motion/react` integration; transitions remain close to the interaction they describe and must respect reduced-motion preferences.

RongWaps is mobile-first and uses one workspace scroll container owned by the shell `main`. Shared layout patterns must preserve the sticky workspace header, workspace-bounded desktop overlays, keyboard focus, accessible labels, loading/empty/error states, and long-text behavior.

## Refactor guardrails

- Move confirmed ownership; do not rewrite working internals just to make files look uniform.
- Preserve component names, props, behavior, styling, responsive behavior, and public flows unless a phase explicitly requires an import or ownership change.
- Keep public exports intentional. Do not add exports “for later.”
- Run the required checks after each phase and stop for review before starting the next phase.

## Character decomposition staging boundary

Character decomposition evaluation uses a private, provenance-first staging subsystem under `src/features/character-decomposition/staging/`. Source adapters feed immutable normalized records; selection, conflict resolution, diagnostics, metadata, and releases remain independent layers. The service-role writer is command-line tooling only and is not imported by screens, hooks, or learner runtime services.

`character_decompositions` is a guarded release projection and is not the existing runtime `character_breakdowns_v2` table. A future static-pack publisher may read only an approved, license-cleared release. Until that separate phase is approved, the app continues using its current breakdown packs unchanged.
