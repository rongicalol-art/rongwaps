# Handoff Report: Survey for R2 (Dead Code & Dependencies) & R6 (Server Restructuring)

**Agent Identity**: explorer_survey_2  
**Date**: 2026-09-04T15:47:00Z  
**Parent Orchestrator**: 3c2faab7-8d44-4972-82e9-ff93d6a3845b  
**Detailed Survey Report**: `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_2/survey_report.md`  

---

## 1. Observation

1. **Dead Dependencies**:
   - `package.json:60`: `"lucide-react": "^0.546.0"`. `grep_search` across `src/` returned 0 matches. Found in `vite.config.ts:60` in `manualChunks.vendor: ['react', 'react-dom', 'motion', 'lucide-react']`.
   - `package.json:66`: `"swiper": "^12.1.4"`. `grep_search` across `src/` and configs returned 0 matches.
   - `package.json:51`: `"axios": "^1.18.0"`. `grep_search` across `src/` and configs returned 0 matches. Direct dependency is forbidden by `AGENTS.md`. Note: `msedge-tts@2.0.7` has a transitive dependency on `axios@^1.11.0`.
   - `package.json:50`: `"autoprefixer": "^10.4.21"`. `grep_search` across `src/` returned 0 matches. Tailwind CSS v4 compiles prefixing natively.
   - `package.json:48`: `"@tanstack/react-virtual": "^3.13.26"`. Only 1 import in entire codebase: `src/screens/library/VirtualizedList.tsx:2` (`import { useVirtualizer } from '@tanstack/react-virtual'`).
   - `package.json:47,49`: `"@tailwindcss/vite"` and `"@vitejs/plugin-react"` are under `"dependencies"` instead of `"devDependencies"`.
   - `package.json:2`: `"name": "react-example"`.

2. **Ghost Directories**:
   - `find src -type d -empty` output:
     - `src/screens/grammar-quest/components`
     - `src/screens/grammar-quest/hooks`
     - `src/screens/grammar-lesson/lesson-two-part-one`
     - `src/screens/grammar-lesson/lesson-fourteen-part-one`
     - `src/screens/grammar-lesson/lesson-two-part-two`
     - `src/screens/grammar-lesson/lesson-one-part-two`
     - `src/screens/grammar-lesson/lesson-eleven-part-one`
     - `src/screens/grammar-lesson/lesson-one-part-one`
     - `src/screens/grammar-lesson/lesson-five-part-two`

3. **Phantom Stores**:
   - `src/store/`: 6 domain store files (`useAuthStore.ts`, `useNavigationStore.ts`, `useSrsStore.ts`, `useUiStore.ts`, `useLibraryStore.ts`, `useSyncStore.ts`).
   - `grep_search` for each store across `src/` returned 0 consumers in any screen, component, hook, or test.
   - `useAppStore.ts:217-222` re-exports them (`export { useAuthStore } from './useAuthStore';` etc.), but `useAppStore.ts` does not delegate to them; it re-implements all state and persists via `idb-keyval`.
   - `useAuthStore.ts:3-8` defines `UserSnapshot`. `useAppStore.ts:34,49` and `src/hooks/useAuth.ts:4` import `UserSnapshot`.

4. **Orphaned Components & Dead Code**:
   - `src/screens/library/VirtualizedList.tsx`: 0 imports across `src/`.
   - `src/screens/library/CollectionListItem.tsx`: only imported by `VirtualizedList.tsx:3`.
   - `src/screens/library/components/LibraryContinueCard.tsx`: 0 imports.
   - `src/services/aiService.ts`: 7 lines re-exporting from `mnemonicCache.ts`. 3 callers: `MemoryHookCharacter.tsx:5`, `BreakdownExpandPanel.tsx:3`, `DebugWindow.tsx:2`.
   - `src/screens/grammar-lesson/components/GrammarInteractiveHelp.tsx`: 0 imports. Hosts 10 labs in `src/screens/grammar-lesson/experiences/` + `SentenceSpine.tsx` + `GrammarHelpDisclosure.tsx` + `GrammarLabShell.tsx`.
   - `src/types/models.ts`: 10 lab types (lines 356-526) and sentence spine types (lines 204-221).
   - Additional orphaned components: `CourseProgressSummary.tsx`, `ResponsiveCourseBackdrop.tsx`, `GrammarPathActions.tsx`, `AllExamplesSubOverlay.tsx`, `SentencesSection.tsx`, `ProgressDashboard.tsx`.
   - `src/index.css`: `@keyframes popIn` (lines 220-224) and `.anim-pop` (lines 232, 245) have 0 consumers.

5. **Server Structure**:
   - `server.ts` is 356 lines at project root.
   - `server.ts:7`: `import { supabase } from "./src/services/supabaseClient.js";`.
   - `server.ts:319`: `const distPath = path.join(process.cwd(), "dist");`.
   - `package.json:7,8,12`: scripts referencing `server.ts` directly.

