# Handoff Report: Technical Investigation & Architecture Plan for R4, R5, and R7 Baseline

**Agent**: `explorer_survey_3`  
**Handoff Type**: Hard (Task Complete)  
**Date**: 2026-09-04  
**Working Directory**: `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_3`  
**Detailed Report**: `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_3/survey_report.md`

---

## 1. Observation

1. **Baseline Health Status**:
   - `npm run build`: Exited code 0 in 3.10s. Produced `dist/` bundle and `dist/server.js`. Emitted Vite warnings for chunks > 500 kB: `interactiveGrammarPages-DXN3LmAo.js` (705.76 kB / gzip 200.05 kB) and `index-B4vZ9r7e.js` (653.37 kB / gzip 181.72 kB). Emitted `lottie-web` eval warning.
   - `npm test`: Exited code 0 in 1.10s. Ran 41 test files with 301 total tests (301 pass, 0 fail). Stderr output: `Complete static vocabulary dataset unavailable; using Supabase. [TypeError: Failed to parse URL from /data/vocabulary/manifest.json]` (harmless relative fetch fallback in Node test runner).
   - `npm run typecheck`: Exited code 0 in 4.8s (`node --stack-size=6000 node_modules/typescript/lib/tsc.js --noEmit`).
   - `npm run lint`: Exited code 0 in 3.2s (`eslint src tests server.ts vite.config.ts --max-warnings=0`).

2. **Static Data Scope (R4)**:
   - `src/data/dialogueAlignment.ts`: 5,053 lines (100,756 bytes). Defines `AlignedWord`, `AlignedLine`, `DialogueAlignment` interfaces, and constant `DIALOGUE_ALIGNMENTS: Record<string, DialogueAlignment>`.
   - `dialogueAlignment` value consumer: Only `src/screens/reader/ReaderScreen.tsx` line 5 and line 73 (`DIALOGUE_ALIGNMENTS[reading?.id ?? ''] ?? null`).
   - `dialogueAlignment` type consumers: `ReadingCanvas.tsx`, `useReaderAudio.ts`, `dialogueSync.ts`, and `tests/dialogueSync.test.ts`.
   - Generator: `scripts/align_dialogue_audio.py` lines 15, 39 (`OUT_FILE = ROOT / 'src' / 'data' / 'dialogueAlignment.ts'`).
   - `src/data/grammar/`: 21 files totaling 12,919 lines (`lessonTwoPartOne.ts` 984 lines, `lessonTwoPartTwo.ts` 995 lines, `lessonThreePartTwo.ts` 885 lines, `lessonThirteen.ts` 793 lines, etc.).
   - Aggregators: `src/data/interactiveGrammarPages.ts` (975 lines) and `src/data/interactiveGrammarLessonOnePartTwo.ts` (1,009 lines). Total grammar static TS data = 14,903 lines.
   - Data structure: 29 `InteractiveGrammarPart` instances containing pure strings, numbers, arrays, and token objects without class methods or closures.
   - Consumers of grammar data: `src/data/readings.ts` (derives `ALL_READINGS`), `src/App.tsx` (dynamic import of `getInteractiveGrammarPart`), `src/screens/activities/ActivityModals.tsx`, `useCourseDashboard.ts`, `validateInteractiveLessons.ts`, `scripts/exportBookPages.ts`, and 10 test files (`tests/lesson*.test.ts`).

