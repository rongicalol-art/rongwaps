# Project: RongWaps Fresh-Foundation Cleanup

## Architecture & System Overview
RongWaps is a React/TypeScript Chinese-language learning application (Vite + Tailwind CSS v4 + Zustand + Supabase + Express backend).
This cleanup project establishes a fresh, robust architectural foundation by:
1. Purging documentation bloat, stale plans, backup files, and aligning `AGENTS.md` and `docs/INDEX.md` with codebase reality.
2. Removing dead npm packages (`lucide-react`, `swiper`, `axios`, `autoprefixer`, `@tanstack/react-virtual`), cleaning `vite.config.ts`, fixing misplaced devDependencies, renaming the package, deleting ghost empty directories, and purging phantom stores.
3. Extracting ~20,000 lines of static data (`dialogueAlignment.ts` and `src/data/grammar/*.ts`) into structured JSON files in `content/`, and providing lightweight loaders.
4. Decomposing monoliths (`audioService.ts`, `useCloudSync.ts`, `App.tsx`, `models.ts`), enforcing widget encapsulation across `src/lib/widgets/`, and relocating Node build scripts from `src/features/character-decomposition/` to `scripts/decomposition/`.
5. Restructuring the Express backend from root `server.ts` to `server/index.ts` with updated scripts.
6. Ensuring 100% build pass (`npm run build`), test pass (`npm test`), dev server health, lint pass, and typecheck pass without regressions.

## Feature Inventory
| # | Feature / Work Item | Description | Milestone | Source |
|---|---------------------|-------------|-----------|--------|
| 1 | Markdown Cleanup | Delete 30 obsolete/stale markdown files, delete `.original.md` backups, delete `.hermes/` and `.openai/` | M1 | R1, survey_1 (DONE) |
| 2 | Decisions Trim | Trim `DECISIONS.md` to exactly 17 active decisions with 0 superseded entries | M1 | R1, survey_1 (DONE) |
| 3 | Documentation Index | Rewrite `docs/INDEX.md` with accurate links to the surviving 10-11 markdown files | M1 | R1, survey_1 (DONE) |
| 4 | AGENTS.md Rewrite | Rewrite `AGENTS.md` eliminating false mnemonics claim, rigid scroll rules, magic pixel values, and Axios | M1 | R3, survey_1 (DONE) |
| 5 | Dead Dependencies | Remove `lucide-react`, `swiper`, `axios`, `autoprefixer`, `@tanstack/react-virtual` from `package.json` | M2 | R2, survey_2 |
| 6 | Config Cleanup | Remove `lucide-react` from `vite.config.ts`, move Vite plugins to `devDependencies`, rename package to `rongwaps` | M2 | R2, survey_2 |
| 7 | Ghost Directories | Delete 8 empty directories in `src/screens/grammar-quest/` and `src/screens/grammar-lesson/` | M2 | R2, survey_2 |
| 8 | Phantom Stores | Remove 6 unused stores in `src/store/`, move `UserSnapshot` into `useAppStore.ts` | M2 | R2, survey_2 |
| 9 | Orphaned Components | Delete `VirtualizedList.tsx`, `CollectionListItem.tsx`, `LibraryContinueCard.tsx`, prune `aiService.ts` wrapper | M2 | R2, survey_2 |
| 10 | Server Restructuring | Move `server.ts` to `server/index.ts`, update relative imports and `package.json` scripts | M2 | R6, survey_2 |
| 11 | Dialogue Alignment JSON | Move `dialogueAlignment.ts` (5,053 lines) to `content/dialogueAlignment.json` + `src/types/dialogue.ts` | M3 | R4, survey_3 |
| 12 | Grammar Static Data JSON | Convert `src/data/grammar/` (21 files) to JSON in `content/grammar/`, slim `interactiveGrammarPages.ts` loader | M3 | R4, survey_3 |
| 13 | Audio Service Decomposition | Split `audioService.ts` (1,119 lines -> < 300 lines) with modules in `src/services/audio/` | M4 | R5, survey_3 |
| 14 | Cloud Sync Decomposition | Split `useCloudSync.ts` (659 lines -> < 200 lines) extracting `src/services/cloudSyncService.ts` | M4 | R5, survey_3 |
| 15 | App.tsx Decomposition | Split `App.tsx` (431 lines -> < 250 lines) extracting reader/grammar/nav hooks | M4 | R5, survey_3 |
| 16 | Models Splitting | Split `models.ts` (712 lines -> < 300 lines) extracting grammar types to `src/types/grammarModels.ts` | M4 | R5, survey_3 |
| 17 | Widget Encapsulation | Refactor `SmartSentence.tsx`, `PosBadge.tsx`, `LottiePlayer.tsx` to accept props without service/store imports | M4 | R5, survey_3 |
| 18 | Script Relocation | Move `staging/` and `sources/` from `src/features/character-decomposition/` to `scripts/decomposition/` | M4 | R5, survey_3 |
| 19 | E2E & Health Verification | Verify `npm run build`, `npm run dev`, `npm test` (301+ tests), typecheck, lint, audit verification | M5 | R7, all |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Documentation Nuclear Cleanup & AGENTS.md Rewrite | R1 & R3: Delete stale docs, .original.md, .hermes, .openai; trim DECISIONS.md; rewrite docs/INDEX.md; rewrite AGENTS.md | none | DONE |
| M2 | Dead Dependencies, Dead Code & Server Restructuring | R2 & R6: Remove dead deps, clean configs, delete ghost dirs & phantom stores, clean orphaned components, move server.ts to server/ | none | READY |
| M3 | Static Data Extraction | R4: Extract dialogueAlignment.ts to JSON, convert grammar lesson data to JSON, update loaders and imports | M2 | PLANNED |
| M4 | Monolith Decomposition & Architecture Hardening | R5: audioService, useCloudSync, App.tsx, models.ts decomposition; widget encapsulation; move decomposition scripts to scripts/ | M2, M3 | PLANNED |
| M5 | Final Verification & Audit Hardening | R7: Full build, dev server startup, unit & E2E tests, typecheck, lint, adversarial & forensic integrity audit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### Dialogue Data Contract
- Data location: `content/dialogueAlignment.json`
- Types location: `src/types/dialogue.ts`
- Structure:
  ```typescript
  export interface AlignedWord { word: string; start: number; end: number; }
  export interface AlignedLine { lineIndex: number; text: string; start: number; end: number; words: AlignedWord[]; }
  export interface DialogueAlignment { audioUrl: string; duration: number; lines: AlignedLine[]; }
  ```
