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

## Jev workflow

Jev supplies semantic judgments for development tooling. The application runtime
does not depend on these review reports. Tests, pack validators, source scans,
and human review retain their own responsibilities.

### Findings from the workflow audit (2026-10-10)

- The app already uses `contentPacks.ts` → `createPackLoader` for reference
  content. ESLint enforces screen/feature/widget import boundaries. Jev adds
  judgments about meaning rather than another pack loader or boundary engine.
- `jev:lint` has eight rules, mainly about UI conventions. External-data-access
  review now also covers hooks/features; token/font questions recognize current
  token definitions and consumers. Thresholds remain unchanged. Screen rendering,
  usability, and visual composition still require browser inspection.
- Grammar and word-hook QA previously resumed by example ID or word alone.
  They now fingerprint evidence, actual questions, and the requested model so
  edits invalidate cached judgments. Their displayed totals cover selected items.
- Grammar naturalness and pattern fit are separate judgments. No taught-word
  inventory is passed, so Jev is not asked to infer curriculum difficulty.
- Course-example dialogue/Reading records use a Part anchor card for provenance.
  That word may be absent from the sentence; requiring its presence would reject
  legitimate examples. The reviewer judges translation, Chinese naturalness,
  pinyin, and script equivalence, with source metadata supplied for inspection.
- The existing export cap and pinyin-verification guards remain in the importer.
  Preview mode uses exactly the same extraction path.

### Course-example review

```sh
npm run course-examples:preview
npm run jev:qa:course
```

The preview writes `output/course-examples/book-1-preview.json`; it does not
publish packs/manifests. QA defaults to additions/edits compared with the published
Book 1 pack, so run it before export. Deletions are outside this semantic review;
coverage and content tests assess the resulting content changes.
An unchanged sentence is also selected when its supplied dialogue context changes.

```sh
# Inspect request state without API calls or report writes
npm run jev:qa:course -- --dry
# Audit existing content or calibrate a bounded sample
npm run jev:qa:course -- --all --lessons 11,12,13,14,15 --limit 5
# Strict mode also fails on records left unreviewed by a call limit
npm run jev:qa:course -- --strict
```

Other controls: `--input PATH`, `--baseline PATH` (same book), `--out PATH`,
`--concurrency N`. `--changed` explicitly selects the default mode. Missing
required text/provenance and `needs-review` records enter the review queue without
an API call. Reports live in `output/jev/course-examples/`: `latest.json` retains
raw answers and fingerprints; `latest-review.json` and `latest-review.md` contain
only current selected records needing attention, including source IDs, OCR JSON
paths and printed page numbers where recorded.

The default thresholds are provisional routing settings, not calibrated accuracy
claims. Low probabilities, absent/invalid judgments, and call-limit omissions
need review. A passing semantic judgment never establishes scan fidelity. Jev
gets sentence text, source metadata, and up to two preceding/one following lines
from the same source dialogue. It does not receive scan images. Neighbor changes
invalidate cached judgments too.

Accept legitimate Taiwan Mandarin readings, neutral tones, erhua, citation/spoken
sandhi conventions for 一/不, and reasonable pinyin word spacing. Check suspected
errors against the printed source. Never fill missing pinyin from a model judgment,
change verification flags automatically, or relax future-content guards. Without
the necessary source evidence, keep unverified content unpublished.

After reviewing and correcting the source where evidence supports it:

```sh
npm run course-examples:export
npm run course-examples:coverage
npm run content:validate
npm test
```

Commit regenerated packs and manifests together. Jev writes no production content.

### Other checks

- `jev:lint -- --files path1,path2` scopes semantic review to task files when the
  checkout has unrelated work. Default `jev:lint` reviews `git diff HEAD`, capped
  at 20 eligible files. Inspect skipped files; zero violations does not imply
  the entire app was reviewed. Default findings warn; `--strict` fails.
- `jev:qa:grammar -- --file lessonEight.json` reviews that authored file;
  `jev:qa:words -- --words 一半,一共` reviews selected word hooks. These commands
  retain raw judgments; they do not correct authored content.
- `jev:verify` currently checks briefing/handoff/progress files against a diff.
  It does not run tests or independently prove their execution. It is not a
  general app audit or an instruction to delegate work.
- `jev:context` shortlists context from paths and file heads. Inspect its output;
  relevant content sources can fall outside its candidate corpus.

The shared client uses the installed TypeSafe SDK and a pinned model by default.
Model probabilities guide review, while code decides the workflow. API shape and
question design references: [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript)
and [Noul guidance](https://docs.typesafe.ai/primitives/noul).

# Performance regression checks

`npm run build && npm run perf:check` enforces main entry ≤350 kB, initial entry plus module preloads ≤1000 kB, and critical CSS ≤500 kB. These are project regression limits, not universal website standards. Review the change rather than raising budgets to hide regressions.

The build and dev preflight generate `public/data/flashcard-extras` through `npm run flashcard-extras:export`. These derivative packs preserve the existing whole-course example ranking and normalized memory hooks. Source content stays authoritative. The parity test compares every course card in both scripts and every word hook with live lookup results, checks source versions, and rejects large shards. Do not hand-edit generated packs. Regenerate after vocabulary, course example or memory-hook exports.

Course cards and saved-word hooks load a single signature shard. Altered course cards and unavailable generated packs retain a lazy live fallback. Decoded shards are bounded to 16; resolved card lookups to 128 inactive entries, while mounted cards are retained. Versioned IndexedDB keys preserve offline behavior and prune stale packs.

The derived lookup dataset duplicates resolved examples across card signatures: about 12.9 MB across all 256 shards, versus 1.58 MB of old source packs. It is excluded from whole-app precaching and only requested shards are downloaded. This trades total offline storage over a long study history for smaller immediate loads and removal of runtime whole-corpus indexing; the in-memory limits do not cap current-version IndexedDB storage.

Core Web Vitals are collected locally after boot using Google's `web-vitals` package. Only values and ratings remain in memory. No metric identifiers, entries, account information, persistence or network reporting are collected.

For a safe visual benchmark, open Ctrl+Shift+0 → Performance, select the actual display refresh rate and record 8 seconds. Switch to UI Previews, replay Cards done → quiz and Review → card, then return to Performance and refresh. These previews use fake cards and do not record learning progress. A recording stops when the tab becomes hidden. rAF cadence is a main-thread scheduling signal, not GPU presentation FPS. Long Animation Frames expose blocking and forced synchronous layout where supported; browsers without it use Long Tasks, without claiming forced-layout data.

The proposed runtime gate is p95 rAF gap ≤1.5 display intervals with zero gaps over 50 ms. It is an explicit project target, not a claimed Duolingo standard. Aborted or empty recordings cannot pass. Run against a production build on the target Android device for release evidence; desktop/dev results are only smoke checks. Check startup, audio reading, transitions, idle behavior, and a sustained study session. Physical CPU/GPU load, power and thermal behavior need device traces; no browser JavaScript CPU-percentage estimate is presented.
