# RongWaps Test Infrastructure & Architecture (TEST_INFRA)

## 1. Test Philosophy & Guiding Principles

RongWaps is a React/TypeScript Chinese-language learning application with an Express backend. High pedagogical fidelity, tactile responsiveness, offline capability, and clean architectural boundaries are essential to the product.

This testing infrastructure is designed around five core tenets:
1. **Real-Logic Verification (No Facades)**: Tests must exercise genuine runtime paths, actual file system structures, data loaders, service facades, and UI component contracts. Tests that trivially pass without exercising domain constraints are strictly prohibited.
2. **Authoritative Specification Derivation**: Every test case traces directly to `ORIGINAL_REQUEST.md` and `PROJECT.md`. Expected outputs are derived from documented domain models, mathematical properties (e.g. SRS interval equations, sync delta math), and concrete architectural rules.
3. **Progressive Testability**: During active implementation milestones, the test suite supports milestone awareness. In progressive mode, tests verify completed milestones strictly while cleanly identifying pending milestone targets. In strict mode (`ACCEPTANCE_STRICT=true`), the suite enforces all acceptance criteria across all milestones without concession.
4. **Self-Contained & Isolated**: Every test manages its own state, isolates temporary artifacts, avoids execution order coupling, and operates deterministically across environments.
5. **Adversarial & Boundary Rigor**: Tests explicitly probe edge cases, including empty strings, metacharacter injections, boundary line counts, missing keys, offline states, and cross-feature interaction failures.

---

## 2. 4-Tier Testing Methodology

```
+-------------------------------------------------------------------------+
|                  Tier 4: Real-World User Scenarios                      |
|      Full multi-step learner journeys (Reading, Flashcards, Writing)    |
+-------------------------------------------------------------------------+
|                Tier 3: Cross-Feature Interactions                       |
|   Pairwise integration (Audio + Reader Sync, SRS + Cloud Queue Sync)    |
+-------------------------------------------------------------------------+
|             Tier 2: Boundary, Corner Cases & Adversarial                |
| Limits, zero/empty data, regex injections, file size thresholds, leaks  |
+-------------------------------------------------------------------------+
|                 Tier 1: Feature & Contract Coverage                     |
| Happy path functional contracts, documentation, deps, static data, APIs |
+-------------------------------------------------------------------------+
```

### Tier 1: Feature & Contract Coverage
- **Objective**: Verify that every primary feature, module contract, and cleanup requirement executes correctly on its happy path.
- **Scope**:
  - Documentation inventory (<= 12 markdown files in root + `docs/`, no `.original.md`, valid `docs/INDEX.md` links, active `DECISIONS.md`).
  - Dependency integrity (removal of `lucide-react`, `swiper`, `axios`, `autoprefixer`, `@tanstack/react-virtual`; correct devDependencies placement).
  - Dead code eradication (no ghost folders, phantom stores removed or adopted, orphaned components deleted).
  - AGENTS.md rule alignment (no stale doc links, no hardcoded pixel modal rules, accurate mnemonics description).
  - Static data extraction (`dialogueAlignment.json` and `content/grammar/*.json` structured and valid).
  - Monolith decomposition (`audioService` sub-modules, `useCloudSync` sync math extraction, `App.tsx` hook extraction, `models.ts` splitting).
  - Widget encapsulation (`SmartSentence`, `PosBadge`, `LottiePlayer` free of direct service/store imports).
  - Server restructuring (`server/index.ts` operational, root `server.ts` removed).
  - Build & runtime pipeline (`npm run build`, `npm run dev`, `npm test` exit 0).

### Tier 2: Boundary, Corner Cases & Adversarial Verification
- **Objective**: Stress-test extreme inputs, zero states, invalid combinations, and structural limits.
- **Scope**:
  - **Line Count Thresholds**: Strict verification that `src/App.tsx` < 250 lines, `src/services/audioService.ts` < 400 lines, `src/types/models.ts` < 300 lines.
  - **Encoding & Metacharacters**: Neutralization of regex metacharacters in vocabulary search, pinyin tone normalization, umlaut keyboard variations (`v`, `u:`).
  - **Zero & Empty States**: Empty dialogue lines, zero-duration audio tracks, missing manifest keys, empty folder lists in sync plans.
  - **Part-of-Speech Parser Boundaries**: Compound POS tags (`v/n`), whitespace trimming, unknown codes fallback, traditional vs. simplified script preference.
  - **Browser Environment Isolation**: Zero imports of `node:crypto`, `node:fs`, `node:path`, or other Node.js built-ins within `src/` (excluding standalone `scripts/`).

### Tier 3: Cross-Feature Interactions
- **Objective**: Verify pairwise combinations of subsystems operating together without data corruption or timing anomalies.
- **Scope**:
  - **Audio Engine + Reader Dialogue Sync**: Official audio playback alignment with dialogue timestamp chunks (`getPhraseChunks`, ruby pinyin mapping).
  - **SRS Engine + Cloud Sync Queue**: Card reviews -> session progress delta -> single-flight save coordinator -> tombstone pruning -> merge with remote snapshot.
  - **Widget Encapsulation + Presentation Container**: Props-down, events-up architecture in `SmartSentence` and `PosBadge` rendering within screen containers.
  - **Vocabulary Search + Character Decomposition**: Search query matching -> definition card retrieval -> stroke count & component lookup.

