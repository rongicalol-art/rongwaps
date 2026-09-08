# Comprehensive Technical Investigation & Planning Report: R4, R5, and R7 Baseline

**Author**: `explorer_survey_3`  
**Date**: 2026-09-04  
**Scope**: 
- Requirement 4 (R4): Static data extraction (`dialogueAlignment.ts` and `src/data/grammar/`)
- Requirement 5 (R5): Monolith decomposition (`audioService.ts`, `useCloudSync.ts`, `App.tsx`, `models.ts`, widget encapsulation, and character-decomposition scripts)
- Requirement 7 (R7): Baseline health verification (`npm run build`, `npm test`, `npm run typecheck`, `npm run lint`)

---

## 1. Executive Summary

A comprehensive investigation of the RongWaps codebase was conducted covering static data bloat, monolithic files, widget architectural boundaries, backend-in-frontend code placement, and build/test health.

Key findings:
1. **Clean Baseline**: Baseline tests (`npm test`) pass completely (301/301 pass, 0 failures), the build (`npm run build`) succeeds with exit code 0 in 3.10s, `npm run typecheck` exits with 0, and `npm run lint` exits with 0.
2. **~20,000 Lines of Static Data in TS**: `dialogueAlignment.ts` (5,053 lines) and `src/data/grammar/` + aggregators (14,903 lines across 23 files) bloat the TypeScript codebase and produce oversized chunks (705 kB JS chunk for `interactiveGrammarPages`). Both datasets are 100% JSON-serializable pure data with no functions.
3. **Monolithic Service & Hook**: `audioService.ts` (1,119 lines) contains 5 distinct sub-concerns (Web Audio, HTML5 fallback, SpeechSynthesis, Neural TTS, Cache API) that can be factored into clean modules behind a facade of < 250 lines. `useCloudSync.ts` (659 lines) embeds 400+ lines of pure sync queue and delta serialization logic inside a React hook.
4. **App.tsx Bloat**: `App.tsx` (431 lines) mixes reader lifecycle and grammar loading into the main routing component.
5. **Model Bloat & Verified Audit Correction**: Moving ~393 lines of grammar interfaces from `src/types/models.ts` (712 lines) to `src/types/grammarModels.ts` reduces `models.ts` to ~285 lines (< 300 target). **Crucial Audit Correction**: The audit suggested deleting 10 "unused" grammar lab types (`GrammarDiscoveryLab`, `GrammarNumberLab`, etc.). Investigation proved these types ARE actively imported and rendered by `GrammarInteractiveHelp.tsx` and all components in `src/screens/grammar-lesson/experiences/`, and verified by unit tests. Deleting them would break the application.
6. **Widget Encapsulation Violations**: In addition to `SmartSentence.tsx` and `PosBadge.tsx` which violate encapsulation by importing `src/store/` and `src/services/`, an extra violation was discovered: `LottiePlayer.tsx` imports `loadJsonAsset` from `src/services/contentAssetService.ts`. All three must be prop-driven.
7. **Node APIs in Browser Tree**: `src/features/character-decomposition/staging/model.ts` imports `node:crypto`. Both `staging/` and `sources/` are build-time ingestion pipelines never used by runtime UI. Moving them to `scripts/decomposition/` removes `node:crypto` from `src/`.

---

## 2. Requirement 7 (R7): Baseline Health Verification

Baseline checks were run in `/Users/ronianb.gica/Projects/rongwaps` prior to proposing refactoring:

| Command | Status | Duration | Observations & Details |
|---|---|---|---|
| `npm run build` | **PASS (0)** | 3.10s | Vite transforms 818 modules. Built `dist/` + `dist/server.js`. Emits warning for chunks > 500 kB: `interactiveGrammarPages-DXN3LmAo.js` (705.76 kB / 200 kB gzip) and `index-B4vZ9r7e.js` (653.37 kB). Warning for `lottie-web` eval (library-internal). |
| `npm test` | **PASS (0)** | 1.10s | 301 tests pass, 0 failed, 0 cancelled, 0 skipped across 41 test files. Harmless stderr warning: `[TypeError: Failed to parse URL from /data/vocabulary/manifest.json]` (Node fetch relative path gracefully falls back to Supabase). |
| `npm run typecheck` | **PASS (0)** | 4.80s | TypeScript checks with `--stack-size=6000 node_modules/typescript/lib/tsc.js --noEmit`. Zero type errors. |
| `npm run lint` | **PASS (0)** | 3.20s | ESLint checks `src tests server.ts vite.config.ts --max-warnings=0`. Zero errors or warnings. |

