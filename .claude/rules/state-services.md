---
paths:
  - "src/store/**"
  - "src/services/**"
  - "src/hooks/**"
  - "src/utils/**"
  - "src/types/**"
---
# State, services, data rules

- Persisted cross-screen state: `src/store/useAppStore.ts` + slices (`activeBookId`, `learnedCards`, `srsData`). Visual-only state stays local. Reuse app-store settings; no per-screen duplicates.
- All external fetching in `src/services/`. Screens/widgets never import Supabase/fetch/DB clients; hooks call services.
- Types: DB/API in `src/types/database.ts`; domain/UI in `src/types/models.ts` (domain splits like `grammar.ts`). Schema: `docs/DATABASE_SCHEMA.md`.
- Complex logic in hooks; pure helpers in `src/utils/`. Hot lookups cached in memory (`src/utils/cache.ts`).
- Size guidance: screens/hooks ~250 lines, widgets/helpers ~150 — overage means extract. Enforced budgets: `tests/acceptance/code_quality.test.ts`.
- Shared practice-header changes must be checked across flashcards, quiz, listening and writing together.
