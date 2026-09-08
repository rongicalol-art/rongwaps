# Master Execution Plan: RongWaps Fresh-Foundation Cleanup

## Phase 0: Technical Survey [COMPLETE]
- [x] explorer_survey_1: Audited all 41 markdown files, drafted trimmed DECISIONS.md, rewritten docs/INDEX.md and AGENTS.md.
- [x] explorer_survey_2: Audited dependencies, ghost dirs, phantom stores, dead code, server migration.
- [x] explorer_survey_3: Verified baseline (build, test, lint, typecheck pass), planned static data extraction, monolith decomposition, and widget encapsulation.

## Phase 1: Planning & Setup [COMPLETE]
- [x] Synthesized findings into PROJECT.md
- [x] Established 5 milestones with explicit interface contracts and dependency sequence
- [x] Defined Dual Track structure (Implementation Milestones + E2E Testing Track)

## Phase 2: Milestone Execution

### Milestone 1: Documentation Nuclear Cleanup & AGENTS.md Rewrite (R1 & R3)
- Execute:
  - Delete 30 obsolete markdown files in root and docs/
  - Delete 2 `.original.md` backup files
  - Delete `.hermes/` and `.openai/` directories
  - Write trimmed `DECISIONS.md` (17 active decisions, 0 superseded)
  - Write rewritten `docs/INDEX.md` (pointing strictly to surviving docs)
  - Write rewritten `AGENTS.md` (clean, accurate rules)
- Verification:
  - Markdown files in root + docs/ <= 12 (excluding README.md)
  - `grep -in "supersed" DECISIONS.md` returns 0
  - All links in `docs/INDEX.md` exist on disk
  - Reviewer + Auditor checks

### Milestone 2: Dead Dependencies, Dead Code & Server Restructuring (R2 & R6)
- Execute:
  - Clean `package.json`: remove `lucide-react`, `swiper`, `axios`, `autoprefixer`, `@tanstack/react-virtual`
  - Clean `package.json`: move `@tailwindcss/vite` and `@vitejs/plugin-react` to `devDependencies`
  - Clean `package.json`: update name from `react-example` to `rongwaps`
  - Clean `vite.config.ts`: remove `lucide-react` from `manualChunks.vendor`
  - Run `npm install` to update `package-lock.json`
  - Delete ghost empty directories under `src/screens/grammar-quest/` and `src/screens/grammar-lesson/`
  - Delete orphaned components: `VirtualizedList.tsx`, `CollectionListItem.tsx`, `LibraryContinueCard.tsx`
  - Delete 6 phantom stores, migrate `UserSnapshot` into `useAppStore.ts`, remove re-exports
  - Update `aiService.ts` call sites to `mnemonicCache.ts`, delete `aiService.ts`
  - Move `server.ts` to `server/index.ts`, update `supabaseClient` import and `package.json` scripts
- Verification:
  - `npm ls --depth=0 lucide-react swiper axios autoprefixer @tanstack/react-virtual` returns clean
  - Zero grep matches for removed packages
  - `server.ts` does not exist at root; `server/index.ts` exists
  - `npm run build` and `npm test` pass

### Milestone 3: Static Data Extraction (R4)
- Execute:
  - Extract `src/data/dialogueAlignment.ts` (5,053 lines) to `content/dialogueAlignment.json`
  - Create `src/types/dialogue.ts` for interfaces (`AlignedWord`, `AlignedLine`, `DialogueAlignment`)
  - Update consumers (`ReaderScreen.tsx`, `dialogueSync.ts`, etc.) to import from JSON and types
  - Update `scripts/align_dialogue_audio.py` to target JSON
  - Delete `src/data/dialogueAlignment.ts`
  - Convert `src/data/grammar/*.ts` (21 files) to JSON under `content/grammar/`
  - Refactor `src/data/interactiveGrammarPages.ts` to lightweight loader (~65 lines)
  - Update any unit test imports referencing grammar data files
- Verification:
  - `src/data/dialogueAlignment.ts` does not exist
  - Grammar static TS reduced by > 12,000 lines
  - `npm run content:validate` passes
  - `npm test` passes (301 tests)
  - `npm run build` passes

### Milestone 4: Monolith Decomposition & Architecture Hardening (R5)
- Execute:
  - Decompose `src/services/audioService.ts` (1,119 lines -> < 300 lines) with modules in `src/services/audio/`:
    - `webAudioEngine.ts`
    - `speechSynthesizer.ts`
    - `neuralTtsService.ts`
    - `audioCache.ts`
    - `audioService.ts` as thin backward-compatible facade
  - Decompose `src/hooks/useCloudSync.ts` (659 lines -> < 200 lines):
    - Extract pure sync math to `src/services/cloudSyncService.ts`
  - Decompose `src/App.tsx` (431 lines -> < 250 lines):
    - Extract `useReaderLauncher.ts`, `useGrammarLauncher.ts`, `useDesktopNavPreference.ts`
  - Decompose `src/types/models.ts` (712 lines -> < 300 lines):
    - Extract grammar types to `src/types/grammarModels.ts`
  - Enforce widget encapsulation:
    - `SmartSentence.tsx`, `PosBadge.tsx`, `LottiePlayer.tsx` refactored to props/callbacks without service/store imports
    - Verify `src/lib/widgets/` has zero imports from `services/` or `store/`
  - Relocate `staging/` and `sources/` from `src/features/character-decomposition/` to `scripts/decomposition/`
    - Verify zero imports of `node:crypto` under `src/`
- Verification:
  - `wc -l` checks: `App.tsx` < 250, `audioService.ts` < 400, `models.ts` < 300
  - Zero `node:crypto` in `src/`
  - Zero store/service imports in `src/lib/widgets/`
  - `npm test` and `npm run build` pass

### Milestone 5: Final Comprehensive E2E Verification & Audit Hardening (R7)
- Dual Track: E2E Testing Track provides requirement-driven test suite
- Verification:
  - Full production build: `npm run build` exits 0
  - Development server: `npm run dev` starts cleanly
  - Full test suite: `npm test` passes 100%
  - Linting: `npm run lint` exits 0 with 0 errors/warnings
  - Typechecking: `npm run typecheck` exits 0
  - Full acceptance criteria matrix verified
  - Adversarial Challenger verification
  - Forensic Auditor integrity check

## Phase 3: Sentinel Completion Report
- Compile final report with verifiable command outputs, artifact links, and metrics.
- Deliver report to Sentinel (`abe9f1a0-2515-41e5-bcd8-253e3fd9b3c6`).