---

## 3. Requirement 4 (R4): Static Data Extraction Plan

### 3.1 `src/data/dialogueAlignment.ts` (5,053 lines)

#### Direct Observations
- **File size**: 5,053 lines, 100,756 bytes.
- **Content**: Three TypeScript interfaces (`AlignedWord`, `AlignedLine`, `DialogueAlignment`) and one giant constant: `export const DIALOGUE_ALIGNMENTS: Record<string, DialogueAlignment> = { ... };` for Book 1 lessons 1–14 readings.
- **Generator**: `scripts/align_dialogue_audio.py` (lines 15, 39: `OUT_FILE = ROOT / 'src' / 'data' / 'dialogueAlignment.ts'`).
- **Consumers**:
  1. `src/screens/reader/ReaderScreen.tsx` (Line 5: imports `DIALOGUE_ALIGNMENTS` value; Line 73: `const alignment = DIALOGUE_ALIGNMENTS[reading?.id ?? ''] ?? null;`).
  2. `src/screens/reader/components/ReadingCanvas.tsx` (Line 4: imports `type { DialogueAlignment }`).
  3. `src/screens/reader/hooks/useReaderAudio.ts` (Line 2: imports `type { DialogueAlignment }`).
  4. `src/utils/dialogueSync.ts` (Line 7: imports `type { DialogueAlignment }`).
  5. `tests/dialogueSync.test.ts` (Line 9: imports `type { DialogueAlignment }`).

#### Refactoring Plan
1. **Types Extraction**: Place `AlignedWord`, `AlignedLine`, `DialogueAlignment` in `src/types/dialogue.ts` (or re-export from `src/types/models.ts`).
2. **Data Extraction**: Extract the raw JSON object from `DIALOGUE_ALIGNMENTS` into `content/dialogueAlignment.json` (100 KB).
3. **Data Loader / Consumer Update**:
   - In `src/screens/reader/ReaderScreen.tsx`:
     ```ts
     import type { DialogueAlignment } from '../../types/dialogue';
     import rawAlignments from '@/content/dialogueAlignment.json';
     const DIALOGUE_ALIGNMENTS = rawAlignments as Record<string, DialogueAlignment>;
     ```
   - Update type-only import sites (`ReadingCanvas.tsx`, `useReaderAudio.ts`, `dialogueSync.ts`, `dialogueSync.test.ts`) to import from `../../types/dialogue`.
4. **Generator Script Update**: In `scripts/align_dialogue_audio.py`, update `OUT_FILE` to output `content/dialogueAlignment.json`.
5. **Deletion**: Delete `src/data/dialogueAlignment.ts`. Eliminates 5,053 lines of TS.

---

### 3.2 `src/data/grammar/` (~13,500 lines across 21 files) & Aggregators

#### Direct Observations
- **Files in `src/data/grammar/`**:
  - `lessonAuthoring.ts` (94 lines), `lessonTwoHelpers.ts` (105 lines)
  - 19 lesson part files ranging from 371 to 995 lines each (e.g. `lessonTwoPartOne.ts` 984 lines, `lessonTwoPartTwo.ts` 995 lines, `lessonThreePartOne.ts` 683 lines, `lessonEight.ts` 695 lines, `lessonNine.ts` 733 lines, `lessonThirteen.ts` 793 lines).
  - Total across `src/data/grammar/`: 12,919 lines.
- **Aggregators**:
  - `src/data/interactiveGrammarLessonOnePartTwo.ts`: 1,009 lines.
  - `src/data/interactiveGrammarPages.ts`: 975 lines. Defines Lesson 1 Part 1 directly (900 lines) and statically imports all 19 other lesson files.
- **Grand Total**: 14,903 lines of static data authoring.
- **Chunk Impact**: Vite bundles this into a 705.76 kB chunk (`interactiveGrammarPages-DXN3LmAo.js`).
- **Data Shape**: 29 `InteractiveGrammarPart` records. All values are serializable primitives (strings, numbers, arrays, and token objects). Zero closures or class instances.
- **Consumers**:
  - `src/data/readings.ts`: dynamically derives `ALL_READINGS` from `INTERACTIVE_GRAMMAR_PARTS`.
  - `src/App.tsx`: dynamically imports `getInteractiveGrammarPart`.
  - `src/screens/activities/ActivityModals.tsx`: imports `getInteractiveGrammarPartsForLesson`.
  - `src/screens/curriculum/hooks/useCourseDashboard.ts`: imports `getInteractiveGrammarPartsForLesson`.
  - `src/utils/validateInteractiveLessons.ts`: imports `INTERACTIVE_GRAMMAR_PARTS`.
  - `scripts/exportBookPages.ts`: imports `INTERACTIVE_GRAMMAR_PARTS`.
  - 10 test files (`tests/lessonOne.test.ts` to `lessonNine.test.ts`, `lessonsTenToFourteen.test.ts`).