3. **Monolith Decomposition Scope (R5)**:
   - `src/services/audioService.ts`: 1,119 lines. God object containing:
     - Web Audio context & buffer decoding/caching (lines 35–120, 240–420).
     - HTML5 Audio fallback (`HTMLAudioElement`) (lines 47–50, 420–504).
     - Browser SpeechSynthesis TTS & Chinese voice heuristics (lines 505–703).
     - Neural TTS / Edge TTS with Supabase auth token (lines 704–765).
     - Cache API (`caches.open`) for audio files and neural MP3s (lines 140–230, 715–740).
     - Playback progress animation frame loop (lines 971–1100).
     - Imported by 23 feature files and tested in `tests/audioService.test.ts`.
   - `src/hooks/useCloudSync.ts`: 659 lines. Contains:
     - Pure data normalization and delta calculation (lines 43–107).
     - Cloud pull and account-switch merge logic (lines 172–395, 223 lines).
     - Cloud push and delta save serialization (lines 397–570, 173 lines).
     - React hook lifecycle (lines 109–171, 572–659).
   - `src/App.tsx`: 431 lines. Contains:
     - Reader lifecycle and keyboard shortcut 'r' (lines 44–48, 97–130, 194–206, 399–417, ~60 lines).
     - Grammar lesson dynamic loading & modal launcher (lines 38–42, 93–96, 133–145, 419–430, ~50 lines).
     - Responsive desktop nav sync & Ctrl+Shift+0 debug shortcut (lines 50–60, 89–92, 153–190, ~50 lines).
   - `src/types/models.ts`: 712 lines.
     - Lines 253 to 645 (393 lines) are grammar-specific interfaces.
     - **Verification of Audit Claim**: `ORIGINAL_REQUEST.md` suggested pruning 10 "unused" grammar lab types (`GrammarDiscoveryLab`, `GrammarNumberLab`, etc.). **Observed**: `GrammarInteractiveHelp.tsx` and all components under `src/screens/grammar-lesson/experiences/` directly import and render these types, and tests in `tests/lessonFive.test.ts` and `tests/lessonsTenToFourteen.test.ts` assert on them. They are NOT dead code.
   - Shared widget encapsulation violations:
     - `src/lib/widgets/SmartSentence.tsx` (line 2: imports `useAppStore`, line 3: imports `getDictionaryEntriesBatch` from `src/services/dictionaryService`).
     - `src/lib/widgets/PosBadge.tsx` (line 11: imports `useAppStore` for `characterPreference`).
     - `src/lib/widgets/LottiePlayer.tsx` (**New Finding**): Line 3 imports `loadJsonAsset` from `src/services/contentAssetService`.
   - Node APIs in browser tree:
     - `src/features/character-decomposition/staging/model.ts` (line 1: `import { createHash } from 'node:crypto';`).
     - `staging/` and `sources/` are build pipelines only imported by `scripts/lib/decompositionStagingSupabase.ts`, `tests/decompositionStaging.test.ts`, and `tests/decompositionSources.test.ts`. Zero UI components import them.
     - `SingleBreakdownView.tsx` line 14 reaches into `src/features/character-decomposition/decompositionService.ts` instead of importing from the feature barrel.

---

## 2. Logic Chain

1. **Static Data Extraction (R4)**:
   - *Given* that `dialogueAlignment.ts` (5,053 lines) contains static alignment JSON and only one component reads its value, moving the JSON to `content/dialogueAlignment.json` and types to `src/types/dialogue.ts` allows deleting `src/data/dialogueAlignment.ts` completely while satisfying acceptance criterion `- [ ] src/data/dialogueAlignment.ts no longer exists as a TypeScript source file`.
   - *Given* that `src/data/grammar/` and aggregators contain 14,903 lines of JSON-serializable grammar data causing a 705 kB JS chunk, serializing them into 29 JSON files in `content/grammar/` and converting `interactiveGrammarPages.ts` into a lightweight loader (~65 lines) eliminates ~13,500 lines of TS, drastically reduces compilation time, and satisfies `- [ ] Grammar lesson data files are either converted to JSON or significantly reduced in line count`.
   - *Given* that `tests/lesson*.test.ts` verify authored answers and structure, updating them to import from `content/grammar/` or the aggregator ensures 100% test passing under the permitted allowance.

