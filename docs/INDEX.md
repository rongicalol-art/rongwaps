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
- `API_SPEC.md` — Express backend API specification for media streaming proxy endpoints (`/api/audio/*`).

## Curriculum & Feature Specifications

- `GRAMMAR_LESSON_TEMPLATE.md` — Specification for interactive grammar lessons, data contracts, supported exercises, and plain-English guidelines.
- `COURSE_EXAMPLES.md` — Specification for course example sentence packs, runtime matching, and OCR export workflow.
- `../WIDGETS.md` — Public shared widget catalog mirroring `src/lib/widgets/index.ts`.
- `OFFICIAL_AUDIO_SOURCES.md` — Modern Chinese official audio sources, track mapping (`B1-LL-P-T`), karaoke alignment pipeline, and audio caching.
- `LESSON_15_16_SOURCES.md` — Modern Chinese Book 1 Lessons 15 & 16 curriculum, dialogue/reading transcripts, vocabularies, grammar points, and online source index.

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