- Loader: `import dialogueAlignmentData from '../../../content/dialogueAlignment.json';` or dynamic fetch.

### Grammar Data Contract
- JSON files location: `content/grammar/*.json`
- Types location: `src/types/grammarModels.ts`
- Export interface: `InteractiveGrammarPart`
- Aggregator loader: `interactiveGrammarPages.ts` exports `getInteractiveGrammarPart(lessonId, partId): Promise<InteractiveGrammarPart | null>`.

### Audio Sub-Modules Contract (`src/services/audio/`)
- `webAudioEngine.ts`: Web Audio context, AudioBuffer decoding, sound effect playback, cache integration.
- `speechSynthesizer.ts`: Browser SpeechSynthesis utterance management, voice selection heuristics.
- `neuralTtsService.ts`: Neural / Edge TTS remote audio generation and streaming.
- `audioCache.ts`: Cache API management (`audio-cache-v1`), offline buffer retrieval.
- `audioService.ts`: Public unified facade preserving all existing method signatures (`playAudio`, `stopAudio`, `speakChinese`, etc.).

### Cloud Sync Service Contract (`src/services/cloudSyncService.ts`)
- `pullAndMergeCloudProgress`: Pure data reconciliation between local state and cloud snapshot.
- `pushCloudProgress`: Serializes and pushes dirty changes to Supabase.
- `computeSrsDelta`: Calculates updated SRS states and tombstones.
- `useCloudSync.ts`: React hook managing debounce timers, online/offline status, and auth trigger.

### Widget Encapsulation Rules
- No file under `src/lib/widgets/` may import from `src/services/` or `src/store/`.
- `SmartSentence.tsx`: Accepts lookup handler `onWordClick?: (word: string) => void` or pre-resolved definitions.
- `PosBadge.tsx`: Accepts `characterPreference?: 'simplified' | 'traditional'` via props.
- `LottiePlayer.tsx`: Accepts JSON data or asset path via props without calling asset services directly.

## Code Layout
- `src/lib/widgets/`: Pure presentational shared UI components (zero service/store imports).
- `src/services/`: External API, DB, audio, and sync services.
- `src/services/audio/`: Sub-modules for audio playback, TTS, caching.
- `src/store/`: Global Zustand store (`useAppStore.ts`).
- `src/types/`: Data models and interface definitions (`models.ts`, `grammarModels.ts`, `dialogue.ts`).
- `content/`: Static JSON datasets (`dialogueAlignment.json`, `grammar/*.json`).
- `server/`: Express backend (`server/index.ts`).
- `scripts/`: Offline tools and build pipelines (`scripts/decomposition/`).
- `tests/`: Unit tests, E2E acceptance tests, test architecture (`TEST_INFRA.md`, `TEST_READY.md`).
