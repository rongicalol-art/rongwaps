# Ron's Mandarin Docs Index

Single routing table. Read only the row that matches the task. `../AGENTS.md` (core rules) loads automatically; `../.claude/rules/` (path-scoped rules) load automatically for Claude, and Codex reads the one matching its task.

## Task Routing

| Task | Read |
| --- | --- |
| Any code change | `../AGENTS.md`, relevant feature code |
| UI, design, motion, copy (any AI) | `../.claude/OWNER_PREFERENCES.md` first |
| Shared UI / reusable widgets | `WIDGETS.md`, `DESIGN_TOKENS.md`, `src/lib/widgets/` |
| UI styling & tokens | `DESIGN_TOKENS.md`, `src/index.css` |
| Grammar lessons | `GRAMMAR_LESSON_TEMPLATE.md`, `DECISIONS.md`, `src/screens/grammar-lesson/` |
| Grammar book exercises (Practice) | `GRAMMAR_LESSON_TEMPLATE.md` → Book exercises, `content/grammar-practice/`, `src/features/grammar-practice/` |
| Lesson tests (TOCFL-style end-of-lesson test) | `../content/lesson-tests/README.md`, `src/screens/lesson-test/`; the exam itself: `reference/TOCFL.md` |
| Data model or Supabase RPC | `DATABASE_SCHEMA.md`, `src/services/`, `src/types/database.ts` |
| Flashcard examples & matching | `COURSE_EXAMPLES.md`, `src/services/contentPacks.ts` |
| Jev tooling / semantic review | `TESTING.md`, `scripts/jev/` |
| Server and grading | `API_SPEC.md`, `server/` |
| Release, undo, backups and restore, incidents, environments | `RELEASING.md` |
| Data breach, leaked key, stolen sign-in | `reference/INCIDENTS.md` |
| Study together (presence, chat, quiz races) | `RELEASING.md` → Study together, `games/`, `shared/lobby.ts`, `shared/quizRace.ts`, `src/features/social/` |
| Audio & karaoke alignment | `reference/OFFICIAL_AUDIO_SOURCES.md`, `API_SPEC.md`, `src/services/audioService.ts` |
| Character/scene art prompts | `reference/VISUAL_PROMPTS.md` |
| Architectural boundary changes | `ARCHITECTURE.md`, `../AGENTS.md`, `DECISIONS.md` |
| Loading, CPU, memory and audio performance | `TESTING.md` → Performance regression checks, `src/services/audio/`, `scripts/performance/checkBudget.ts` |
| Past decisions older than 2026-09-22 | `archive/DECISIONS_ARCHIVE.md` |

## Active Docs

- `../README.md` — project overview and local development.
- `../.claude/OWNER_PREFERENCES.md` — the owner's taste and learning rules; the one home for design corrections, for any AI.
- `DECISIONS.md` — recent architectural, interaction and design decisions that must stay stable.
- `WIDGETS.md` — public shared widget catalog mirroring `src/lib/widgets/index.ts`.
- `ARCHITECTURE.md` — source layout, module boundaries, ESLint import restrictions, component ownership.
- `DATABASE_SCHEMA.md` — Supabase schema, tables, RPCs, RLS, pack-first fetch paths.
- `DESIGN_TOKENS.md` — semantic design tokens (radius, tactile depth, shadows, focus rings, colors).
- `API_SPEC.md` — server API (Cloudflare Worker): protected lesson content, CDN media, the on-device dictionary, retired endpoints.
- `GRAMMAR_LESSON_TEMPLATE.md` — interactive grammar lesson spec and data contracts.
- `../content/lesson-tests/README.md` — TOCFL-style lesson tests: how a test runs, item kinds, content rules, pictures and audio pipeline.
- `COURSE_EXAMPLES.md` — course example sentence packs, runtime matching, OCR export workflow, coverage audit.
- `../content/audio/` — official audio index and manifest (book 1), read by `scripts/audio/` and `tests/content/officialAudio.test.ts`.
- `TESTING.md` — test commands, acceptance suites, and Jev semantic/content review workflow.
- `RELEASING.md` — how changes reach learners, undo, data restore, incidents, guards, environments, free-tier limits; then configuration reference (env vars, Supabase, audio, Study together).

## Reference & Archive (not routed by default)

- `reference/` — long lookup docs, read only when a task names them: `OFFICIAL_AUDIO_SOURCES.md`, `VISUAL_PROMPTS.md`, `READING_ART_PROMPTS.md`, `TOCFL.md` (the exam's parts per band, book-to-level mapping, item-writing rules), `INCIDENTS.md` (data breach, leaked key or stolen sign-in: evidence, containment, who must be told, message templates, where each secret lives).
- `archive/` — superseded or one-off material: `DECISIONS_ARCHIVE.md`, `REFACTOR_PROMPT.md`, `BETA_AUDIT_2026-10-23.md`.

## Generated Artifacts & Scratch Policy

- **Committed packs (`public/data/`)**: `course-examples/`, `decomposition/`, `dictionary/`, `lesson-tests/`, `memory-hooks/`, `relations/`, `vocabulary/`, with hash-versioned `manifest.json`. Regenerate via npm scripts; never hand-edit.
- **Gitignored scratch**: `output/`, `.audit/`, `materials/`, `.agents/`, `dist/`, `.vite/`. Clean with `npm run clean:local`. Never depend on them in code.
