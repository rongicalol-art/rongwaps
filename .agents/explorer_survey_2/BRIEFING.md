# BRIEFING — 2026-09-04T15:47:30Z

## Mission
Technical investigation and actionable plan for R2 (dead dependencies, dead code, ghost dirs, phantom stores, configs) and R6 (server restructuring).

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, investigation, synthesis
- Working directory: /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_2
- Original parent: 3c2faab7-8d44-4972-82e9-ff93d6a3845b
- Milestone: Fresh-foundation survey (R2 & R6)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Write only to /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_2/
- All findings backed by verified evidence (exact file paths, line numbers, command outputs)
- Send message to parent at completion

## Current Parent
- Conversation ID: 3c2faab7-8d44-4972-82e9-ff93d6a3845b
- Updated: 2026-09-04T15:45:29Z

## Investigation State
- **Explored paths**: `package.json`, `vite.config.ts`, `server.ts`, `src/store/*`, `src/screens/grammar-quest/`, `src/screens/grammar-lesson/`, `src/screens/library/`, `src/services/aiService.ts`, `src/types/models.ts`, `src/index.css`
- **Key findings**:
  - 5 dead deps identified: `lucide-react`, `swiper`, `axios`, `autoprefixer`, `@tanstack/react-virtual`.
  - 2 misplaced devDeps: `@tailwindcss/vite`, `@vitejs/plugin-react`.
  - 8 ghost dirs confirmed empty (grammar-quest and 7 lesson dirs).
  - 6 phantom stores have 0 consumers. `UserSnapshot` in `useAuthStore.ts` must be preserved in `useAppStore.ts`.
  - Orphaned components: `VirtualizedList.tsx`, `CollectionListItem.tsx`, `aiService.ts`, `GrammarInteractiveHelp.tsx`, 10 lab components in `experiences/`, `SentenceSpine.tsx`, `GrammarLabShell.tsx`, `GrammarHelpDisclosure.tsx`, plus 6 additional orphaned screen components.
  - Server restructuring: move `server.ts` to `server/index.ts`, update relative import to `supabaseClient`, update `package.json` scripts (`dev`, `build`, `lint`).
- **Unexplored areas**: None. Audit is complete across all specified scopes.

## Key Decisions Made
- Formulated complete 10-step execution plan for R2 and R6.
- Flagged critical dependency between pruning 10 lab types in `src/types/models.ts` and static data extraction (R4).

## Artifact Index
- DISPATCH.md — incoming instructions and status check from parent
- BRIEFING.md — persistent working memory
- progress.md — liveness heartbeat
- survey_report.md — detailed findings, evidence chains, and 10-step execution plan
- handoff.md — 5-component handoff report
