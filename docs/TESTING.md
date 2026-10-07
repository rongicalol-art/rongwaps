# Testing

Runner: Node native test runner (`node:test` + `node:assert/strict`) via `tsx`. No facades: tests exercise real loaders, services, file structures and component contracts, and isolate their own state.

## Commands

| Command | What it runs |
| --- | --- |
| `npm test` | `tests/unit`, `tests/content`, `tests/pipeline` and the acceptance runner, with `ACCEPTANCE_STRICT=true` (acceptance criteria fail instead of skipping). |
| `npx tsx --test tests/acceptance/*.test.ts` | Acceptance suites directly. |
| `npm run typecheck` / `lint` / `jev:lint` | `tsc --noEmit`, ESLint (0 warnings), Jev rules. |
| `npm run content:validate` | Lesson/grammar content validation. |
| `npm run build` | Production build (client + server). |

Without `ACCEPTANCE_STRICT=true`, acceptance tests for unfinished criteria skip with a message; `npm test` always enforces them.

## Layout

```
tests/
├── acceptance/            # Repo-shape and tiered acceptance suites (run only via the runner)
├── acceptance_runner.test.ts  # Single entry that imports every acceptance suite
├── acceptance_helpers.ts  # Shared fs/JSON helpers (single fs owner for acceptance)
├── content/               # Authored-content gates: packs, lessons, official audio, vocab
├── unit/                  # Pure modules, services, hooks, screen-level units
├── pipeline/              # Script gates: jev context/lint/verify, decomposition pipeline
└── fixtures/              # JSON snapshots used by content/unit suites
```

## Acceptance suites (`tests/acceptance/`)

- `documentation` — markdown count in root + `docs/` <= 13 (excluding README), no `.original.md`, `docs/INDEX.md` links resolve, `docs/DECISIONS.md` has no "superseded" entries.
- `dependencies` — removed packages stay removed, build plugins in devDependencies, no phantom stores/empty dirs.
- `agents_spec` — `AGENTS.md` references no deleted docs and no pixel/modal sizing rules.
- `static_data` — `content/dialogueAlignment.json` and `content/grammar/*.json` are valid and loadable.
- `code_quality` — line caps (`App.tsx` < 250, `audioService.ts` < 400, `models.ts` < 300), widgets import nothing from services/store, no Node built-ins in `src/`.
- `server`, `build_runtime` — `server/index.ts` layout and script targets; build and dev entry points.
- `memory_hooks` — pack manifest hash/count, emphasis on every hook, word hooks name characters in order, character hooks follow breakdown order (`tests/fixtures/memory-hook-decomposition-trees.json`, regenerate with `hooks snapshot-order`), retired phrasings stay gone.
- `tier1_features` (happy-path contracts), `tier2_boundaries` (empty/zero/metacharacter/limit cases, POS and pinyin normalization), `tier3_cross_feature` (audio + reader sync, SRS + cloud sync queue, widgets in containers), `tier4_real_world` (reading with synced audio, multi-card SRS session with debounced sync, hanzi writing restart, offline recovery).
