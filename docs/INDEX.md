# RongWaps Docs Index

Single routing table. Read only the row that matches the task. `../AGENTS.md` (core rules) and `../.claude/rules/` (path-scoped rules) load automatically.

## Task Routing

| Task | Read |
| --- | --- |
| Any code change | `../AGENTS.md`, relevant feature code |
| Shared UI / reusable widgets | `../WIDGETS.md`, `DESIGN_TOKENS.md`, `src/lib/widgets/` |
| UI styling & tokens | `DESIGN_TOKENS.md`, `src/index.css` |
| Grammar lessons | `GRAMMAR_LESSON_TEMPLATE.md`, `../DECISIONS.md`, `src/screens/grammar-lesson/` |
| Data model or Supabase RPC | `DATABASE_SCHEMA.md`, `src/services/`, `src/types/database.ts` |
| Flashcard examples & matching | `COURSE_EXAMPLES.md`, `src/services/courseExamplePackService.ts` |
| Server, TTS, grading | `API_SPEC.md`, `server/` |
| Audio & karaoke alignment | `reference/OFFICIAL_AUDIO_SOURCES.md`, `API_SPEC.md`, `src/services/audioService.ts` |
| Character/scene art prompts | `reference/VISUAL_PROMPTS.md` |
| Architectural boundary changes | `ARCHITECTURE.md`, `../AGENTS.md`, `../DECISIONS.md` |
| Past decisions older than 2026-09-22 | `archive/DECISIONS_ARCHIVE.md` |

## Active Docs

- `../README.md` — project overview and local development.
- `../DECISIONS.md` — recent architectural, interaction and design decisions that must stay stable.
- `../WIDGETS.md` — public shared widget catalog mirroring `src/lib/widgets/index.ts`.
- `ARCHITECTURE.md` — source layout, module boundaries, ESLint import restrictions, component ownership.
- `DATABASE_SCHEMA.md` — Supabase schema, tables, RPCs, RLS, pack-first fetch paths.
- `DESIGN_TOKENS.md` — semantic design tokens (radius, tactile depth, shadows, focus rings, colors).
- `API_SPEC.md` — Express API: CDN media streaming, TTS synthesis/cache endpoints, semantic grading.
- `GRAMMAR_LESSON_TEMPLATE.md` — interactive grammar lesson spec and data contracts.
- `COURSE_EXAMPLES.md` — course example sentence packs, runtime matching, OCR export workflow, coverage audit.
- `DEPLOY.md` — deploy checklist: env var names, Supabase dashboard steps, smoke test.

## Reference & Archive (not routed by default)

- `reference/` — long lookup docs, read only when a task names them: `OFFICIAL_AUDIO_SOURCES.md`, `VISUAL_PROMPTS.md`.
- `archive/` — superseded or one-off material: `DECISIONS_ARCHIVE.md`, `REFACTOR_PROMPT.md`.
- `audio_index_book1.json`, `audio_manifest_book1.json` — audio data consumed by `tests/content/officialAudio.test.ts`.

## Generated Artifacts & Scratch Policy

- **Committed packs (`public/data/`)**: `course-examples/`, `decomposition/`, `dictionary/`, `memory-hooks/`, `relations/`, `vocabulary/`, strokes, with hash-versioned `manifest.json`. Regenerate via npm scripts; never hand-edit.
- **Gitignored scratch**: `output/`, `.audit/`, `materials/`, `.agents/`, `dist/`, `.vite/`. Clean with `npm run clean:local`. Never depend on them in code.
