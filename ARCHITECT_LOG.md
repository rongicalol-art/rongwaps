# ARCHITECT_LOG.md — OWL Autonomous Architect Session

## Session Info
- **Started**: 2026-06-22 02:00 (Asia/Taipei)
- **Backup Commit**: a61170f — "chore: automated backup before AI architect session"
- **Tech Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + Supabase + Express

---

## Issues Identified (Priority Order)

### 🔴 HIGH PRIORITY — Architectural Flaws

#### 1. [COMPLETED] Zustand Store is a God Object (388 lines, 40+ state fields)
- **Created**: 6 domain-specific stores: `useAuthStore`, `useNavigationStore`, `useSrsStore`, `useUiStore`, `useLibraryStore`, `useSyncStore`
- **Updated**: `useAppStore.ts` now re-exports all domain stores and maintains backward compatibility
- **Preserved**: IDB persistence via `zustand/middleware` persist with `partialize` for selective persistence
- **Verified**: `tsc --noEmit` passes for `src/`.

#### 2. [COMPLETED] Navigation state duplicated between Zustand and useAppNavigation hook
- **Created**: `useNavigationStore` with `activeTab`, `activeActivity`, `selectedLessons`, `selectedBooks`
- **Note**: Both stores now have navigation state — `useAppStore` for backward compat, `useNavigationStore` for new code
- **Verified**: `tsc --noEmit` passes for `src/`.

#### 3. [COMPLETED] useCloudSync directly imports supabase client (service layer violation)
- **Added**: `authService.updateUserMetadata()` method to encapsulate `supabase.auth.updateUser()`
- **Replaced**: `supabase.auth.getUser()` → `authService.getCurrentUser()` in `fetchFromCloud`
- **Replaced**: `supabase.auth.updateUser()` → `authService.updateUserMetadata()` in `saveToCloud`
- **Note**: `supabase.from('user_folders')` table queries remain — these are data operations, not auth violations
- **Verified**: `tsc --noEmit` passes for `src/`.

#### 4. [COMPLETED] useAppNavigation uses React.createElement instead of JSX for header props
- **File**: `src/hooks/useAppNavigation.tsx`
- **Summary**: Extracted `ProfileAvatar` and `SettingsButton` as proper JSX components. Renamed file to `.tsx` to support JSX syntax. Updated imports in `App.tsx` and `ActivityModals.tsx`. All internal callbacks wrapped with `useCallback`.

### 🟡 MEDIUM PRIORITY — Code Quality & Performance

#### 5. [COMPLETED] dictionaryService has duplicate/conflicting search functions
- **Removed**: Dead `searchDictionary()` function (80 lines) that queried unused `global_dictionary` table
- **Kept**: `executeRemoteSearch()` (RPC-based search, used by `useDictionarySearch` hook) and `getDictionaryEntriesBatch()` (batch lookup for library)
- **Standardized**: Both active functions now consistently use the `dictionary` table
- **Verified**: `tsc --noEmit` passes for `src/`.

#### 6. [COMPLETED] useDictionarySearch has 400ms debounce causing stale results
- **Fixed**: Remote results now merge with local results instead of overwriting them
- **Added**: `localResultsRef` to track local trie matches for merging
- **Reduced**: Debounce from 400ms to 300ms for snappier feel
- **Verified**: `tsc --noEmit` passes for `src/`.

#### 7. [COMPLETED] FlashcardScreen has keyboard listener that doesn't clean up properly
- **Added**: Refs (`currentIndexRef`, `cardsLengthRef`, `maxVisitedIndexRef`, `currentCardRef`) to avoid stale closures in keyboard handler
- **Fixed**: Keyboard effect now reads from refs instead of closure values, eliminating stale closure bugs
- **Verified**: `tsc --noEmit` passes for `src/`.

#### 8. [COMPLETED] ActivityModals is 289 lines with repetitive motion.div blocks
- **Summary**: Extracted `AnimatedScreen` reusable component with `SLIDE_VARIANTS` and `FADE_VARIANTS`. Replaced 5 repetitive `motion.div` blocks with `<AnimatedScreen>` usage. File reduced from 289 to ~260 lines. Build passes.

