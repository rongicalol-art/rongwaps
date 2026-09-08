# Handoff Report: Milestone 2 — Dead Dependencies & Dead Code Removal (R2) & Server Restructuring (R6)

**Agent Identity**: worker_m2  
**Roles**: implementer, qa, specialist  
**Date**: 2026-09-04T16:16:30Z  
**Parent Orchestrator Conversation ID**: 3c2faab7-8d44-4972-82e9-ff93d6a3845b  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

1. **Dead Dependencies & Configuration Cleanup**:
   - `package.json`:
     - Removed dead dependencies: `"lucide-react"`, `"swiper"`, `"axios"`, `"autoprefixer"`, `"@tanstack/react-virtual"`.
     - Moved `"@tailwindcss/vite"` (`^4.1.14`) and `"@vitejs/plugin-react"` (`^5.0.4`) from `"dependencies"` to `"devDependencies"`.
     - Renamed package `"name"` from `"react-example"` to `"rongwaps"`.
     - Updated scripts: `"dev": "tsx server/index.ts"`, `"server": "tsx server/index.ts"`, `"build:server": "esbuild server/index.ts --platform=node --bundle --outfile=dist/server.js --format=esm --packages=external --external:express --external:@supabase/supabase-js --external:dotenv --external:cors"`, `"build": "vite build && npm run build:server"`, `"lint": "eslint src tests server/index.ts vite.config.ts --max-warnings=0"`.
   - `vite.config.ts`:
     - Removed `'lucide-react'` from `manualChunks.vendor`, leaving `vendor: ['react', 'react-dom', 'motion']`.
   - `npm install`: Ran cleanly, removing 9 packages and updating `package-lock.json`.
   - `npm ls --depth=0 lucide-react swiper axios autoprefixer @tanstack/react-virtual`: Returned `(empty)`.
   - `grep -r "lucide-react\|swiper\|axios" src/ vite.config.ts`: Returned 0 matches (exit code 1).

2. **Ghost Directories**:
   - Deleted:
     - `src/screens/grammar-quest/components`
     - `src/screens/grammar-quest/hooks`
     - `src/screens/grammar-quest`
     - `src/screens/grammar-lesson/lesson-one-part-one`
     - `src/screens/grammar-lesson/lesson-one-part-two`
     - `src/screens/grammar-lesson/lesson-two-part-one`
     - `src/screens/grammar-lesson/lesson-two-part-two`
     - `src/screens/grammar-lesson/lesson-five-part-two`
     - `src/screens/grammar-lesson/lesson-eleven-part-one`
     - `src/screens/grammar-lesson/lesson-fourteen-part-one`
   - `find src -type d -empty`: Returned 0 empty directories.

3. **Phantom Stores & Store Interface**:
   - Inlined and exported `UserSnapshot` in `src/store/useAppStore.ts`:
     ```typescript
     export interface UserSnapshot {
       id: string;
       email?: string;
       name?: string;
       avatar_url?: string;
       fullName?: string;
       avatarUrl?: string;
     }
     ```
   - Removed `import type { UserSnapshot } from './useAuthStore';` and `export type { UserSnapshot } from './useAuthStore';` from `src/store/useAppStore.ts`.
   - Removed the 6 store re-exports (`useAuthStore`, `useNavigationStore`, `useSrsStore`, `useUiStore`, `useLibraryStore`, `useSyncStore`) from `src/store/useAppStore.ts`.
   - Deleted the 6 phantom store files:
     - `src/store/useAuthStore.ts`
     - `src/store/useNavigationStore.ts`
     - `src/store/useSrsStore.ts`
     - `src/store/useUiStore.ts`
     - `src/store/useLibraryStore.ts`
     - `src/store/useSyncStore.ts`
   - Verified remaining active stores in `src/store/`: `useAppStore.ts`, `useGrammarLessonStore.ts`, `usePracticePreferencesStore.ts`.

4. **Orphaned Components & Dead Code**:
   - Deleted `src/screens/library/VirtualizedList.tsx`, `src/screens/library/CollectionListItem.tsx`, and `src/screens/library/components/LibraryContinueCard.tsx`.
   - Added aliases `getMnemonic` and `saveMnemonic` to `src/services/mnemonicCache.ts`.
   - Updated imports from `aiService` to `mnemonicCache` in:
     - `src/features/character-memory-hooks/MemoryHookCharacter.tsx`
     - `src/features/practice/components/BreakdownExpandPanel.tsx`
     - `src/screens/debug/DebugWindow.tsx`
   - Deleted `src/services/aiService.ts`.
   - In `src/index.css`: Removed `@keyframes popIn` and `.anim-pop` class.