#### Refactoring Plan
1. **JSON Extraction**:
   - Write a migration script `scripts/exportGrammarJson.ts` that runs in Node via `tsx`, imports `INTERACTIVE_GRAMMAR_PARTS` from `interactiveGrammarPages.ts`, and serializes each part into `content/grammar/lesson{XX}Part{YY}.json` (e.g., `lesson01PartOne.json`, `lesson01PartTwo.json`, ..., `lesson14PartTwo.json`, `lesson16PartOne.json`).
   - Total of 29 JSON files in `content/grammar/`.
2. **Aggregator Slimming**:
   - Rewrite `src/data/interactiveGrammarPages.ts`:
     - Statically or dynamically import the 29 JSON files.
     - Type them as `InteractiveGrammarPart`.
     - Export `INTERACTIVE_GRAMMAR_PARTS`, `getInteractiveGrammarPart(partId: string)`, and `getInteractiveGrammarPartsForLesson(bookId: number, lessonId: number)`.
     - `interactiveGrammarPages.ts` shrinks from 975 lines to ~65 lines!
   - Replace or delete `interactiveGrammarLessonOnePartTwo.ts` (re-export from JSON if needed, or remove).
3. **Tests Compatibility**:
   - Update tests (`tests/lesson*.test.ts`) to import lesson parts from `content/grammar/*.json` or via `interactiveGrammarPages.ts`. All 301 assertions on authored answer tiles, cues, and dialogues pass without change.
4. **Line Reduction**:
   - Remove the verbose `.ts` authoring files in `src/data/grammar/` (or retain authoring helpers in `scripts/` if required for future authoring).
   - Net reduction: ~13,500 lines of TS eliminated from `src/`.

---

## 4. Requirement 5 (R5): Monolith Decomposition Plan

### 4.1 `src/services/audioService.ts` (1,119 lines -> Target < 400 lines)

#### Direct Observations
- Contains `export class AudioService` and singleton `export const audioService = new AudioService();`.
- **Sub-concerns identified**:
  1. **Web Audio & Playback Core** (lines 35-120, 240-504, 832-1119):
     - `AudioContext` lifecycle and iOS unlock (`initialize()`).
     - Decoded `AudioBuffer` caching (LRU, max 100 entries).
     - Source node management and playback rate.
     - Fallback to `HTMLAudioElement` and object URLs for legacy browsers.
     - `playRange` with `requestAnimationFrame` progress reporting loop.
  2. **SpeechSynthesis TTS Engine** (lines 505-703):
     - `speakTTS(text, rate)` and `speakText(text, language, rate)`.
     - Voice list resolution with async `voiceschanged` event handling and Siri Chinese heuristics.
     - Utterance error handling and cleanup.
  3. **Neural TTS / Edge TTS Engine** (lines 704-765):
     - `speakNeural(text, voice)` and `preloadNeural(texts, voice, options)`.
     - Server endpoint `/api/tts` with Supabase auth token via `authService.getAccessToken()`.
     - Request deduplication (`neuralFetches` map).
     - Playing neural MP3 blobs via `HTMLAudioElement`.
  4. **Audio Caching Subsystem** (lines 140-230, 715-740):
     - Cache API (`caches.open`) for neural MP3s (`rongwaps-neural-tts-v1`).
     - Cache API for remote audio files (`rongwaps-audio-files-v1`).

