# RongWaps Cleanup & Refactor Prompt

Copy everything between the `PROMPT START` / `PROMPT END` markers into an agent (or split it
phase-by-phase). Findings below were measured on `main` at `d1b7249` — re-measure before you
act, because the numbers are the contract.

---

## PROMPT START

You are working in `/Users/ronianb.gica/Projects/rongwaps` — a React 19 + Vite + Zustand +
Tailwind 4 language-learning PWA with an Express backend in `server/`. Read `AGENTS.md` first;
its architectural rules (1–10) are binding and are the review criteria for everything you do.

### Your mission

Remove spaghetti code, cut dead weight, and execute the deep refactors listed in the phases
below. Work **one phase at a time**, in order. Stop after each phase, run the verification
gate, report, and wait for approval before starting the next phase.

### Non-negotiable ground rules

1. **The baseline is green. Keep it green.** Currently: `npm run typecheck` ✅, `npm run lint`
   (max-warnings=0) ✅, `npm test` = 676/676 pass under `ACCEPTANCE_STRICT=true`, 0 `any`,
   2 suppressed lint lines in all of `src/`. Any phase that ends red is a failed phase —
   revert it rather than "fixing it forward".
2. **Behavior-preserving by default.** No phase may change learner-visible behavior, copy,
   routing, persistence semantics, or design tokens unless that phase explicitly says so.
3. **Tests are the harness, and they are not yours to weaken.** Never delete an assertion,
   never raise a threshold in `tests/acceptance/*` or `scripts/jev/lintRuleSet.ts`, never add
   `eslint-disable` / `@ts-ignore` to make a gate pass. If a test legitimately encodes an old
   design, say so in your report and propose the change separately — do not bundle it.
4. **Strangler pattern, always.** Extract → keep a thin facade at the old public name → migrate
   call sites → delete the old path in the same phase. Never leave two live implementations of
   one concept, and never leave a "compat shim" behind for later.
5. **No new abstractions without naming the duplication they remove** (AGENTS.md rule 10).
   Boring and obvious beats clever. No new dependencies.
6. **One commit per phase** with the phase ID in the message (`refactor(P3): ...`). Never
   mix a cleanup phase with a structural phase.
7. **Respect the existing boundary enforcement** in `eslint.config.js` (feature/screen
   isolation, widget + feature barrels, service→UI ban, server isolation). If a refactor
   requires a boundary change, stop and propose it as an `ARCHITECTURE.md` + `DECISIONS.md`
   amendment first; do not silently widen a rule.

### Verification gate — run after every phase, paste the output

```bash
npm run typecheck && npm run lint && npm test && npm run jev:lint && npm run build
```

`jev:lint` is warn-only and already reports **1 pre-existing violation**
(`src/screens/curriculum/LessonItem.tsx: no-arbitrary-pixel`). That is the accepted baseline: do
not silence it, and do not add new ones.

Then report: lines removed, files deleted, bundle delta from
`ls -laS dist/assets | head -12`, and anything you deliberately left alone.

### Known metric to protect

`tests/acceptance/documentation.test.ts` caps markdown files in root + `docs/` at **12**
(currently exactly 12). It excludes `README.md` via a hardcoded `excludedFiles` set; this file
(`REFACTOR_PROMPT.md`) is operational tooling and is added to that set. Do not "fix" the cap by
deleting real documentation, and do not add further markdown — fold new notes into the existing
owner doc (`ARCHITECTURE.md`, `DECISIONS.md`, `docs/INDEX.md`).

---

## Measured starting state

