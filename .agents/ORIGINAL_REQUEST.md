# Original User Request

## 2026-09-04T15:35:01Z

RongWaps is a React/TypeScript Chinese-language learning app (Vite + Tailwind CSS v4 + Zustand + Supabase + Express backend) that has accumulated severe documentation bloat, dead dependencies, architectural spaghetti, and code drift from its own stated conventions. The app needs a fresh-foundation cleanup: slash documentation from ~6,500 lines across 43 files down to only what's actively used, remove dead code and dependencies, decompose monolithic files, extract static data from TypeScript, restructure the server, rewrite the agent instructions, and enforce the project's own architectural boundaries — all without breaking the running application.

Working directory: /Users/ronianb.gica/Projects/rongwaps
Integrity mode: demo

## Audit Context (Reference Material for the Team)

The following audit data was gathered from the live codebase. It should inform implementation but the team has freedom to discover additional issues.

### Codebase Scale
- 63,000 lines of TS/TSX across 372 source files
- ~21,000 lines are static grammar/dialogue data embedded as TypeScript
- `dialogueAlignment.ts` alone is 5,053 lines (100KB)
- 46+ source files exceed the project's own 250-line target

### Dead Dependencies (zero imports in src/)
- `lucide-react` — also incorrectly bundled in `vite.config.ts` vendor chunk
- `swiper` — completely unused
- `axios` — AGENTS.md forbids it, zero imports
- `autoprefixer` — unnecessary with Tailwind CSS v4
- `@tanstack/react-virtual` — only imported by orphaned `VirtualizedList.tsx` (zero consumers)

### Dead Code & Ghost Directories
- `src/screens/grammar-quest/` — entirely empty directory with empty `components/` and `hooks/`
- 7 empty lesson folders in `src/screens/grammar-lesson/` (`lesson-one-part-one`, etc.)
- 6 phantom Zustand stores (`useAuthStore`, `useNavigationStore`, `useSrsStore`, `useUiStore`, `useLibraryStore`, `useSyncStore`) — created but **never imported by any component**; `useAppStore` (471 lines) remains the actual monolithic store
- `src/screens/library/VirtualizedList.tsx` — orphaned component, zero imports
- `src/services/aiService.ts` — 12 lines, effectively dead
- 10 unused grammar lab types in `src/types/models.ts` (`GrammarDiscoveryLab`, `GrammarNumberLab`, etc.)

### Documentation Bloat (43 markdown files, ~6,500 lines)
- `AGENTS.md.original.md` (155 lines) and `WIDGETS.md.original.md` (475 lines) — stale backups in root
- `ARCHITECT_LOG.md` (138 lines) — one-time session log from June 2026, never updated
- `WORK_CONTEXT.md` (28 lines) — empty template, never filled in
- `docs/team.md` (197 lines), `docs/PROGRESS_AND_PLANS.md` (82 lines), `docs/ROADMAP.md` (73 lines) — all claimed deleted in CHANGELOG but still present
- `docs/WIDGET_ARCHITECTURE_REFACTOR_PLAN.md` (727 lines) — completed plan, purely archival
- `docs/GRAMMAR_CONVERSATION_QUEST.md` (401 lines) — explicitly marked superseded
- `docs/GRAMMAR_SCREEN_IMPLEMENTATION_PLAN.md` (343 lines), `docs/GRAMMAR_SCREEN_REVIEW_PLAN.md` (401 lines) — finished execution plans
- `docs/LESSON_9_GRAMMAR_PLAN.md` (588 lines) — proposes features that contradict current decisions
- 5 memory-hook pilot docs (688 lines total) — experimental iteration artifacts
- 4 point-in-time audit files (449 lines total)
- `docs/CHANGELOG.md` (50 lines) — last entry July 2026, contains factual errors
- `docs/INDEX.md` — omits 18 of 32 docs, links to deleted files
- `DECISIONS.md` (220 lines) — contains 6 superseded entries inline with active ones
- `.hermes/` and `.openai/` — leftover AI tool configs

### Architecture Violations
- `App.tsx` (431 lines) — manages audio unlock, cloud sync, auth, reader lifecycle, grammar loading
- `audioService.ts` (1,119 lines) — god object handling Web Audio, HTML5 Audio, TTS, Edge TTS, Cache API
- `useCloudSync.ts` (659 lines) — delta sync, queueing, timing, backoff, tombstones all in one hook
- `BookPageViewer.tsx` (688 lines) — viewport scaling, panning, coordinate transforms
- `useQuiz.ts` (496 lines), `useWriting.ts` (363 lines), `useLibrary.ts` (329 lines) — oversized hooks
- Shared widgets violating encapsulation: `SmartSentence.tsx` imports `dictionaryService` and `useAppStore`; `PosBadge.tsx` imports `useAppStore`
- `src/features/character-decomposition/staging/model.ts` (794 lines) imports `node:crypto` inside the browser source tree
- Cross-feature boundary violation: `SingleBreakdownView.tsx` reaches into `character-decomposition` internals
- `package.json` name is still `react-example` from the starter template
- `@tailwindcss/vite` and `@vitejs/plugin-react` are in `dependencies` instead of `devDependencies`
- `src/index.css` contains legacy keyframes for removed screens

### Server
- `server.ts` (355 lines) sits at project root alongside client code
- Express backend serving audio proxy + TTS + static files

## Requirements