### Tier 4: Real-World Application Scenarios
- **Objective**: Validate complete, multi-step end-to-end user workflows matching actual learner experiences.
- **Scope**:
  - **Scenario 1: Textbook Reading & Synchronized Audio**: Learner opens Book 1 Lesson 1, plays audio track, verifies highlighted sentence chunks, views aligned ruby pinyin, clicks vocabulary word for definition.
  - **Scenario 2: Multi-Card SRS Review Session**: Learner completes a flashcard session, earns XP, updates SRS intervals (Good/Easy/Hard), triggers debounced cloud sync, confirms local and remote state convergence.
  - **Scenario 3: Hanzi Stroke Canvas Practice**: Learner navigates through writing deck, tests stroke order canvas, validates single-character restart preserving multi-character words.
  - **Scenario 4: Resilient Offline & Cache Recovery**: Learner loads application offline, reads cached audio/vocabulary manifests, queues reviews locally, resumes online sync seamlessly.

---

## 3. Test Suite Inventory & Layout

All acceptance and E2E tests are organized under `tests/acceptance/` with a top-level runner in `tests/acceptance.test.ts` for unified `npm test` execution.

```
tests/
├── acceptance/
│   ├── documentation.test.ts      # R1: Doc count, .original.md, INDEX links, DECISIONS
│   ├── dependencies.test.ts       # R2: Dead npm packages, config cleanup, ghost dirs, phantom stores
│   ├── agents_spec.test.ts        # R3: AGENTS.md truthfulness, pixel rules, mnemonics
│   ├── static_data.test.ts        # R4: dialogueAlignment.json, grammar JSON, schema validation
│   ├── code_quality.test.ts       # R5: Line counts, widget encapsulation, node:crypto purge
│   ├── server.test.ts             # R6: server/index.ts location and script targets
│   ├── build_runtime.test.ts      # R7: build verification, runtime sanity
│   ├── tier1_features.test.ts     # Tier 1 happy path requirements
│   ├── tier2_boundaries.test.ts   # Tier 2 boundary and corner case validation
│   ├── tier3_cross_feature.test.ts# Tier 3 pairwise integration verification
│   └── tier4_real_world.test.ts   # Tier 4 full learner journey simulation
├── acceptance.test.ts             # Progressive bridge runner for npm test
├── acceptance_helpers.ts          # Shared testing utilities, file scanners, AST inspectors
└── ... (existing 41 unit test files)
```

---

## 4. Execution Commands & Pipeline

### Standard Test Execution (Unit + Acceptance)
```bash
npm test
```
*Executes all 41 existing unit test suites (301+ tests) alongside acceptance suites. In standard mode, pending milestone tests yield informative skips, ensuring a non-breaking developer workflow.*

### Strict Acceptance Test Execution (All Acceptance Criteria)
```bash
ACCEPTANCE_STRICT=true npm test
```
*Enforces 100% of acceptance criteria across all cleanup milestones without skips. Used for milestone sign-off and final validation.*

### Dedicated Acceptance Suite Only
```bash
npx tsx --test tests/acceptance/*.test.ts
```
*Runs all 11 acceptance and tier suites independently.*

### Static Content & Lesson Validation
```bash
npm run content:validate
```

### Production Build Verification
```bash
npm run build
```

---

## 5. Coverage & Quality Thresholds

| Metric | Target | Verification Method |
|---|---|---|
| Existing Unit Tests | 301 passing (0 failures) | `npm test` |
| Acceptance Test Suites | 11 suites, 100% passing | `npx tsx --test tests/acceptance/*.test.ts` |
| Markdown Files Count | <= 12 files (root + docs/ excluding README) | `tests/acceptance/documentation.test.ts` |
| Dead Dependencies | 0 occurrences in dependencies & src | `tests/acceptance/dependencies.test.ts` |
| Monolith Max Lines: `App.tsx` | < 250 lines | `tests/acceptance/code_quality.test.ts` |
| Monolith Max Lines: `audioService.ts` | < 400 lines | `tests/acceptance/code_quality.test.ts` |
| Monolith Max Lines: `models.ts` | < 300 lines | `tests/acceptance/code_quality.test.ts` |
| Widget Encapsulation | 0 imports from services/ or store/ in `src/lib/widgets/` | `tests/acceptance/code_quality.test.ts` |
| Browser Sandbox Isolation | 0 `node:crypto` or Node built-ins in `src/` | `tests/acceptance/code_quality.test.ts` |
| TypeScript Compilation | 0 type errors (`tsc --noEmit`) | `npm run typecheck` |
| ESLint Conformance | 0 warnings, 0 errors | `npm run lint` |