| Signal | Value | Read |
| --- | --- | --- |
| `src/` TS+TSX files / lines | 490 / 62,981 | code is fine-grained on average |
| Files > 300 lines in `src/` | 37 | a small set of concentrated hotspots |
| Largest shipped chunk | `data-interactive-grammar-*.js` **2.40 MB** | authored content shipped as JS |
| `index-*.js` (app entry) | 507 KB | entry carries too much |
| `dialogueAlignment-*.js` | 480 KB | second content-as-code offender |
| `scripts/memory-hooks/` | 27,171 lines across 82 `.ts` files | 31 have no npm-script entrypoint |
| `console.*` calls in `src/` | 106 across 42 files | only `DebugWindow` uses `utils/debugLogger` |
| Silent `catch {` blocks in `src/` | 53 | failures vanish with no signal |
| Direct `window.localStorage` outside stores | `useResponsiveNav`, `useReaderPreferences` | 3rd + 4th persistence mechanism |
| Stores | `useAppStore` (sliced) + 2 standalone | AGENTS.md rule 1 drift |
| Pack loader files | 6 files, 704 lines (5 `*PackService` + `soundHookPack`) | rule 2 drift despite using `createPackLoader` |
| Content locations | `public/data` (60 MB, 252 tracked), `content/` (8.4 MB), `src/data/*.ts` (469 KB) | three homes for authored content |
| Repo weight | `.git` 98 MB, `output/` 427 MB scratch | regeneration churn committed as artifacts |
| Tests | 102 files, 676 cases, all green | good harness — but flat and fs-heavy |

**Diagnosis in one line:** this is not a sloppy codebase — `lint`, `typecheck`, boundary rules
and 676 tests all pass and there is essentially no `any`. The debt is *architectural drift and
dead mass*: two content-delivery mechanisms, four ways to persist client state, two logging
mechanisms, mega-hooks sitting on the seam between mechanics and orchestration, and 27k lines of
single-use migration scripts. Refactor accordingly: consolidate and delete, do not restyle.

---

## Explicit non-goals (do not touch)

- Do not restructure `src/screens/**` / `src/features/**` folders — ownership, barrels and
  isolation rules are already correct and enforced.
- Do not rewrite `src/data/readingsData.ts` or grammar lesson *content*; migrating how it
  ships is P3, editing what it says is out of scope.
- Do not restyle UI, change tokens, or touch the tactile two-layer button architecture.
- Do not merge `server/` into the client or share anything but types (rule 6).
- Do not add a state-management library, a router change, or a data-fetching library.

---

## Phase P0 — Dead mass and repo hygiene (low risk, ~1 day, no behavior change)

**P0.1 Delete single-use migration scripts.** `scripts/memory-hooks/` holds 27k lines; 31 files
have no npm-script entrypoint and are one-shot migrations against a pack state that no longer
exists (`repair145Chars.ts`, `repair101Components.ts`, `repairBookOneChars.ts`,
`applyStrictReviewOverhaul.ts` at 2,415 lines, `remakeBookOneHooks.ts`,
`autonomousOvernightRunner.ts`, `stripSoundClauses.ts`, `repairCatalogFeedback.ts`).

- Build the deletion list mechanically: a file survives only if (a) an npm script references it,
  (b) another surviving script imports it, or (c) a test references it. Transitive reachability
  from npm scripts + tests is the rule — compute it, do not eyeball it.
- Delete the unreachable set; shared helpers that become unreachable delete with them.
- Update `scripts/README.md` run-order to describe only what still exists. A README describing
  deleted scripts is a bug (rule 9).

**P0.2 Kill the ad-hoc logging.** `src/utils/debugLogger.ts` already provides categories,
levels, a ring buffer and the debug-panel subscription — yet exactly one consumer
(`src/screens/debug/DebugWindow.tsx`) imports it, while 42 files call `console.*` directly
(106 calls; heaviest `userService` 23, `vocabularyService` 7, `breakdownService` 7,
`authService` 7). The infrastructure exists and is simply not wired up.

- Route every `src/` log through `debugLogger` with the right `category`; delete the purely
  local-debug `info` noise instead of converting it.
- `console.error` for genuinely unrecoverable client errors may stay; anything else may not.
- Add an ESLint `no-console` rule for `src/**` so this cannot regrow.

**P0.3 One localStorage gateway.** `useResponsiveNav` and `useReaderPreferences` each hand-roll
`window.localStorage` access (`useReaderPreferences` even re-implements the
storage-throws-in-private-mode guard). Extract `src/utils/localStorage.ts` — `readJSON`,
`writeJSON`, `remove`, try/catch once — and delete the duplicate guards. Keys and defaults stay
byte-identical; persisted values must survive the upgrade.

