# Survey Report: Dead Dependencies, Dead Code (R2) & Server Restructuring (R6)

**Explorer**: explorer_survey_2  
**Date**: 2026-09-04T15:46:00Z  
**Target Repository**: `/Users/ronianb.gica/Projects/rongwaps`  
**Milestone**: Technical Investigation & Actionable Planning for Requirements 2 & 6  

---

## Executive Summary

This report provides the exhaustive technical audit and step-by-step execution plan for **Requirement 2 (Dead Dependency & Dead Code Removal)** and **Requirement 6 (Server Restructuring)**. 

### Key Discoveries:
1. **5 Dead Dependencies**: `lucide-react`, `swiper`, `axios`, `autoprefixer`, and `@tanstack/react-virtual` have **zero active consumers** in client code (`@tanstack/react-virtual` is only imported by the orphaned `VirtualizedList.tsx`). `lucide-react` is also dead in `vite.config.ts:60`. `axios` is still a transitive dependency of `msedge-tts@2.0.7`, so removing it from top-level `package.json` cleanly removes it as a direct dependency.
2. **Ghost Directories**: Exactly 8 empty directories exist in `src/`: `src/screens/grammar-quest/` (with empty `components/` and `hooks/`) and 7 empty lesson directories under `src/screens/grammar-lesson/`.
3. **6 Phantom Zustand Stores**: `useAuthStore`, `useNavigationStore`, `useSrsStore`, `useUiStore`, `useLibraryStore`, `useSyncStore` in `src/store/` are **never imported by any component or hook**. `useAppStore.ts` (471 lines) is the actual active monolithic store. `UserSnapshot` is currently defined inside `useAuthStore.ts` and must be preserved when deleting the file.
4. **Orphaned Component Clusters**: Beyond `VirtualizedList.tsx` and `aiService.ts`, we identified a massive orphaned cluster in `src/screens/grammar-lesson/`: `GrammarInteractiveHelp.tsx`, `GrammarHelpDisclosure.tsx`, `SentenceSpine.tsx`, `GrammarLabShell.tsx`, and all 10 lab components under `src/screens/grammar-lesson/experiences/` (11 files) have **zero active consumers**. Additionally, 6 other orphaned screen components were identified (`CourseProgressSummary`, `ResponsiveCourseBackdrop`, `GrammarPathActions`, `AllExamplesSubOverlay`, `SentencesSection`, `LibraryContinueCard`, `ProgressDashboard`).
5. **Dead Types & R4 Interdependency**: 10 grammar lab types and sentence spine types in `src/types/models.ts` correspond to dead lab components. However, 47 occurrences of `discoveryLab` exist in `src/data/grammar/*.ts` object literals; pruning them from TypeScript interfaces must coordinate with R4 (static data extraction to JSON) to prevent `tsc` excess property check errors.
6. **Server Restructuring**: `server.ts` (356 lines) can be cleanly moved to `server/index.ts`. All path references use `process.cwd()` which remains stable. Only the relative import to `supabaseClient` needs updating to `../src/services/supabaseClient.js`, and `package.json` scripts (`dev`, `build`, `lint`) updated accordingly.

---

## Section 1: Dependencies & Configuration Audit

### 1.1 Dependency Removal Audit

| Dependency | Category in `package.json` | References in `src/` | References in Configs | Status & Action |
|------------|----------------------------|----------------------|-----------------------|-----------------|
| `lucide-react` (`^0.546.0`) | `dependencies:60` | None (0 imports) | `vite.config.ts:60` in `manualChunks.vendor` | **Dead**. Remove from `package.json` and remove `'lucide-react'` from `vite.config.ts`. |
| `swiper` (`^12.1.4`) | `dependencies:66` | None (0 imports) | None | **Dead**. Remove from `package.json`. |
| `axios` (`^1.18.0`) | `dependencies:51` | None (0 imports) | None | **Dead direct dependency** (AGENTS.md forbids it). Note: `msedge-tts@2.0.7` has an internal transitive dependency on `axios@^1.11.0`. Removing top-level `axios` from `package.json` leaves `npm ls --depth=0 axios` empty. |
| `autoprefixer` (`^10.4.21`) | `dependencies:50` | None (0 imports) | None | **Dead**. Tailwind CSS v4 handles vendor prefixing natively via `@tailwindcss/vite`. |
| `@tanstack/react-virtual` (`^3.13.26`) | `dependencies:48` | `src/screens/library/VirtualizedList.tsx:2` | None | **Dead**. The only consumer is orphaned `VirtualizedList.tsx`. Once `VirtualizedList.tsx` is deleted, this package has 0 consumers. |