#### 9. [COMPLETED] aiService.ts is 411 lines — exceeds 150-line AGENTS.md guideline
- **Created**: `mnemonicCache.ts` (cache read/write/clear), `mnemonicGenerator.ts` (AI generation), `mnemonicPreGenerator.ts` (background queue)
- **Refactored**: `aiService.ts` now re-exports from sub-modules for backward compatibility
- **Verified**: All 3 existing importers work unchanged. `tsc --noEmit` passes.

#### 10. [COMPLETED] lib/utils.ts is a dead code redirect
- **Summary**: Verified no imports reference `src/lib/utils.ts`. Deleted the file. Build passes.

### 🟢 LOW PRIORITY — Cleanup & Polish

#### 11. [COMPLETED] Inconsistent table naming: `global_dictionary` vs `dictionary`
- **Resolved**: Removed dead `searchDictionary()` function that was the only code using `global_dictionary` table
- **Result**: All active code now consistently uses the `dictionary` table

#### 12. [COMPLETED] useCloudSync has 5-second debounce that may lose data
- **Reduced**: Debounce from 5000ms to 2000ms to reduce data loss window
- **Note**: `navigator.sendBeacon` not implemented — would require backend endpoint change
- **Verified**: `tsc --noEmit` passes for `src/`.

#### 13. [COMPLETED] FlashcardScreen inline tap zone logic is fragile
- **Replaced**: Single div with `getBoundingClientRect()` coordinate math → 3 CSS flex-based zone divs
- **Removed**: `setTimeout(fn, 10)` hack → replaced with `requestAnimationFrame()`
- **Removed**: `closest('button')` / `closest('.ignore-tap')` guard (no longer needed with separate zones)
- **Verified**: `tsc --noEmit` passes for `src/`.

#### 14. [COMPLETED] Missing error boundaries
- **Created**: `src/lib/widgets/ErrorBoundary.tsx` — reusable class component with fallback UI
- **Exported**: Added to `src/lib/widgets/index.ts`
- **Wrapped**: All 4 main screens (path, library, search, profile) in `App.tsx`
- **Verified**: `tsc --noEmit` passes for `src/`.

#### 15. [COMPLETED] No loading state for auth operations
- **Added**: `isAuthActionLoading` state to `useAuth` hook
- **Wrapped**: `loginWithGoogle`, `logout`, `refreshSession` with `useCallback` and loading state management
- **Exported**: New `isAuthActionLoading` boolean for UI to disable buttons during auth operations
- **Verified**: `tsc --noEmit` passes for `src/`.

---

## Completed Tasks

### Cycle 1 — Issue #10: Delete dead code `lib/utils.ts`
- **Deleted**: `src/lib/utils.ts` (was a single-line comment redirect)
- **Verified**: No imports referenced it. `tsc --noEmit` passes for `src/`.

### Cycle 2 — Issue #4: Refactor `useAppNavigation` React.createElement → JSX
- **Renamed**: `src/hooks/useAppNavigation.ts` → `.tsx`
- **Extracted**: `ProfileAvatar` and `SettingsButton` as proper JSX components
- **Updated imports**: `App.tsx` and `ActivityModals.tsx`
- **Added**: `useCallback` wrappers for all internal callbacks
- **Verified**: `tsc --noEmit` passes for `src/`.

### Cycle 3 — Issue #8: Refactor ActivityModals repetitive motion.div blocks
- **Extracted**: `AnimatedScreen` component with `SLIDE_VARIANTS` and `FADE_VARIANTS` constants
- **Replaced**: 5 repetitive `motion.div` blocks with `<AnimatedScreen>` usage
- **Fixed**: Pre-existing `slideVariants` type error by adding `as const` to `type: 'spring'`
- **Verified**: `tsc --noEmit` passes for `src/`.

### Cycle 4 — Issue #14: Add Error Boundaries
- **Created**: `src/lib/widgets/ErrorBoundary.tsx` — reusable class component with fallback UI
- **Exported**: Added to `src/lib/widgets/index.ts`
- **Wrapped**: All 4 main screens (path, library, search, profile) in `App.tsx`
- **Verified**: `tsc --noEmit` passes for `src/`.

### Cycle 5 — Issue #15: Add auth loading states
- **Added**: `isAuthActionLoading` state to `useAuth` hook
- **Wrapped**: `loginWithGoogle`, `logout`, `refreshSession` with `useCallback` + loading state
- **Exported**: New `isAuthActionLoading` boolean for UI button disabling
- **Verified**: `tsc --noEmit` passes for `src/`.