---

## 2. Logic Chain

1. **Dead Dependency Removal**: Because `lucide-react`, `swiper`, `axios`, and `autoprefixer` have 0 imports in `src/`, and `@tanstack/react-virtual` is only imported by `VirtualizedList.tsx`, removing `VirtualizedList.tsx` allows safe removal of all 5 packages from `package.json` without any runtime or type errors. Removing `'lucide-react'` from `vite.config.ts:60` prevents Rollup manual chunk errors.
2. **Ghost Directories**: Because `src/screens/grammar-quest/` and the 7 lesson folders contain zero files and zero imports, deleting them eliminates empty clutter without affecting any module resolution.
3. **Phantom Stores**: Because zero components consume the 6 domain stores, deleting them and removing their re-exports from `useAppStore.ts` does not break any callers. Relocating `UserSnapshot` into `useAppStore.ts` ensures `useAuth.ts` and `useAppStore.ts` remain type-safe.
4. **aiService Wrapper**: Because `aiService.ts` is merely an unnecessary 7-line wrapper around `mnemonicCache.ts`, pointing its 3 callers to `mnemonicCache.ts` allows deleting `aiService.ts` cleanly.
5. **Orphaned Labs & Models Interdependency**: The grammar lab components (`GrammarInteractiveHelp.tsx` and `experiences/`) are unrendered. However, 47 occurrences of `discoveryLab` exist in `src/data/grammar/*.ts` object literals typed as `InteractiveGrammarPage`. Pruning `discoveryLab` and related lab types from `models.ts` must coordinate with R4 (when static data is moved to JSON or stripped) to prevent TypeScript excess property errors.
6. **Server Restructuring**: Moving `server.ts` to `server/index.ts` cleanly separates backend code. Because `process.cwd()` is used for `dist/` path resolution, server behavior is identical when run from root via `tsx server/index.ts`. Only the relative import to `supabaseClient` needs updating to `../src/services/supabaseClient.js`.

---

## 3. Caveats

1. **`axios` Transitive Dependency**: While `axios` can be removed as a direct dependency from `package.json`, `npm ls axios` may still reflect the transitive dependency inside `node_modules/msedge-tts/node_modules/axios`. Running `npm ls --depth=0 axios` will return clean.
2. **Dormant Grammar Exercises**: Components such as `GrammarExercisePage`, `DragBlankExercise`, and `SentenceUnscrambleExercise` currently have no learner-facing route, but are intentionally kept per `AGENTS.md` and `docs/AUDIT_2026-08-24.md` for post-beta practice features. They are NOT marked for deletion.
3. **Static Data Lab Blocks**: Removing the 10 lab types from `src/types/models.ts` before R4 converts `src/data/grammar/*.ts` into JSON will trigger `tsc` errors on existing `discoveryLab` object keys. Implementation must sequence R2 and R4 carefully.

---

## 4. Conclusion

Both Requirement 2 (Dead code & dependencies) and Requirement 6 (Server restructuring) are fully mapped with zero ambiguities. A total of:
- 5 dead npm dependencies to remove (`lucide-react`, `swiper`, `axios`, `autoprefixer`, `@tanstack/react-virtual`).
- 2 plugins to move to `devDependencies` (`@tailwindcss/vite`, `@vitejs/plugin-react`).
- 1 package name fix (`react-example` -> `rongwaps`).
- 8 empty ghost directories to remove.
- 6 phantom stores to remove (with `UserSnapshot` preserved).
- 20+ orphaned component files to remove (`VirtualizedList`, `CollectionListItem`, `aiService`, `GrammarInteractiveHelp`, 10 lab files, etc.).
- 1 unused `@keyframes popIn` / `.anim-pop` to prune in `src/index.css`.
- `server.ts` moved to `server/index.ts` with updated scripts.

---

## 5. Verification Method

To verify the plan during and after implementation:

1. **Typecheck Baseline**:
   ```bash
   npm run typecheck
   ```
   Must exit code 0.
2. **Test Suite Baseline**:
   ```bash
   npm test
   ```
   Must pass all 301 tests (0 failures).
3. **Build Baseline**:
   ```bash
   npm run build
   ```
   Must compile Vite client and esbuild server into `dist/` without errors.
4. **Dead Dependency Check**:
   ```bash
   npm ls --depth=0 lucide-react swiper axios autoprefixer @tanstack/react-virtual
   grep -r "lucide-react\|swiper\|axios" src/ vite.config.ts
   ```
   Must return clean (0 matches in `src/` and `vite.config.ts`).
5. **Ghost Directory Check**:
   ```bash
   find src -type d -empty
   ```
   Must return 0 empty directories.
6. **Server Start Check**:
   ```bash
   npm run dev
   ```
   Must boot server and Vite middleware on port 3000.