### 1.2 Misplaced Dependencies & Package Name

- **Move to `devDependencies`**:
  - `@tailwindcss/vite`: currently in `dependencies:47` (`^4.1.14`). Vite plugins belong in `devDependencies`.
  - `@vitejs/plugin-react`: currently in `dependencies:49` (`^5.0.4`). Vite plugins belong in `devDependencies`.
- **Package Name**:
  - `package.json:2`: `"name": "react-example"` -> Change to `"name": "rongwaps"`.

### 1.3 `vite.config.ts` Adjustments
In `vite.config.ts`:
```ts
// Line 59-64: Current
manualChunks: {
  vendor: ['react', 'react-dom', 'motion', 'lucide-react'],
  supabase: ['@supabase/supabase-js'],
}

// Target
manualChunks: {
  vendor: ['react', 'react-dom', 'motion'],
  supabase: ['@supabase/supabase-js'],
}
```

---

## Section 2: Ghost Directories Audit

Verified using `find src -type d -empty`:

1. **`src/screens/grammar-quest/`**:
   - Subdirectories: `src/screens/grammar-quest/components` (empty) and `src/screens/grammar-quest/hooks` (empty).
   - Contains zero files.
   - Action: Delete the entire directory `src/screens/grammar-quest/`.

2. **`src/screens/grammar-lesson/` empty lesson folders**:
   - `src/screens/grammar-lesson/lesson-one-part-one`
   - `src/screens/grammar-lesson/lesson-one-part-two`
   - `src/screens/grammar-lesson/lesson-two-part-one`
   - `src/screens/grammar-lesson/lesson-two-part-two`
   - `src/screens/grammar-lesson/lesson-five-part-two`
   - `src/screens/grammar-lesson/lesson-eleven-part-one`
   - `src/screens/grammar-lesson/lesson-fourteen-part-one`
   - These 7 directories contain zero files.
   - Action: Delete all 7 empty directories.

No other empty directories exist under `src/`.

---

## Section 3: Phantom Stores Audit

### 3.1 Store Inventory in `src/store/`

| File | Lines | Consumers in `src/` | Type of Store | Assessment |
|------|-------|-------------------|---------------|------------|
| `useAppStore.ts` | 471 | 35+ files | Monolithic persisted store (`idb-keyval`) | **Active Core Store** |
| `useGrammarLessonStore.ts` | 55 | 4 files (`useResetProgress`, `ActivityModals`, `useCourseDashboard`, `GrammarLessonScreen`) | Specialized grammar progress store | **Active Store** |
| `usePracticePreferencesStore.ts` | 158 | 10+ files (audio, pinyin, delays, quiz settings) | Local user practice preference store | **Active Store** |
| `useAuthStore.ts` | 18 | 0 components/hooks (only `useAppStore.ts` imports `type UserSnapshot`) | Phantom store | **Dead Store** |
| `useNavigationStore.ts` | 29 | 0 consumers | Phantom store | **Dead Store** |
| `useSrsStore.ts` | 105 | 0 consumers | Phantom store | **Dead Store** |
| `useUiStore.ts` | 69 | 0 consumers | Phantom store | **Dead Store** |
| `useLibraryStore.ts` | 44 | 0 consumers | Phantom store | **Dead Store** |
| `useSyncStore.ts` | 19 | 0 consumers | Phantom store | **Dead Store** |