**P0.4 Stop shipping scratch.** `output/` (427 MB) and `.audit/` (5.6 MB) accumulate; `dist/` is
94 MB. Confirm `.gitignore` covers every generated tree, add `npm run clean:local` for scratch,
and record in `docs/INDEX.md` which generated artifacts are intentionally committed vs
regenerable. Do **not** purge git history or change `public/data` tracking here — see D2.

**Gate:** green + net-negative tracked lines + `console.*` in `src/` ≤ 5 + zero unreachable files
under `scripts/`.

---

## Phase P1 — Mega-hook and mega-service decomposition (the actual spaghetti)

Four files carry most of the accidental complexity. Split each along an existing seam, keep the
public name as a thin composition root, prove equivalence with tests.

**P1.1 `src/hooks/useCloudSync.ts` (597 lines).** One hook owns: SRS delta computation, cloud
fetch/merge, save serialization, dirty-tracking via `useAppStore.subscribe`, debounced save
scheduling, and tab-visibility flushing. Split into:

- `src/utils/cloudSyncTransforms.ts` — pure delta/merge/snapshot shaping. Highest-value
  extraction, and the only place allowed to know wire shape besides `utils/srsRowMapping.ts`
  (rule 4: if delta equality already lives there, call it — never copy it).
- `src/hooks/useCloudSyncSave.ts` — dirty tracking, debounce, visibility/flush lifecycle.
- `src/hooks/useCloudSyncFetch.ts` — pull + merge lifecycle.
- `useCloudSync.ts` → ~60 lines composing the three. No React in the pure module; no store
  writes in the pure module.
- Write characterization tests for the pure transforms **before** moving code, so the move is
  provably inert.

**P1.2 `src/services/vocabularyService.ts` (595 lines).** `fetchVocabulary`,
`fetchVocabularyByIds`, `searchVocabulary`, `fetchExamplesForWord`, `fetchExamples` each
re-implement the same shape: memoized promise dedupe → pack hit → Supabase fallback → cache
write. Two verbatim copies of the `VITE_SUPABASE_URL` / `process.env` fallback read also exist
(~line 135 and ~430).

- Extract one `withPackFirstLookup({ dedupeKey, fromPack, fromDb, cache })` resolver and rewrite
  all five on top of it. Name the removed duplication in the commit message (rule 10).
- Move the env read into `src/services/supabaseClient.ts`, which already owns env resolution; a
  domain service reading env vars is a leak.
- Target ≤ 250 lines, identical public signatures.

**P1.3 `src/hooks/useActivityDataLoader.ts` (528) and
`src/features/character-decomposition/runtimeLoader.ts` (594).** Same treatment: separate
*loading* (async, cached, cancelable) from *derivation* (pure) from *React wiring*; derivations
become pure modules with direct unit tests.

**P1.4 `src/utils/rubyPinyin.ts` (694).** Split parsing (segmenting/matching) from static mapping
tables from the app-facing hook. Tables are data, not logic.

**Gate:** green; each extracted pure module has its own test; nothing touched exceeds 300 lines;
every call site unchanged.

---

## Phase P2 — Finish the pack-first contract (rule 2 consolidation)

Six loader files — five `*PackService` plus `soundHookPack.ts`, ≈704 lines — each call
`createPackLoader` correctly, but each re-declares the same manifest/pack shape, hash-version
handling, IndexedDB namespacing and DB-fallback policy. Rule 2 says *no new `*PackService` —
configure the loader*; in practice adding a 7th content type means copy-pasting ~120 lines.

- Define one pack registry: per content type a record of
  `{ kind, manifestPath, packPathPattern, validate, fallback }`, behind a typed
  `src/services/contentPacks.ts` facade exposing `loadPack(kind, key)`.
