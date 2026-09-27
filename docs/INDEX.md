# RongWaps Docs Index

Use this file to locate active system documentation. All listed documents are actively maintained and accurately reflect current application behavior, schema, or conventions.

## Read First & Core Directives

- `../AGENTS.md` — Core instructions, architecture boundaries, and conventions for coding agents.
- `../README.md` — Project overview, architecture summary, and local development commands.
- `../DECISIONS.md` — Active architectural, interaction, and design decisions that must remain stable.

## Architecture & Data Contracts

- `ARCHITECTURE.md` — Source folder layout, module boundaries, ESLint import restrictions, and component ownership.
- `DATABASE_SCHEMA.md` — Supabase database schema, tables, RPCs, RLS policies, and pack-first fetch paths.
- `DESIGN_TOKENS.md` — Semantic design tokens (border radius, tactile depth, ambient shadows, focus rings, and colors).
- `API_SPEC.md` — Express backend API specification: the `/api/audio/*` media proxy plus the neural TTS synthesis and cache endpoints (`/api/tts`, `/api/tts-cache/:text`, `/api/tts/:voice/*`), with their rate limits and auth contract.

## Curriculum & Feature Specifications

- `GRAMMAR_LESSON_TEMPLATE.md` — Specification for interactive grammar lessons, data contracts, supported exercises, and plain-English guidelines.
- `COURSE_EXAMPLES.md` — Specification for course example sentence packs, runtime matching, the OCR export workflow, and the Book 1 reading-coverage audit with authored practice sentences.
- `../WIDGETS.md` — Public shared widget catalog mirroring `src/lib/widgets/index.ts`.
- `OFFICIAL_AUDIO_SOURCES.md` — Modern Chinese official audio sources, track mapping (`B1-LL-P-T`), karaoke alignment pipeline, audio caching, the Lessons 15–16 curriculum/transcript appendix, and the Book 1 reading curriculum audit (part mapping, grammar targets, vocabulary coverage).
- `VISUAL_PROMPTS.md` — Locked Master Character Visual DNA, character design sheets and avatar portraits, plus dialogue and reading scene composition prompts.

## Generated Artifacts & Scratch Policy

- **Committed Pack Artifacts (`public/data/`)**: Static pre-indexed JSON packs (`course-examples/`, `decomposition/`, `dictionary/`, `memory-hooks/`, `sound-hooks/`, `vocabulary/`) and their hash-versioned `manifest.json` files are intentionally committed for pack-first offline/PWA delivery without remote database round-trips.
- **Regenerable Scratch Artifacts (Gitignored)**: `output/` (pipeline staging, model audits, gate logs), `.audit/` (run logs), `dist/` (client and server production bundles), and `.vite/` (Vite dev cache) are strictly regenerable and cleaned locally via `npm run clean:local`.

## Task Routing

| Task | Read |
| --- | --- |
| Any code change | `../AGENTS.md`, relevant feature code |
| Shared UI / reusable widgets | `../WIDGETS.md`, `DESIGN_TOKENS.md`, `src/lib/widgets/` |
| UI styling & tokens | `DESIGN_TOKENS.md`, `src/index.css` |
| Grammar lessons | `GRAMMAR_LESSON_TEMPLATE.md`, `../DECISIONS.md`, `src/screens/grammar-lesson/` |
| Data model or Supabase RPC | `DATABASE_SCHEMA.md`, `src/services/`, `src/types/database.ts` |
| Flashcard examples & matching | `COURSE_EXAMPLES.md`, `src/services/courseExamplePackService.ts` |
| Audio & karaoke alignment | `OFFICIAL_AUDIO_SOURCES.md`, `API_SPEC.md`, `src/services/audioService.ts` |
| Architectural boundary changes | `ARCHITECTURE.md`, `../AGENTS.md`, `../DECISIONS.md` |
