---
paths:
  - "src/**"
  - "server/**"
  - "shared/**"
---
# App code rules

Layout, layers and import boundaries: `docs/ARCHITECTURE.md` (ESLint enforces the boundaries, so a lint error there means the code is in the wrong layer, not that the rule needs an exception). Schema: `docs/DATABASE_SCHEMA.md`.

Each of these has one owner, so a second copy is a bug waiting to disagree with the first:

- Cross-screen state: a slice in `src/store/slices/` that declares its persistence. Visual-only state stays local; reuse app-store settings instead of per-screen duplicates.
- Pack-first content: `createPackLoader`. No new `*PackService`.
- Card-session mechanics (deck lifecycle, resume, mistake queue): `useCardSession`. Activities own only their answer UX.
- SRSData ↔ database row conversion: `src/utils/srs/srsRowMapping.ts`.
- External access (Supabase, fetch, database clients): `src/services/`. Screens and widgets go through hooks. `server/` shares only types with the browser app.
- A business rule lives in one file, never repeated across UI and services.

Also:

- Authored content should not need new engine code unless it is a new kind of behaviour.
- Dev-only tooling sits behind `import.meta.env.DEV`.
- `App.tsx` is routing and shell only. Screens are small containers: hooks and state, derived data, UI.
- Types: database and API in `src/types/database.ts`; domain and UI in `src/types/models.ts` (domain splits like `grammar.ts`).
- File-size budgets that matter are tests in `tests/acceptance/code_quality.test.ts`. Extract when a file mixes two jobs, not to hit a line count.