- Keep each `validate*` function (they are genuinely distinct); delete surrounding boilerplate.
- Fold duplicated manifest/pack type shapes into one generic pair parameterized by payload.
- Delete the redundant service files outright — no re-export stubs left behind.
- Expected: ≈704 lines → ≈300; a new content type becomes a registry entry plus a validator.

**Gate:** green; `grep -rn "createPackLoader" src/services` yields exactly one call site;
`packLoader` remains the single IndexedDB/cache owner; `tests/*Pack*.test.ts` pass unchanged.

---

## Phase P3 — Content-as-code → content-as-data (the biggest win, biggest risk)

**The finding.** The build emits `data-interactive-grammar-*.js` at **2.40 MB** and
`dialogueAlignment-*.js` at **480 KB**, while the app entry is only 507 KB. Authored content is
being shipped as JavaScript modules (`src/data/readingsData.ts` 3,255 lines;
`interactiveGrammarPages.ts` 1,002; `interactiveGrammarLessonOnePartTwo.ts` 1,010;
`interactiveGrammarManifest.ts` 549). That means: content is on the critical path, it can never
be cached independently of code, every content typo forces a full redeploy, `src/data` is a
recompilation bottleneck, and — worst — the project runs **two** content-delivery mechanisms
while `AGENTS.md` declares one ("pack-first … with DB fallbacks"). This is the single largest
architectural inconsistency in the repo.

**Do it this way:**

1. Inventory every authored TS module in `src/data/` that is data rather than code, with its
   byte size and its consumer(s). Keep genuine code (`designTokens.ts`, token tables, routing
   maps) in place — do not turn constants into fetches.
2. For each, export JSON under the existing `public/data/<kind>/book-<n>/…` convention using a
   **new export step in the existing pipeline style** (mirroring `scripts/exportBookPages.ts` /
   `exportHookPack.ts`), with a hash-versioned `manifest.json` exactly like the memory-hooks pack.
3. Load it through the P2 registry (`loadPack(kind, key)`) so IndexedDB caching, version
   invalidation and fallback behavior come for free. Do not hand-roll a new fetcher.
4. Validate at build/CI time, not first render: port the shape checks that `readingsData.ts`
   gets free from TypeScript into a runtime validator + a test, so JSON loses no safety. The
   grammar contract in `docs/GRAMMAR_LESSON_TEMPLATE.md` and
   `src/utils/validateInteractiveLessons.ts` already describe the schema — reuse them; do not
   invent a second schema.
5. Load lazily at the window that owns the content (`GrammarWindow`, `ReaderWindow`) and show
   the existing `LoadingScreen` on the matching canvas tone — that is already the shell contract.
   Prefetch on hover/idle for desktop, never blocking first paint.
6. Delete the TS content modules once nothing imports them. `src/data` should end up holding
   tokens and small config only.

**Do not** change a single byte of authored content in this phase — serialization only. Prove it:
round-trip the exported JSON back through the loader and assert deep-equality with the old TS
objects in a test. That test is the safety net for the whole phase.

**Gate:** green; the deep-equality round-trip test exists and passes; `dist/assets` contains no
data chunk > 300 KB; entry chunk does not regress; report measured MB-saved.

---

## Phase P4 — One state mechanism (rule 1)

`AGENTS.md` rule 1 says cross-screen persisted state lives in `useAppStore` slices with a
declared persistence class. Two standalone persisted stores drifted from it:
`useGrammarLessonStore` (started/completed part + page ids) and `usePracticePreferencesStore`
(~25 preference fields, own persist block).

