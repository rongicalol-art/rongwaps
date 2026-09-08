# Dispatch for Explorer Survey 2

## 2026-09-04T15:36:55Z

You are explorer_survey_2 for the RongWaps fresh-foundation cleanup project.
Your identity: explorer_survey_2
Your working directory: /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_2
Authoritative request: /Users/ronianb.gica/Projects/rongwaps/.agents/ORIGINAL_REQUEST.md
Your parent orchestrator conversation ID: 3c2faab7-8d44-4972-82e9-ff93d6a3845b

Your mission is technical investigation and planning for:
- Requirement 2 (R2): Dead dependency and dead code removal (lucide-react, swiper, axios, autoprefixer, @tanstack/react-virtual, orphaned components, phantom stores, clean package.json & vite.config.ts)
- Requirement 6 (R6): Server restructuring (server.ts moved to server/ directory cleanly)

Specifically:
1. Audit dependencies in `package.json` and `vite.config.ts`:
   - Search for all imports/references of `lucide-react`, `swiper`, `axios`, `autoprefixer`, `@tanstack/react-virtual` in `src/` and `vite.config.ts`.
   - Check placement of `@tailwindcss/vite` and `@vitejs/plugin-react` (move to devDependencies).
   - Check package name (change from `react-example` to `rongwaps`).
2. Audit ghost directories:
   - Verify `src/screens/grammar-quest/` and empty lesson folders in `src/screens/grammar-lesson/` (`lesson-one-part-one`, etc.). Find any other empty directories under `src/screens/` or `src/features/`.
3. Audit phantom stores:
   - Check `src/store/`: examine `useAuthStore`, `useNavigationStore`, `useSrsStore`, `useUiStore`, `useLibraryStore`, `useSyncStore`. Verify whether any component in `src/` imports them. Check how `useAppStore` is used.
4. Audit orphaned components and dead code:
   - Check `src/screens/library/VirtualizedList.tsx`, `src/services/aiService.ts`.
   - Check dead types in `src/types/models.ts` (e.g., `GrammarDiscoveryLab`, `GrammarNumberLab`, etc.).
   - Check legacy keyframes in `src/index.css`.
5. Audit `server.ts`:
   - Inspect `server.ts` at root (lines, dependencies, routes, static file serving).
   - Check `package.json` scripts referencing `server.ts`.
   - Plan moving `server.ts` to `server/index.ts` or `server/server.ts`, and update scripts (`server`, `dev:all`, etc.).
6. Formulate a concrete, step-by-step removal and restructuring plan for R2 and R6.

Write your comprehensive findings to `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_2/survey_report.md` and summarize in `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_2/handoff.md`.
Update your `progress.md` with timestamps as you work.
When complete, notify parent (conversation ID 3c2faab7-8d44-4972-82e9-ff93d6a3845b) using send_message.

## 2026-09-04T15:45:29Z

**Context**: Survey Phase for R2 (Dead deps & code) and R6 (Server restructuring)
**Content**: Checking in on your progress. How is the investigation going?
**Action**: Please provide a quick status update or completion report when ready.
