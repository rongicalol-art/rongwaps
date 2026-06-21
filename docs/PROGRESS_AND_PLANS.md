# Development Progress & Data Plans

# Development Progress Log

- [x] Initialized Supabase integration
- [x] Installed @supabase/supabase-js
- [x] Configured environment variables in .env.example
- [x] Created /src/lib/supabaseClient.ts
- [x] Created /src/services/vocabularyService.ts
- [x] Modified /src/hooks/useFlashcards.ts to fetch data from Supabase
- [x] Fixed incorrect import path in /src/services/vocabularyService.ts
- [x] Parsed tags in vocabularyService.ts to extract book and lesson IDs
- [x] Added debug logging to vocabularyService.ts
- [x] Fixed 'Unexpected end of JSON input' error by handling empty tag strings
- [x] Updated vocabularyService to extract Book & Lesson from actual string ID (e.g., 'B1L01-1-03')
- [x] Connected Listening, Writing, Quiz, and Flashcard views directly to Supabase via hooks
- [x] Added and implemented robust Loading States across all app screens for asynchronous data fetching
- [x] Added "Lesson 0" to the library to support B1L00 terminology
- [x] Switched global vocabulary fetching to use Traditional Chinese as primary character set, falling back to Simplified
- [x] Separated Lesson 0 out into a distinct "The Basics" Starter guide element in the Curriculum Library with Duolingo iOS patterns
- [x] Toned down the Lesson 0 UI to be a compact, less distracting "checkpoint" style node
- [x] Renamed "Must Read" to "Introduction" and removed selection indicator from Lesson 0 node
- [x] Fixed Lesson 0 UI to match active book theme colors
- [x] Refined Lesson 0 UI components to match standard lesson style, added mount/exit animations for book switching
- [x] Optimized Lesson 0 performance/animations and unified typography with standard lessons
- [x] Removed animations from Lesson 0 for performance optimization
- [x] Set up Supabase Services architecture (`types`, `services`, `utils/cache.ts`)
- [x] Defined caching strategy in `DATA_ARCHITECTURE.md` and `AGENTS.md`
- [x] Updated `CharacterBreakdown.tsx` to retrieve live data from `breakdownService` with loading and empty states
- [x] Redesigned `CharacterBreakdown` layout to introduce a dynamic `CreativeDecomposition` visualizer that visualizes structural Chinese components
- [x] Simplified visualizer: removed redundant labels ("Structural Layout", "Parts") and simplified multi-part structures into a clean `[A] + [B] = [C]` scrolling view
- [x] Added support for multi-character words seamlessly mapping characters vertically inside the Breakdown view
- [x] Increased generic modal/drawer `BottomDrawer` size boundaries layout across the UI
- [x] Added `audioService.ts` for dynamic prefetching and in-memory caching of Vocabulary audio from remote cloud buckets
- [x] Integrated auto-play audio in `FlashcardScreen` when flipping cards and when assigning difficulty, ensuring efficient audio element re-use
- [x] Updated `audioService` to fetch direct `.mp3` files via the database `audio` column and `getPublicUrl` so playback properly points to `vocabulary-audio` bucket
- [x] Optimized audio preloading to resolve main-thread JavaScript lagging by utilizing HTTP `fetch` to push data into browser cache, only `await`ing the first 3 files during the Loading screen to guarantee snap playback of the first card, delegating the rest to non-blocking background logic.
- [x] Fixed flashcard responsive sizing: increased max-width for tablet view, dynamically scaled down Chinese character font sizes based on string length, and slightly reduced definition font sizes for cleaner composition.
- [x] Improved responsive and dynamic character sizing across Flashcards and Quizzes to better support longer string lengths.
- [x] Completely rewrote `AudioService` to fix playback delays and iOS blockage: switched to a global unified `HTMLAudioElement` cache using `URL.createObjectURL(blob)`, unlocked playback intelligently on first tap, and added playback rate logic.
- [x] Rewrote the audio playback logic to use native HTML `Audio().load()` for fire-and-forget preloading, dropping the JavaScript-heavy `fetch()` blob conversions to drastically simplify the implementation and eliminate main-thread lag.
- [x] Fixed issue where the next flashcard flipped accidentally due to tap events firing immediately after swipe release, and removed post-swipe re-play of audio.
- [x] Repositioned the total cards indicator (e.g. 1/20) inside the `ScreenHeader` widget to comfortably sit alongside the Settings button.
- [x] Generalised the Settings button to natively exist inside `ScreenHeader`, so it automatically displays across all learning modes (Flashcards, Quiz, Listening, etc.) without hardcoding in individual screens.


# Supabase Data Integration Plan

This document outlines the strategy for migrating and integrating the two new datasets `character_breakdowns` and `global_dictionary` from Supabase into our application.

## 1. Database Services Layer (`src/services/`)
- Create dedicated API wrappers to fetch from Supabase.
- `getCharacterBreakdown(char: string)`: Queries `character_breakdowns`.
- `getDictionaryEntry(word: string)`: Queries `global_dictionary` checking both traditional and simplified columns.
- Ensure strict TypeScript typing for the Supabase responses based on our recent database inspection.

## 2. Character Breakdown Refactor
- **Target**: `src/lib/widgets/CharacterBreakdown.tsx`
- **Current State**: Uses local static mock data (`SAMPLE_BREAKDOWNS`).
- **Action**: 
  - Update the component to fetch data asynchronously via our new service.
  - Implement a polished `LoadingState` (e.g., a skeleton loader matching the Duolingo aesthetic) and `ErrorState` for when a character isn't found in the database.

## 3. Global Dictionary Implementation (New Feature)
- **Target**: Reading/Practice screens.
- **Action**: 
  - Build a new `DictionaryModal` or bottom-sheet widget.
  - Allow users to tap on unknown words during sentences/flashcards to trigger a dictionary lookup.
  - Display the comprehensive data: Simplified/Traditional forms, multiple Pinyin pronunciations, and specific definitions mapped to each pronunciation.

## 4. State Management & Caching
- **Target**: `src/store/useAppStore.ts` or a new atomic cache feature.
- **Action**:
  - Since characters like "我", "的", and "是" will be queried frequently, we must cache results locally in memory after the first fetch.
  - This prevents unnecessary network requests, saves database bandwidth, and keeps the UI feeling instantaneous.

## 5. Cleanup and Verification
- **Target**: `src/data/breakdowns.ts`
- **Action**: 
  - Remove all redundant, hardcoded `SAMPLE_BREAKDOWNS` to reduce our overall bundle size, keeping only a tiny subset if needed for fallback/offline testing.
  - Test edge cases (e.g., querying characters that don't exist in Supabase).