### 3.2 The Phantom Store Mechanism & `useAppStore.ts`
- The file header of `useAppStore.ts` claims: *"delegates to domain-specific stores"*.
- **In reality, it does NOT delegate anything.** `useAppStore` directly creates and manages all state inside `create<AppState>()(persist(...))`.
- At lines 217-222, `useAppStore.ts` contains:
  ```ts
  export { useAuthStore } from './useAuthStore';
  export { useNavigationStore } from './useNavigationStore';
  export { useSrsStore } from './useSrsStore';
  export { useUiStore } from './useUiStore';
  export { useLibraryStore } from './useLibraryStore';
  export { useSyncStore } from './useSyncStore';
  ```
- Grep search across the entire project confirmed that **zero** components or files import any of these re-exports from `useAppStore`.

### 3.3 Critical Dependency: `UserSnapshot`
- `useAuthStore.ts:3-8` defines:
  ```ts
  export interface UserSnapshot {
    id: string;
    email: string | undefined;
    fullName: string | undefined;
    avatarUrl: string | undefined;
  }
  ```
- `useAppStore.ts:34,49` imports and re-exports `UserSnapshot`.
- `src/hooks/useAuth.ts:4` imports `{ useAppStore, UserSnapshot } from '../store/useAppStore'`.
- **Action Required**: Before deleting `useAuthStore.ts`, relocate `UserSnapshot` interface directly into `useAppStore.ts` (or `src/types/models.ts`), and remove lines 34, 49, and 217-222 from `useAppStore.ts`.

---

## Section 4: Orphaned Components & Dead Code Audit

### 4.1 Library Screen Orphaned Components
1. **`src/screens/library/VirtualizedList.tsx`**:
   - 83 lines.
   - Imports `@tanstack/react-virtual` (`useVirtualizer`) and `CollectionListItem`.
   - Zero consumers in the repository. The library view switched to a CSS grid of `SpellCard` components.
2. **`src/screens/library/CollectionListItem.tsx`**:
   - 104 lines.
   - Only imported by `VirtualizedList.tsx`.
   - Zero consumers once `VirtualizedList.tsx` is deleted.
3. **`src/screens/library/components/LibraryContinueCard.tsx`**:
   - 48 lines. Zero consumers in `src/`.

### 4.2 `src/services/aiService.ts`
- 7 lines total:
  ```ts
  export { clearAllMnemonics, fetchAllMnemonicsDebug, getCachedMnemonic, saveMnemonicToCache } from "./mnemonicCache";
  ```
- It is a vestigial re-export file. The actual implementation is in `src/services/mnemonicCache.ts` (153 lines).
- 3 call sites import `aiService`:
  1. `src/features/character-memory-hooks/MemoryHookCharacter.tsx:5`: `getCachedMnemonic`
  2. `src/features/practice/components/BreakdownExpandPanel.tsx:3`: `getCachedMnemonic`
  3. `src/screens/debug/DebugWindow.tsx:2`: `fetchAllMnemonicsDebug`, `clearAllMnemonics`
- **Action**: Update all 3 call sites to import directly from `mnemonicCache.ts`, then delete `aiService.ts`.

### 4.3 Grammar Interactive Experiences Cluster (Orphaned Labs)
An entire dormant subsystem for interactive grammar labs was discovered:
1. **`src/screens/grammar-lesson/components/GrammarInteractiveHelp.tsx`** (98 lines):
   - Zero imports across the entire project.
   - Hosts and imports the 10 lab components from `experiences/`, plus `SentenceSpine` and `GrammarHelpDisclosure`.
2. **`src/screens/grammar-lesson/components/GrammarHelpDisclosure.tsx`** (38 lines):
   - Only imported by `GrammarInteractiveHelp.tsx`.
3. **`src/screens/grammar-lesson/components/SentenceSpine.tsx`** (127 lines):
   - Only imported by `GrammarInteractiveHelp.tsx`.
4. **`src/screens/grammar-lesson/components/GrammarLabShell.tsx`** (32 lines):
   - Only imported by `SentenceSpine.tsx` and the 10 lab components.