#### Decomposition Architecture
Create module directory `src/services/audio/`:
- `src/services/audio/audioCache.ts` (~70 lines): Cache API abstractions for audio files and neural TTS blobs.
- `src/services/audio/speechSynthesizer.ts` (~120 lines): `SpeechSynthesis` wrapper, voice resolution, utterance fallback.
- `src/services/audio/neuralTtsService.ts` (~160 lines): Server TTS endpoint fetching, Supabase auth header, preloading queue, and deduplication.
- `src/services/audio/webAudioEngine.ts` (~250 lines): `AudioContext`, buffer decoding, Web Audio playback, HTML5 fallback, range playback loop.
- `src/services/audioService.ts` (~150 lines): Facade class coordinating the sub-modules, exposing the exact same public API:
  - `initialize()`, `play()`, `playRange()`, `stop()`, `speakTTS()`, `speakNeural()`, `preloadNeural()`, `speakText()`, `isAudioFileName()`, `setPlaybackRate()`.
  - Preserves full backward compatibility with all 23 consumers and existing tests in `tests/audioService.test.ts`.

---

### 4.2 `src/hooks/useCloudSync.ts` (659 lines -> Separation of Sync Queue from Hook)

#### Direct Observations
- Lines 43–107: Pure data normalization helpers (`computeSrsDelta`, `getProgressCounters`, `getDailyActivity`, `stringArray`, `numberArray`, `numberRecord`).
- Lines 172–395: `fetchFromCloud` (223 lines) — account switch detection, cache ownership claim, incremental watermark pull from `userService.getProgress`, merging SRS data, merging custom folders, reconciling tombstones and progress stats.
- Lines 397–570: `saveToCloud` (173 lines) — save coordinator, delta SRS calculation, delta custom folders, calling `userService.saveProgress`, updating last synced watermarks.
- Lines 109–171, 572–659: React hook lifecycle — store state selectors, refs, `useAppStore.subscribe` effect, debounce timer.

#### Decomposition Architecture
- Extract non-React logic into `src/services/cloudSyncService.ts` (or expand `src/utils/cloudSyncQueue.ts`):
  - `pullAndMergeCloudProgress(userId, options)`: Handles incremental pull, SRS merge, folder reconciliation, account switch cache reset.
  - `pushCloudProgress(userId, snapshot, options)`: Handles delta SRS generation, folder planning, saving via `userService`.
  - `computeSrsDelta`: Pure function already defined at top of file.
- `src/hooks/useCloudSync.ts` (~140 lines):
  - Focuses exclusively on React lifecycle: consumes `useAuth()`, subscribes to `useAppStore`, schedules debounced autosaves, triggers `cloudSyncService` methods, updates store sync status (`syncing`, `saved`, `error`).

---

### 4.3 `src/App.tsx` (431 lines -> Target < 250 lines)

#### Direct Observations
- Lines 44–48, 97–130, 194–206, 399–417: Reader state & lifecycle (~60 lines) — `readings`, `activeReadingIndex`, `openReader`, `closeReader`, `navigateReader`, 'r' keydown listener, rendering `<ReaderScreen>`.
- Lines 38–42, 93–96, 133–145, 419–430: Grammar lesson state & lifecycle (~50 lines) — `loadInteractiveGrammarPart`, `activeGrammarPartId`, `activeGrammarPart`, cancelable async load effect, rendering `<GrammarLessonScreen>`.
- Lines 50–60, 89–92, 153–190: Responsive navigation & window shortcuts (~50 lines) — `isDesktopViewport`, `DESKTOP_NAV_PREFERENCE_KEY`, `getInitialNavOpen`, media query listener, Ctrl+Shift+0 shortcut for debug window.
- Lines 208–216: Transient create-card activity cleanup on reload.

#### Decomposition Architecture
1. **Extract Reader Launcher**: Create `src/screens/reader/hooks/useReaderLauncher.ts` (or `src/screens/reader/components/ReaderLauncher.tsx`) (~60 lines) to encapsulate reader open/close/navigate state and keyboard binding.
2. **Extract Grammar Launcher**: Create `src/screens/grammar-lesson/hooks/useGrammarLauncher.ts` (or `GrammarLessonLauncher.tsx`) (~45 lines) to encapsulate grammar part ID, lazy load effect, and overlay rendering.
3. **Extract Desktop Nav Preference**: Create `src/hooks/useDesktopNavPreference.ts` (~40 lines) to handle desktop media query and localStorage sync.
4. **Resulting `src/App.tsx`**: Shrinks from 431 lines to ~180 lines, serving purely as layout shell and route coordinator.

---

### 4.4 `src/types/models.ts` (712 lines -> Target < 300 lines)