### R1. Documentation nuclear cleanup
Delete all stale, superseded, completed-plan, and backup documentation files. The only markdown files that should survive are those that actively describe the current system's behavior, schema, or conventions. Data files (like `audio_index_book1.json`, `audio_manifest_book1.json`) and active reference docs (like `DATABASE_SCHEMA.md`, `DESIGN_TOKENS.md`, `GRAMMAR_LESSON_TEMPLATE.md`) must be preserved. `DECISIONS.md` should be trimmed to only active (non-superseded) decisions. `docs/INDEX.md` must be rewritten to accurately reflect what remains. The `.hermes/` and `.openai/` directories should be removed.

### R2. Dead dependency and dead code removal
Remove all unused npm dependencies and their references in config files. Delete orphaned components, empty directories, phantom store files, unused type definitions, and dead imports. Update `vite.config.ts` to remove references to deleted packages. Move misplaced `devDependencies`. Fix the package name from `react-example`.

### R3. AGENTS.md rewrite
Replace the current `AGENTS.md` with a fresh, accurate set of instructions that reflects the app as it actually is after this cleanup — not aspirational rules that the codebase violates. Remove references to deleted docs. Remove hyper-specific implementation details (exact pixel values for modals, grammar beta flow details). Fix known inaccuracies (mnemonics API claim, scroll container absolutes). Keep it concise and honest.

### R4. Static data extraction
Move the largest static data files out of TypeScript source into JSON format in a content directory (e.g., `content/` or `public/data/`). Priority targets: `dialogueAlignment.ts` (5,053 lines), and the grammar lesson data files in `src/data/grammar/` (~13,500 lines across 21 files). Update the existing import sites to load these as JSON (static import or dynamic `fetch`). The `interactiveGrammarPages.ts` and `interactiveGrammarLessonOnePartTwo.ts` aggregator files should be updated to reference the new locations.

### R5. Monolith decomposition
Break apart the largest monolithic files into focused, single-responsibility modules. Key targets:
- `audioService.ts` (1,119 lines) → separate concerns (playback engine, TTS, caching)
- `useCloudSync.ts` (659 lines) → separate the sync queue logic from the React hook
- `App.tsx` (431 lines) → extract reader lifecycle and grammar loading into dedicated hooks or screen-launcher patterns
- `useAppStore.ts` (471 lines) → either complete the domain store split or clearly document why it's monolithic
- `src/types/models.ts` (712 lines) → split grammar types into their own file, prune dead lab types
- Fix shared widget encapsulation violations (`SmartSentence.tsx`, `PosBadge.tsx`) so they accept data through props instead of importing services and stores directly
- Move `staging/` and `sources/` directories out of `src/features/character-decomposition/` into `scripts/` since they import Node.js APIs

### R6. Server restructuring
Move `server.ts` from the project root into a `server/` directory with appropriate structure. The Express backend should be cleanly separated from the client source tree.

### R7. Build and runtime verification
After all changes, the application must build successfully (`npm run build`), the development server must start without errors (`npm run dev`), and all existing tests must pass (`npm test`). No regressions in the working application.

## Acceptance Criteria

### Documentation
- [ ] Total markdown files in root + docs/ combined ≤ 12 (excluding README)
- [ ] No `.original.md` backup files exist anywhere in the project
- [ ] No files exist that were claimed deleted in CHANGELOG.md (`team.md`, `PROGRESS_AND_PLANS.md`, `ARCHITECT_LOG.md`)
- [ ] `docs/INDEX.md` lists every surviving doc file and links are all valid
- [ ] `DECISIONS.md` contains zero entries marked "superseded"
- [ ] `.hermes/` and `.openai/` directories do not exist

### Dependencies & Dead Code
- [ ] `npm ls lucide-react swiper axios autoprefixer @tanstack/react-virtual` all return "not found" / missing
- [ ] `grep -r "lucide-react\|swiper\|axios" src/ vite.config.ts` returns zero matches
- [ ] No empty directories exist under `src/screens/` or `src/features/`
- [ ] The 6 phantom store files (`useAuthStore`, `useNavigationStore`, `useSrsStore`, `useUiStore`, `useLibraryStore`, `useSyncStore`) are either deleted or properly integrated (imported by ≥1 component each)
- [ ] `package.json` name is not `react-example`
- [ ] `@tailwindcss/vite` and `@vitejs/plugin-react` are in `devDependencies`

### AGENTS.md
- [ ] `AGENTS.md` does not reference any deleted documentation files
- [ ] `AGENTS.md` does not contain exact pixel values or implementation-specific modal sizing rules
- [ ] `AGENTS.md` does not claim mnemonics are documented in `API_SPEC.md`

### Static Data
- [ ] `src/data/dialogueAlignment.ts` no longer exists as a TypeScript source file (data moved to JSON)
- [ ] Grammar lesson data files (`src/data/grammar/lesson*.ts`) are either converted to JSON or significantly reduced in line count
- [ ] All JSON data files are loadable at runtime without errors

### Code Quality
- [ ] `src/App.tsx` is under 250 lines
- [ ] `src/services/audioService.ts` is under 400 lines (with concerns split into sub-modules)
- [ ] No file in `src/lib/widgets/` directly imports from `src/services/` or `src/store/`
- [ ] `src/types/models.ts` is under 300 lines
- [ ] No file under `src/` (excluding `scripts/` or `tools/`) imports `node:crypto` or other Node.js built-in modules

### Server
- [ ] `server.ts` does not exist at the project root
- [ ] A `server/` directory contains the Express backend code

### Build & Tests
- [ ] `npm run build` exits with code 0
- [ ] `npm run dev` starts without errors (verified by checking the process starts and serves)
- [ ] `npm test` passes all existing tests (allowance for tests that reference moved/deleted files to be updated accordingly)

---
*Expecting this to run as a full multi-part project with documentation, dependency, architecture, and data extraction work streams.*