5. **Server Restructuring**:
   - Created directory `server/`.
   - Moved `server.ts` to `server/index.ts`. Confirmed `server.ts` does not exist at project root.
   - Updated import in `server/index.ts`: `import { supabase } from "../src/services/supabaseClient.js";`.
   - Made server port configurable: `const PORT = Number(process.env.PORT) || 3000;`.
   - Updated references to `server/index.ts` in `src/services/supabaseClient.ts` comments and `README.md`.

---

## 2. Logic Chain

1. **Dependency Safety**:
   - Removing `VirtualizedList.tsx` removed the only file importing `@tanstack/react-virtual`.
   - None of `lucide-react`, `swiper`, `axios`, or `autoprefixer` had any imports in `src/`.
   - Removing them from `package.json`, clearing `'lucide-react'` from `manualChunks.vendor` in `vite.config.ts`, and moving Vite plugins to `devDependencies` caused zero breakage to the build or runtime while eliminating dead dependencies.
2. **Store Decoupling**:
   - The 6 stores in `src/store/` were phantom stores not imported by any screen or component.
   - `UserSnapshot` was only defined in `useAuthStore.ts` and imported by `useAppStore.ts` and `useAuth.ts`. Relocating `UserSnapshot` into `useAppStore.ts` allowed safely deleting all 6 phantom files without breaking `useAuth.ts` or `useAppStore.ts`.
3. **Mnemonic Consolidation**:
   - `aiService.ts` was merely a 7-line re-export wrapper around `mnemonicCache.ts`. Changing the 3 consuming files to import directly from `mnemonicCache.ts` allowed the complete deletion of `aiService.ts` with zero behavior change.
4. **Server Isolation**:
   - Relocating root `server.ts` to `server/index.ts` cleanly isolates backend Express code from root and client tree.
   - Using `../src/services/supabaseClient.js` correctly resolves the Supabase client from within `server/`.
   - All server filesystem lookups rely on `process.cwd()`, ensuring consistent path resolution when started from the project root.

---

## 3. Caveats

1. **Transitive `axios` in `msedge-tts`**:
   - Although `axios` is removed as a direct dependency from `package.json` (`npm ls --depth=0 axios` is empty), `msedge-tts` retains an internal dependency on `axios@^1.11.0` in its own nested `node_modules`. This is external to RongWaps source code and complies with project requirements.
2. **Post-Beta Exercise Components**:
   - Dormant grammar exercises (`GrammarExercisePage`, `DragBlankExercise`, etc.) remain intact as required by `AGENTS.md` for post-beta practice releases.
3. **Port In Use in Dev Mode**:
   - When running `npm run dev`, if port 3000 is occupied by a background process, `PORT=<port> npm run dev` can be specified.

---

## 4. Conclusion

Milestone 2 objectives have been 100% completed without regressions:
- 5 dead npm packages removed; Vite plugins moved to devDependencies; package renamed to `rongwaps`.
- 10 empty ghost directories deleted (0 empty directories in `src/`).
- 6 phantom stores purged, `UserSnapshot` cleanly inlined into `useAppStore.ts`.
- Orphaned library components, `aiService.ts`, and legacy CSS keyframes pruned.
- Express backend relocated to `server/index.ts` with updated build and dev scripts.
- All 9 acceptance criteria for dependencies and server pass strictly with 0 failures and 0 skips.

---

## 5. Verification Method

Independent reproduction and verification commands:

1. **Dead Dependencies**:
   ```bash
   npm ls --depth=0 lucide-react swiper axios autoprefixer @tanstack/react-virtual
   # Must return (empty)
   grep -r "lucide-react\|swiper\|axios" src/ vite.config.ts
   # Must return 0 matches (exit code 1)
   ```

2. **Ghost Directories**:
   ```bash
   find src -type d -empty
   # Must return 0 lines
   ```

3. **Server Location**:
   ```bash
   test ! -f server.ts && test -f server/index.ts && echo "PASS: server.ts moved"
   ```

4. **Linting (0 errors, 0 warnings)**:
   ```bash
   npm run lint
   ```

5. **Typecheck (0 errors)**:
   ```bash
   npm run typecheck
   ```

6. **Unit & Integration Tests**:
   ```bash
   npm test
   # 343 pass, 0 fail
   ```

7. **Strict Acceptance Test Suites (R2 & R6)**:
   ```bash
   ACCEPTANCE_STRICT=true npx tsx --test tests/acceptance/dependencies.test.ts tests/acceptance/server.test.ts
   # 9 pass, 0 fail, 0 skipped
   ```

8. **Production Build**:
   ```bash
   npm run build
   # Produces dist/ and dist/server.js cleanly
   ```
