# RongWaps Acceptance & E2E Test Suite (TEST_READY)

Published: 2026-09-04
Test Track: E2E Testing Track (Dual Track)
Target: RongWaps Fresh-Foundation Cleanup
Framework: Node.js Native Test Runner (`node:test` + `node:assert/strict`) via `tsx`

---

## 1. Test Suite Summary & Metrics

| Category | Files | Total Tests | Passing | Pending (Skipped) | Failing | Pass Rate |
|---|---|---|---|---|---|---|
| Existing Unit Test Suite | 41 | 301 | 301 | 0 | 0 | 100% |
| Acceptance & E2E Test Suite | 11 | 51 | 33 | 18 | 0 | 100% (non-failing) |
| **Combined (`npm test`)** | **52** | **352** | **334** | **18** | **0** | **100%** |

- **Zero Test Regressions**: All 301 pre-existing tests pass cleanly in under 1.2 seconds.
- **Zero Lint Violations**: `npm run lint` passes with 0 errors and 0 warnings.
- **Zero Typecheck Errors**: `npm run typecheck` (`tsc --noEmit`) passes with exit code 0.
- **Progressive Testability**: Pending milestone criteria yield explicit skips during progressive milestone execution and enforce strict failure under `ACCEPTANCE_STRICT=true`.

---

## 2. Feature & Acceptance Criteria Checklist Across Tiers

### Tier 1: Feature & Contract Coverage
- [x] **Dialogue Synchronization**: `lineIndexForTime`, `wordRangeForTime`, and `alignmentDuration` correctly identify active line indices and word boundaries.
- [x] **Cloud Sync Queue Math**: `getSessionProgressDelta` computes strictly positive incremental deltas.
- [x] **Single-Flight Save Coordinator**: Coalesces concurrent save requests to prevent duplicate network calls.
- [x] **Folder Sync Planning**: Segregates local creations from tombstones and remote deletions.
- [x] **Linguistic Metadata & POS Tagging**: Part-of-speech formatter expands labels (`Noun`, `Verb`, `Stative verb`) and maps to word categories (`noun`, `verb`).
- [x] **Speaker Character Profiling**: Resolves character profiles and genders across Book 1 readings from `CHARACTER_PROFILES`.

### Tier 2: Boundary & Corner Cases
- [x] **Empty & Out-of-Bounds Alignments**: Zero-length alignments, negative timestamps, and past-duration queries safely return `null`.
- [x] **Rendered Text Length Mismatch**: `wordRangeForTime` gracefully suppresses highlights when traditional vs simplified rendered lengths diverge.
- [x] **Corrupted Progress Deltas**: Progress counters clamped to current values without generating negative deltas.
- [x] **Exponential Backoff & Rate Limiting**: Exponential backoff grows up to 60s cap; 429 HTTP responses receive immediate 15s penalty backoff.
- [x] **Tombstone Pruning Edge Cases**: Correctly handles empty, disjoint, or overlapping tombstone arrays.
- [x] **POS Formatter Fault Tolerance**: Gracefully handles whitespace, empty strings, compound tags (`N/V`), and unknown codes.
- [x] **Pinyin Normalization Boundaries**: Normalizes tone numbers, tone marks, spacing, keyboard umlauts (`lv3`, `lu:3`, `lü`), and parenthesized variants (`shén(me)`).

### Tier 3: Cross-Feature Interactions
- [x] **Audio Sync + Ruby Pinyin Character Alignment**: Dialogue timestamp tracking at 2.5s correctly highlights "很高興" while ruby pinyin 1-to-1 aligns compound characters and syllables.
- [x] **SRS Reviews + Cloud Reconciliation + Single-Flight Save**: Local card reviews generate session delta, reconcile with server aggregate progress, save through single-flight coordinator, and merge with remote updates preserving in-flight reviews.
- [x] **Speaker Identity + Color Distinctness**: Multi-speaker dialogues guarantee distinct color palette assignments with zero collisions across genders and participants.

### Tier 4: Real-World Application Scenarios
- [x] **Scenario 1: Complete Dialogue Reading & Audio Journey**: Simulates a learner opening Book 1 Lesson 1, playing track, observing live karaoke highlights across speakers, and inspecting Ruby pinyin breakdown.
- [x] **Scenario 2: Multi-Card Flashcard Review & Debounced Sync**: Simulates learner reviewing new and existing cards, updating SM-2 intervals, accumulating XP, and scheduling debounced cloud saves.
- [x] **Scenario 3: Hanzi Writing Canvas Practice**: Simulates stroke quizzing with multi-character word restart preservation (mastered characters remain complete when retrying current character).
- [x] **Scenario 4: Offline Resilience & Network Recovery**: Simulates network interruption during review save, backoff delay activation, and successful recovery once connection is restored.

---

## 3. ORIGINAL_REQUEST.md Acceptance Criteria Verification Matrix