- Convert each into a slice under `src/store/slices/` (`grammarProgressSlice`,
  `practicePreferencesSlice`) and compose them in `useAppStore`; persist middleware stays on the
  **combined** store only (per Zustand's slices guidance — per-slice `persist` is a footgun).
- Declare each slice's persisted keys + account-switch defaults, and extend the contract test
  (`tests/storeContract.test.ts`) to cover both. Add a **migration** for the two existing
  localStorage keys so no learner loses grammar progress or practice settings — verify by loading
  an old payload in a test.
- Selectors: keep call sites reading narrow slices (no whole-store subscriptions) and check
  re-render cost with `useShallow` where an object/array is selected.
- Delete the standalone store files.

**Gate:** green; exactly one persisted Zustand store; `storeContract` covers all slices; a
migration test proves old persisted payloads still load.

---

## Phase P5 — Error and failure policy (53 silent catches)

53 `catch {` blocks in `src/` discard the error entirely — a dropped cloud save and a dropped
audio unlock become indistinguishable, and there is no way to tell a network blip from a real
bug.

- Introduce a small failure policy in `src/services/`: `PackMissError`, `NetworkError`,
  `AuthRequiredError` (or an equivalent discriminated result), plus one helper that logs through
  P0's `debugLogger` with the right category and returns the caller's fallback.
- Audit all 53 sites into exactly three buckets: (a) intentional graceful degradation — keep,
  but name the reason in one comment line and log at `warn`; (b) must-reach-the-learner — surface
  via existing UI error states; (c) must-never-happen — `debugLogger.error`. No bucket may be
  silent.
- Sync + retry policy belongs in one owner (P1.1's save module), not scattered per-call.

**Gate:** green; `grep -c "catch {" src -r` = 0; every catch binds its error and either logs,
rethrows, or documents degradation in ≤1 line.

---

## Phase P6 — Shell composition and the remaining 300+ line UI files

`src/App.tsx` is 241 lines (inside the 250-line budget in `tests/acceptance/code_quality.test.ts`)
but it calls 12 hooks and threads every result by hand into the shell. The budget is met in
letter, not in spirit.

- Collapse shell wiring into one `useAppShell()` composition hook returning named groups (`nav`,
  `reader`, `grammar`, `activity`, `settings`, `sync`). `App.tsx` becomes ~80 lines of JSX. Stay
  under the existing 250-line budget the whole way (rule: App.tsx = routing, shell, light state).
- Do **not** introduce a context provider or a second state tree to do this — it is pure wiring.
- Then split the remaining oversize presentational files along natural sub-surfaces:
  `screens/reader/ReaderScreen.tsx` (443),
  `features/character-breakdown/components/BreakdownWordInfo.tsx` (443),
  `features/dictionary/components/WordDetailView.tsx` (436), `screens/activities/ActivityModals.tsx`
  (357), `screens/grammar-lesson/GrammarLessonScreen.tsx` (322). Extract into screen-local
  `components/` / `hooks/`, or promote to `src/lib/widgets/` **only** when 2+ features genuinely
  reuse it — then document it in `WIDGETS.md` with props and one example.
- Respect the existing widget rule while doing it: `code_quality.test.ts` asserts
  `src/lib/widgets/**` never imports services or store — a widget must not fetch.

**Gate:** green; `App.tsx` < 120 lines; zero `src/` files above 400 lines except `src/data`
content still awaiting P3; `WIDGETS.md` in sync with `src/lib/widgets/index.ts`.

---

## Phase P7 — Test architecture (keep the harness, fix its shape)

102 test files / 676 cases all pass — that harness is the main reason this refactor is safe.
Preserve the coverage, fix three structural problems.

- **Group the flat directory:** `tests/unit/`, `tests/acceptance/`, `tests/content/`
  (authored-data gates), `tests/pipeline/` (script gates). Update the `npm test` glob and keep
  `acceptance_runner.test.ts` as the single acceptance entry point.
- **Centralize fs access:** several tests re-implement file reads and path joins
  (`courseExamplePack`, `jevContext`, `jevVerify` each do 4–7 `readFileSync` calls). Extend
  `tests/acceptance_helpers.ts` with `readJson`, `readSource`, `listSourceFiles`; delete the
  per-file variants so path handling has one owner.
- **Fix the fs-as-oracle pattern:** acceptance tests assert on file text and line counts, which is
  brittle under legitimate refactors and blind to real behavior. Where a rule is expressible as
  behavior (widgets don't fetch, one persisted store, no Node built-ins in `src/`), make ESLint or
  the type system the primary gate and keep the fs check as a tripwire. Never weaken an existing
  assertion to get a pass.
- Back-fill the net for P1: every new pure module gets a unit test in the same commit.

**Gate:** green; ≥676 cases pass; `npm test` runtime no worse than the current ~7 s; every new
pure module from P1 covered.

---

## Open decisions (raise these; do not decide them alone)

- **D1 — Should P3 also delete DB fallbacks for Book 1 authored content?** Rule 2 says packs with
  DB fallbacks; if the fallback is unreachable for authored-only content, deleting it is a real
  simplification — but it changes failure behavior. Needs a product call.
- **D2 — 60 MB of `public/data` in git** (252 tracked files, `.git` 98 MB, plus `content/` 8.4 MB
  of build inputs). Keep committing artifacts (simple, slow clone, grows forever) vs Git LFS vs
  generate-in-CI. Measure clone time both ways and let the owner choose.
- **D3 — `code_quality.test.ts` skips budgets when `ACCEPTANCE_STRICT` is unset** — a debt ledger
  with no deadline. Convert to ratchets (fail only when a budget *grows*) or commit to
  strict-always after P6. Ratchet is the stronger default: it blocks regression without blocking
  incremental work.
- **D4 — Does `scripts/` deserve the same bar as `src/`?** 27k+ lines of pipeline code are linted
  but arguably not type-or-test-gated the same way. P0 shrinks it; then decide explicitly.

---

## Report format after every phase

```
PHASE: P<n> — <name>
STATUS: complete | partial | blocked
VERIFICATION: typecheck / lint / test(<n> pass) / jev:lint / build   — paste real output
MEASURED DELTA: lines -<n> | files -<n> | dist entry <kb>→<kb> | largest chunk <mb>→<mb>
DELETED: <paths> | ADDED: <paths> | RENAMED: <pairs>
BEHAVIOR RISK: <what could break for a learner, and which test proves it cannot>
SKIPPED ON PURPOSE: <thing + why> | NEW DEBT INTRODUCED: <nothing | list>
NEXT: P<n+1> — <one-line plan>
```

If any gate is red: stop. Do not proceed, do not disable a gate, do not move a threshold. Report
the failure verbatim.

## PROMPT END

---

## Why these phases (best-practice grounding)

| Phase | Grounding |
| --- | --- |
| P0 | Dead code is the cheapest deletion; reachability computed from entrypoints, not guessed; one logging owner; one storage gateway |
| P1 | Find-simplicity-first (Feathers, *Working Effectively with Legacy Code*): characterize, then extract at the seam; separate mechanics from orchestration |
| P2 | Registry/config over copy-paste adapters — the repo's own rule 2 already decided this; the code just did not finish |
| P3 | Content is data, not code — dynamic import + code splitting for non-critical assets (webpack code-splitting / Vite `manualChunks`), immutable hash-versioned JSON for offline-first caching |
| P4 | Zustand official slices pattern: compose slices, apply `persist` **only** on the combined store; per-slice middleware is explicitly discouraged |
| P5 | Never swallow exceptions; typed error taxonomy; one log owner; one retry policy |
| P7 | Text/file assertions are tripwires, not proof — behavior is the oracle; keep the pyramid, do not expand the base |
| All | Strangler fig: migrate behind a facade and delete the old path in the same change — never ship a compat shim |

Two deliberate omissions: no framework migration, and no rewrite of working internals. Both
`docs/ARCHITECTURE.md` (§ Refactor guardrails: "do not rewrite working internals just to make files
look uniform") and the measurements agree — this repo's problem is not style, it is duplicated
*mechanisms* (content delivery, persistence, logging, error handling) and mass that serves no one.

## Suggested execution

- Solo: run P0 → P7 in order, one PR each. P0+P1 land most of the maintainability win.
- Team / agent swarm: P0 and P1 are exclusive (touch services/hooks); P2 depends on P1.2;
  P3 depends on P2; P4, P5, P6, P7 can proceed in parallel lanes after P0. Never let two lanes
  edit `src/services/` at once.