2. **Monolith Decomposition (R5)**:
   - *Given* that `audioService.ts` contains 5 clearly decoupled subsystems behind a stable public API, extracting `webAudioEngine.ts`, `speechSynthesizer.ts`, `neuralTtsService.ts`, and `audioCache.ts` into `src/services/audio/` leaves `audioService.ts` as a thin facade of < 250 lines (< 400 line target), maintaining 100% backward compatibility for all 23 consumers and existing tests.
   - *Given* that `useCloudSync.ts` mixes 400+ lines of pure sync logic with React hooks, extracting `pullAndMergeCloudProgress`, `pushCloudProgress`, and `computeSrsDelta` to `src/services/cloudSyncService.ts` reduces `useCloudSync.ts` to ~140 lines.
   - *Given* that `App.tsx` contains 160+ lines of reader launcher, grammar launcher, and desktop nav logic, extracting `useReaderLauncher`, `useGrammarLauncher`, and `useDesktopNavPreference` reduces `App.tsx` from 431 to ~180 lines (< 250 line target).
   - *Given* that `src/types/models.ts` has 393 lines of grammar interfaces, extracting them to `src/types/grammarModels.ts` reduces `models.ts` to ~285 lines (< 300 line target). Because our inspection proved the 10 lab types are actively used in the UI, keeping them in `grammarModels.ts` prevents breaking `GrammarInteractiveHelp` and unit tests.
   - *Given* that `SmartSentence.tsx`, `PosBadge.tsx`, and `LottiePlayer.tsx` import from `src/services/` or `src/store/`, refactoring them to accept callbacks and preferences via props ensures `- [ ] No file in src/lib/widgets/ directly imports from src/services/ or src/store/`.
   - *Given* that `staging/` and `sources/` in `character-decomposition` are offline build scripts and the only source of `node:crypto` in `src/`, relocating them to `scripts/decomposition/` eliminates `node:crypto` from the browser tree and satisfies `- [ ] No file under src/ imports node:crypto`.

---

## 3. Caveats

1. **JSON Import Performance**: Importing 29 JSON files in `interactiveGrammarPages.ts` bundles them into the client bundle at build time. Dynamic imports (`await import(...)`) can be maintained so the grammar data is only loaded on demand when a user opens a grammar lesson or reader, keeping the initial app bundle small.
2. **Offline Data Generation**: `scripts/align_dialogue_audio.py` must be updated to output `.json` directly rather than `.ts` when regenerating dialogue alignments.
3. **Audit Lab Types**: The initial audit reported 10 unused grammar lab types. As verified above, these types are NOT dead code; implementers must NOT delete them, but rather move them to `src/types/grammarModels.ts`.

---

## 4. Conclusion

1. The codebase is fundamentally healthy with 301 passing tests and 0 lint/typecheck errors.
2. R4 (static data extraction) can safely extract 20,000 lines of static TS into `content/dialogueAlignment.json` and `content/grammar/*.json`, slimming `interactiveGrammarPages.ts` to ~65 lines and deleting `dialogueAlignment.ts`.
3. R5 (monolith decomposition) has clear, low-risk extraction boundaries:
   - `audioService.ts`: < 250 lines (delegating to `src/services/audio/`)
   - `useCloudSync.ts`: < 150 lines (delegating to `src/services/cloudSyncService.ts`)
   - `App.tsx`: < 190 lines (delegating to `useReaderLauncher`, `useGrammarLauncher`, `useDesktopNavPreference`)
   - `models.ts`: < 290 lines (extracting `src/types/grammarModels.ts`)
   - Widgets: 100% clean of store and service imports (`SmartSentence`, `PosBadge`, and `LottiePlayer` refactored to props)
   - Decomposition scripts: `staging/` and `sources/` moved to `scripts/decomposition/`, removing `node:crypto` from `src/`.

---

## 5. Verification Method

To independently verify the investigation and subsequent implementation:

1. **Verify Baseline Tests**:
   ```bash
   npm test
   ```
   Must pass 301 tests across 41 test files with 0 failures.

2. **Verify Production Build**:
   ```bash
   npm run build
   ```
   Must exit with code 0 and generate `dist/` and `dist/server.js`.

3. **Verify Typecheck and Lint**:
   ```bash
   npm run typecheck
   npm run lint
   ```
   Must exit with code 0 and 0 errors/warnings.

4. **Verify Widget Encapsulation**:
   ```bash
   grep -rnE "from ['\"].*(services|store)" src/lib/widgets/
   ```
   Must return zero matches.

5. **Verify No Node APIs in `src/`**:
   ```bash
   grep -rn "node:crypto" src/
   ```
   Must return zero matches.

6. **Verify Line Count Constraints**:
   ```bash
   wc -l src/App.tsx src/services/audioService.ts src/types/models.ts
   ```
   Confirm `App.tsx` < 250 lines, `audioService.ts` < 400 lines, and `models.ts` < 300 lines.