#### Direct Observations & Critical Audit Correction
- **Grammar Types Block**: Lines 253 to 645 (393 lines) contain all grammar lesson interfaces (`GrammarExerciseSegment`, `GrammarExerciseTile`, `GrammarExerciseQuestion`, `GrammarContrast`, `GrammarDiscoveryLab`, `GrammarNumberLab`, `GrammarRouteLab`, `GrammarLiveSceneLab`, `GrammarTimeRangeLab`, `GrammarTimelineLab`, `GrammarSequenceLab`, `GrammarAbilityLab`, `GrammarCompareLab`, `GrammarPairCompareLab`, `InteractiveGrammarPage`, `InteractiveGrammarPart`, etc.).
- **Audit Verification Result**:
  - The audit in `ORIGINAL_REQUEST.md` suggested "prune 10 unused grammar lab types (`GrammarDiscoveryLab`, `GrammarNumberLab`, etc.)".
  - **FINDING**: These types are NOT unused. They are imported by `src/screens/grammar-lesson/components/GrammarInteractiveHelp.tsx` and implemented by components in `src/screens/grammar-lesson/experiences/` (`GrammarDiscoveryLab.tsx`, `GrammarNumberLab.tsx`, `GrammarRouteLab.tsx`, `GrammarTimelineLab.tsx`, etc.). Unit tests in `tests/lessonFive.test.ts` and `tests/lessonsTenToFourteen.test.ts` verify their presence. Deleting them would fail build and tests.
- **Decomposition Plan**:
  - Move lines 253–645 into `src/types/grammarModels.ts` (~393 lines).
  - In `src/types/models.ts`, re-export them via `export * from './grammarModels'` to prevent breaking external imports, while retaining the core app models:
    - `UserFlashcard`, `UserFolder`, `UserProgressData`, `DailyProgress`, `ProgressStats`
    - `CourseLessonProgress`, `CourseDashboardProgress`, `SessionProgress`
    - `ReadingParagraph`, `ReaderTextSize`, `ReadingRecord`
    - `CourseExampleRecord`, `CourseExamplePack`, `CourseExampleManifest`
  - `src/types/models.ts` itself drops from 712 lines to ~285 lines (< 300 target).

---

### 4.5 Widget Encapsulation: `SmartSentence.tsx`, `PosBadge.tsx`, and `LottiePlayer.tsx`

#### Direct Observations
- AGENTS.md rule: "Shared UI primitives and patterns used by two or more features live in `src/lib/widgets/`... Feature components may own feature hooks/services; shared widgets should not own app fetching or global feature state."
- Acceptance Criteria: `No file in src/lib/widgets/ directly imports from src/services/ or src/store/`.
- Grep search for `from ['"].*(services|store)` in `src/lib/widgets/` revealed **3 violations**:
  1. `SmartSentence.tsx`:
     - Line 2: `import { useAppStore } from '../../store/useAppStore';` (used for `setDictionaryWord(seg.segment)` on click).
     - Line 3: `import { getDictionaryEntriesBatch } from '../../services/dictionaryService';` (used for segment verification).
  2. `PosBadge.tsx`:
     - Line 11: `import { useAppStore } from '../../store/useAppStore';` (used for `characterPreference`).
  3. `LottiePlayer.tsx` (**New Finding**):
     - Line 3: `import { loadJsonAsset } from '../../services/contentAssetService';` (used for optional remote URL fetching). All existing callers pass `animationData` directly.

#### Refactoring Plan
1. **`SmartSentence.tsx`**:
   - Remove `useAppStore` and `dictionaryService` imports.
   - Add props:
     ```ts
     interface SmartSentenceProps {
       text: string;
       className?: string;
       highlightTerms?: string[];
       onWordClick?: (word: string) => void;
       validateWords?: (words: string[]) => Promise<Map<string, unknown> | Set<string>>;
     }
     ```
   - Callers (`V3ExampleSentences.tsx`, `WordExamplesSection.tsx`, `FlashcardExamples.tsx`, `SentencesSection.tsx`, `AllExamplesSubOverlay.tsx`) pass `onWordClick={(w) => setDictionaryWord(w)}` and `validateWords={getDictionaryEntriesBatch}` (or use a domain wrapper).
2. **`PosBadge.tsx`**:
   - Remove `useAppStore` import.
   - Update `PosBadgeProps` to accept `characterPreference?: 'traditional' | 'simplified'`.
   - Callers pass `characterPreference` from their local/screen context.
3. **`LottiePlayer.tsx`**:
   - Remove `loadJsonAsset` import from `src/services/contentAssetService`.
   - Either accept an optional `fetchAsset?: (url: string) => Promise<unknown>` prop or use standard browser `fetch` directly if `src` is provided.