5. **`src/screens/grammar-lesson/experiences/`** (11 files):
   - `GrammarAbilityLab.tsx`
   - `GrammarCompareLab.tsx`
   - `GrammarDiscoveryLab.tsx`
   - `GrammarLiveSceneLab.tsx`
   - `GrammarNumberLab.tsx`
   - `GrammarPairCompareLab.tsx`
   - `GrammarRouteLab.tsx`
   - `GrammarSequenceLab.tsx`
   - `GrammarTimeRangeLab.tsx`
   - `GrammarTimelineLab.tsx`
   - `index.ts`
   - None of these are imported by any active screen.

### 4.4 Dead Types in `src/types/models.ts` & Coordination with R4
In `src/types/models.ts`:
- Lines 204-221: `GrammarSentenceSpineSlot`, `GrammarSentenceSpine`
- Lines 356-526:
  - `GrammarDiscoveryChoice`, `GrammarDiscoveryLab`
  - `GrammarNumberLabGroup`, `GrammarNumberLabChoice`, `GrammarNumberLab`
  - `GrammarRouteLabChoice`, `GrammarRouteLab`
  - `GrammarSceneChoice`, `GrammarLiveSceneChoice`, `GrammarLiveSceneLab`
  - `GrammarTimeRangeChoice`, `GrammarTimeRangeLab`
  - `GrammarTimelineChoice`, `GrammarTimelineLab`
  - `GrammarSequenceChoice`, `GrammarSequenceLab`
  - `GrammarAbilityChoice`, `GrammarAbilityLab`
  - `GrammarCompareChoice`, `GrammarCompareLab`, `GrammarPairCompareLab`
- In `InteractiveGrammarPage` (lines 606-616), these lab types are referenced as optional properties (`discoveryLab?`, `numberLab?`, etc.).
- **⚠️ Important Implementation Interdependency**:
  - In `src/data/grammar/*.ts` (e.g. `lessonEight.ts`), static data objects currently include `discoveryLab: { ... }`, `numberLab: { ... }`, etc. (47 occurrences).
  - If these properties are stripped from `InteractiveGrammarPage` while data remains typed as `InteractiveGrammarPage`, TypeScript will error with excess property checks on object literals.
  - **Strategy**: 
    - When R4 extracts grammar data to JSON or strips unused lab objects, prune the 10 lab types and spine types completely.
    - If pruned during R2, either strip the lab blocks from the TS data files or mark them as `discoveryLab?: unknown` temporarily until R4 JSON migration.

### 4.5 Additional Orphaned Components Identified
The following components have 0 consumers anywhere in `src/`:
- `src/screens/curriculum/components/CourseProgressSummary.tsx`
- `src/screens/curriculum/components/ResponsiveCourseBackdrop.tsx`
- `src/screens/curriculum/components/GrammarPathActions.tsx`
- `src/screens/flashcard/components/AllExamplesSubOverlay.tsx`
- `src/screens/flashcard/components/SentencesSection.tsx`
- `src/screens/profile/components/ProgressDashboard.tsx`

*(Note: Dormant exercise components like `GrammarExercisePage`, `DragBlankExercise`, `SentenceUnscrambleExercise`, etc. are intentionally retained per AGENTS.md for the post-beta practice release).*

### 4.6 Legacy Keyframes in `src/index.css`
Audit of `@keyframes` and `.anim-*` utility classes:
- `@keyframes popIn` (lines 220-224) and `.anim-pop` (lines 232, 245): **0 consumers**. Legacy leftover from older card creation animations. Can be safely deleted.
- `slideInFwd`, `slideInBack`, and `float`: Active (used by `AddCardScreen.tsx:32,42`).
- `teaser-marquee`: Active (used by `GrammarNextUpTeaser.tsx:58`).

---

## Section 5: Server Restructuring Audit (R6)