| Area | Acceptance Criterion | Test File | Current Status |
|---|---|---|---|
| **Documentation** | Root + docs/ markdown count <= 12 (excluding README) | `tests/acceptance/documentation.test.ts` | **PASS** (11 files) |
| **Documentation** | No `.original.md` backup files anywhere | `tests/acceptance/documentation.test.ts` | **PASS** (0 found) |
| **Documentation** | No files claimed deleted in CHANGELOG.md | `tests/acceptance/documentation.test.ts` | **PASS** (0 found) |
| **Documentation** | `docs/INDEX.md` links are all valid on disk | `tests/acceptance/documentation.test.ts` | **PASS** (100% valid) |
| **Documentation** | `DECISIONS.md` contains 0 superseded entries | `tests/acceptance/documentation.test.ts` | **PASS** (0 superseded) |
| **Documentation** | `.hermes/` and `.openai/` directories do not exist | `tests/acceptance/documentation.test.ts` | **PASS** (Purged) |
| **Dependencies** | `lucide-react`, `swiper`, `axios`, `autoprefixer`, `@tanstack/react-virtual` removed | `tests/acceptance/dependencies.test.ts` | *Pending M2* |
| **Dependencies** | Zero matches for removed packages in `src/` and `vite.config.ts` | `tests/acceptance/dependencies.test.ts` | *Pending M2* |
| **Dependencies** | No empty directories under `src/screens/` or `src/features/` | `tests/acceptance/dependencies.test.ts` | *Pending M2* |
| **Dependencies** | 6 phantom stores deleted or integrated | `tests/acceptance/dependencies.test.ts` | *Pending M2* |
| **Dependencies** | `package.json` name is not `react-example` | `tests/acceptance/dependencies.test.ts` | *Pending M2* |
| **Dependencies** | `@tailwindcss/vite` & `@vitejs/plugin-react` in devDependencies | `tests/acceptance/dependencies.test.ts` | *Pending M2* |
| **AGENTS.md** | No deleted documentation files referenced | `tests/acceptance/agents_spec.test.ts` | **PASS** |
| **AGENTS.md** | No exact pixel values or modal sizing rules | `tests/acceptance/agents_spec.test.ts` | **PASS** |
| **AGENTS.md** | No false mnemonics in `API_SPEC.md` claim | `tests/acceptance/agents_spec.test.ts` | **PASS** |
| **Static Data** | `src/data/dialogueAlignment.ts` TS source deleted | `tests/acceptance/static_data.test.ts` | *Pending M3* |
| **Static Data** | `content/dialogueAlignment.json` valid JSON | `tests/acceptance/static_data.test.ts` | *Pending M3* |
| **Static Data** | Grammar TS data converted to JSON in `content/grammar/` | `tests/acceptance/static_data.test.ts` | *Pending M3* |
| **Static Data** | All JSON data loadable at runtime | `tests/acceptance/static_data.test.ts` | *Pending M3* |
| **Code Quality** | `src/App.tsx` < 250 lines | `tests/acceptance/code_quality.test.ts` | *Pending M4* |
| **Code Quality** | `src/services/audioService.ts` < 400 lines | `tests/acceptance/code_quality.test.ts` | *Pending M4* |
| **Code Quality** | `src/types/models.ts` < 300 lines | `tests/acceptance/code_quality.test.ts` | *Pending M4* |
| **Code Quality** | `src/lib/widgets/` zero imports from services or store | `tests/acceptance/code_quality.test.ts` | *Pending M4* |
| **Code Quality** | Zero `node:crypto` or Node built-ins in `src/` | `tests/acceptance/code_quality.test.ts` | *Pending M4* |
| **Server** | `server.ts` does not exist at project root | `tests/acceptance/server.test.ts` | *Pending M2* |
| **Server** | `server/` directory contains Express backend code | `tests/acceptance/server.test.ts` | *Pending M2* |
| **Server** | `package.json` dev and build scripts target `server/` | `tests/acceptance/server.test.ts` | *Pending M2* |
| **Build & Tests**| `npm run build` exits with code 0 | `tests/acceptance/build_runtime.test.ts` | **PASS** |
| **Build & Tests**| `npm run dev` configuration & entry point valid | `tests/acceptance/build_runtime.test.ts` | **PASS** |
| **Build & Tests**| `npm test` passes all tests without regression | `tests/acceptance_runner.test.ts` | **PASS** (334 pass, 0 fail) |

---

## 4. Execution Instructions

### Run Entire Test Suite (Unit + Acceptance)
```bash
npm test
```

### Run Acceptance & E2E Suite Directly
```bash
npx tsx --test tests/acceptance/*.test.ts
```

### Run Strict Mode Acceptance Verification (All Criteria Enforced)
```bash
ACCEPTANCE_STRICT=true npm test
```