4. **Result**: Zero imports from `src/services/` or `src/store/` across the entire `src/lib/widgets/` directory.

---

### 4.6 Relocating `staging/` and `sources/` from `src/features/character-decomposition/` to `scripts/`

#### Direct Observations
- `src/features/character-decomposition/staging/model.ts` (line 1): `import { createHash } from 'node:crypto';`.
- This is the ONLY file in `src/` importing `node:crypto`.
- `character-decomposition/staging/` contains data staging code (`model.ts`, `index.ts`).
- `character-decomposition/sources/` contains adapters for raw datasets (`cjkviAdapter.ts`, `cns11643Adapter.ts`, `makeMeAHanziAdapter.ts`).
- Consumers:
  - `staging/` is only imported by `scripts/lib/decompositionStagingSupabase.ts` and `tests/decompositionStaging.test.ts`.
  - `sources/` is only re-exported by `src/features/character-decomposition/index.ts` and imported by `tests/decompositionSources.test.ts`.
  - Zero browser components, hooks, or runtime services import `staging/` or `sources/`.
- Also observed: `SingleBreakdownView.tsx` reaches into `src/features/character-decomposition/decompositionService.ts` instead of using the feature barrel.

#### Refactoring Plan
1. Move `src/features/character-decomposition/staging/` to `scripts/decomposition/staging/`.
2. Move `src/features/character-decomposition/sources/` to `scripts/decomposition/sources/`.
3. Update `scripts/lib/decompositionStagingSupabase.ts` imports to `../../scripts/decomposition/staging/model`.
4. Update `tests/decompositionStaging.test.ts` and `tests/decompositionSources.test.ts` imports to `../scripts/decomposition/...`.
5. Remove `export * from './sources';` from `src/features/character-decomposition/index.ts`.
6. Export `getDecompositionRuntimeService` from `src/features/character-decomposition/index.ts` and update `SingleBreakdownView.tsx` to import from `../../../character-decomposition`.
7. **Result**: No file under `src/` imports `node:crypto` or any Node.js built-in API.

---

## 5. Execution Sequence & Dependency Matrix

The refactoring for R4 and R5 should be executed in three sequential waves to ensure test passes and prevent build breaks:

```
┌────────────────────────────────────────────────────────────┐
│ Wave 1: Script Relocation & Widget Encapsulation           │
│ - Move staging/ & sources/ to scripts/decomposition/       │
│ - Update SingleBreakdownView & tests                       │
│ - Remove service/store imports from SmartSentence,         │
│   PosBadge, and LottiePlayer                               │
│ Verification: npm run typecheck && npm test                │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────┐
│ Wave 2: Static Data Extraction (R4)                        │
│ - Extract dialogueAlignment.ts -> content/dialogueAlignment│
│ - Extract src/data/grammar/ -> content/grammar/*.json      │
│ - Slim interactiveGrammarPages.ts aggregator               │
│ - Update tests to import from new paths                    │
│ Verification: npm run build && npm test                    │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────┐
│ Wave 3: Monolith Decomposition (R5)                        │
│ - Split audioService.ts -> audio/ submodules (< 400 lines) │
│ - Split useCloudSync.ts -> cloudSyncService (< 200 lines)  │
│ - Split App.tsx -> useReaderLauncher & grammarLauncher     │
│ - Split models.ts -> grammarModels.ts (< 300 lines)        │
│ Verification: npm run build && npm test && npm run lint    │
└────────────────────────────────────────────────────────────┘
```

---

## 6. Risk Analysis & Mitigations

| Risk | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|
| JSON imports in Node.js test runner fail without bundler | Low | High | `tsx` supports ES module JSON imports. Verified existing `json` imports (`sandy-loading.json`, `rainbow_twist.json`) resolve properly. |
| Test files importing moved grammar parts fail | High (expected) | Low | R7 acceptance criteria explicitly allows updating tests for moved files. Tests will be updated to point to the new JSON files or aggregator. |
| Breaking `audioService` consumers during split | Medium | High | Keep `AudioService` class facade in `audioService.ts` with identical method signatures. Sub-modules handle internal logic. Run `tests/audioService.test.ts` continuously. |
| `useAppStore` state changes missed if sync service detached | Medium | Medium | Maintain the same store subscription mechanism in `useCloudSync.ts`. Only the pull/merge/delta math moves to pure functions. |