### 5.1 Analysis of `server.ts`
- **File size**: 356 lines at project root.
- **Role**: Unified backend server providing:
  1. API Endpoints:
     - `GET /api/audio/*`: Audio proxy downloading from Supabase storage `vocabulary-audio` bucket (CORS workaround).
     - `POST /api/tts`: Neural Mandarin TTS synthesis (MiniMax Speech / msedge-tts fallback) with Supabase session JWT authentication (`requireAuth`).
     - `GET /api/tts-cache/:text`: Serves cached TTS audio.
     - `GET /api/tts/:voice/*`: Direct cache read for synthesized audio files.
  2. Frontend Integration:
     - Dev mode: Embeds Vite development middleware via `createViteServer({ server: { middlewareMode: true } })`.
     - Prod mode: Serves static compiled files from `dist/` with immutable headers on `/assets/*` and 1-hour cache on `/data` and `/hanzi-data`.
- **Environment & Paths**:
  - `const distPath = path.join(process.cwd(), "dist");` uses `process.cwd()`. This resolves to project root regardless of whether the server script is in root or `server/`.
  - Line 7: `import { supabase } from "./src/services/supabaseClient.js";` is the only relative import to project source. When moved to `server/index.ts`, it becomes `import { supabase } from "../src/services/supabaseClient.js";`.

### 5.2 Server Scripts in `package.json`
Current scripts:
```json
"dev": "tsx server.ts",
"build": "vite build && esbuild server.ts --bundle --platform=node --format=esm --packages=external --sourcemap --outfile=dist/server.js",
"lint": "eslint src tests server.ts vite.config.ts --max-warnings=0",
```
Updated scripts for `server/index.ts`:
```json
"dev": "tsx server/index.ts",
"build": "vite build && esbuild server/index.ts --bundle --platform=node --format=esm --packages=external --sourcemap --outfile=dist/server.js",
"lint": "eslint src tests server vite.config.ts --max-warnings=0",
```

### 5.3 Target Structure for `server/`
Moving `server.ts` to `server/index.ts`:
```
server/
└── index.ts        # Express server, API proxy, TTS engine, Vite dev middleware & static hosting
```
*(Optionally modularize in Phase 2 into `server/routes/audio.ts`, `server/routes/tts.ts`, `server/services/ttsService.ts` if desired, but moving `server.ts` directly to `server/index.ts` satisfies R6 cleanly with zero risk of route divergence).*

### 5.4 Other References to Update
- `README.md`: Lines 67, 91 (update `server.ts` references to `server/index.ts`).
- `src/services/supabaseClient.ts`: Line 43 comment (`server.ts` -> `server/index.ts`).

---

## Section 6: Step-by-Step Execution Plan

### Step 1: Server Restructuring (R6)
1. Create directory `server/`.
2. Move `server.ts` to `server/index.ts`.
3. In `server/index.ts`:
   - Change line 7 from `./src/services/supabaseClient.js` to `../src/services/supabaseClient.js`.
4. In `package.json`:
   - Update `"dev"` script: `tsx server/index.ts`.
   - Update `"build"` script: replace `esbuild server.ts` with `esbuild server/index.ts`.
   - Update `"lint"` script: replace `server.ts` with `server`.
5. In `src/services/supabaseClient.ts`:
   - Update comment referencing `server.ts` to `server/index.ts`.
6. Run `npm run typecheck`, `npm run lint`, and test `node --check server/index.ts`.

### Step 2: Update `aiService.ts` Consumers & Delete Wrapper (R2)
1. In `src/features/character-memory-hooks/MemoryHookCharacter.tsx`:
   - Change import from `../../services/aiService` to `../../services/mnemonicCache`.
2. In `src/features/practice/components/BreakdownExpandPanel.tsx`:
   - Change import from `../../../services/aiService` to `../../../services/mnemonicCache`.
3. In `src/screens/debug/DebugWindow.tsx`:
   - Change import from `../../services/aiService` to `../../services/mnemonicCache`.
4. Delete `src/services/aiService.ts`.

### Step 3: Delete Orphaned Library Components & Virtualizer (R2)
1. Delete `src/screens/library/VirtualizedList.tsx`.
2. Delete `src/screens/library/CollectionListItem.tsx`.
3. Delete `src/screens/library/components/LibraryContinueCard.tsx`.

### Step 4: Delete Orphaned Grammar Interactive Help & Labs (R2)
1. Delete `src/screens/grammar-lesson/components/GrammarInteractiveHelp.tsx`.
2. Delete `src/screens/grammar-lesson/components/GrammarHelpDisclosure.tsx`.
3. Delete `src/screens/grammar-lesson/components/SentenceSpine.tsx`.
4. Delete `src/screens/grammar-lesson/components/GrammarLabShell.tsx`.
5. Delete the entire directory `src/screens/grammar-lesson/experiences/` (11 files).

### Step 5: Delete Other Confirmed Orphaned Screen Components (R2)
1. Delete `src/screens/curriculum/components/CourseProgressSummary.tsx`.
2. Delete `src/screens/curriculum/components/ResponsiveCourseBackdrop.tsx`.
3. Delete `src/screens/curriculum/components/GrammarPathActions.tsx`.
4. Delete `src/screens/flashcard/components/AllExamplesSubOverlay.tsx`.
5. Delete `src/screens/flashcard/components/SentencesSection.tsx`.
6. Delete `src/screens/profile/components/ProgressDashboard.tsx`.

### Step 6: Delete Ghost Directories (R2)
1. Delete `src/screens/grammar-quest/` (including empty `components/` and `hooks/`).
2. Delete 7 empty lesson folders in `src/screens/grammar-lesson/`:
   - `lesson-one-part-one`
   - `lesson-one-part-two`
   - `lesson-two-part-one`
   - `lesson-two-part-two`
   - `lesson-five-part-two`
   - `lesson-eleven-part-one`
   - `lesson-fourteen-part-one`

### Step 7: Clean Up Phantom Stores & Preserve `UserSnapshot` (R2)
1. In `src/store/useAppStore.ts`:
   - Inline the definition of `UserSnapshot` interface directly into `useAppStore.ts` (lines 3-8 of `useAuthStore.ts`).
   - Remove `import type { UserSnapshot } from './useAuthStore';`.
   - Remove lines 217-222 (`export { useAuthStore }...` etc.).
2. Delete the 6 phantom store files in `src/store/`:
   - `useAuthStore.ts`
   - `useNavigationStore.ts`
   - `useSrsStore.ts`
   - `useUiStore.ts`
   - `useLibraryStore.ts`
   - `useSyncStore.ts`

### Step 8: Clean CSS Keyframes (R2)
1. In `src/index.css`:
   - Remove `@keyframes popIn` (lines 220-224).
   - Remove `.anim-pop { ... }` (line 232).
   - Remove `.anim-pop,` from prefers-reduced-motion block (line 245).

### Step 9: Update `package.json` & `vite.config.ts` (R2)
1. In `vite.config.ts`:
   - Remove `'lucide-react'` from `manualChunks.vendor` array (line 60).
2. In `package.json`:
   - Change `"name"` from `"react-example"` to `"rongwaps"`.
   - Remove from `dependencies`:
     - `"@tanstack/react-virtual"`
     - `"autoprefixer"`
     - `"axios"`
     - `"lucide-react"`
     - `"swiper"`
   - Move from `dependencies` to `devDependencies`:
     - `"@tailwindcss/vite"`
     - `"@vitejs/plugin-react"`
3. Run `npm install` (or `npm prune`) to update `package-lock.json`.

### Step 10: Verification (R7)
1. `npm run typecheck` (verify TypeScript zero errors).
2. `npm run lint` (verify ESLint zero errors).
3. `npm test` (verify all 301 tests pass).
4. `npm run build` (verify Vite & esbuild server compilation).
5. Verify `grep -r "lucide-react\|swiper\|axios" src/ vite.config.ts` returns zero matches.
6. Verify `find src -type d -empty` returns zero empty directories.
