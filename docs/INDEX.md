# RongWaps Docs Index

Use this file to find the right document. Do not read every Markdown file for one task.

## Read First

- `../AGENTS.md` — permanent coding, architecture, and product rules.
- `../WORK_CONTEXT.md` — editable current focus, scope, and next step.
- `../README.md` — project overview, setup, and commands.

## Working Memory

- `../DECISIONS.md` — stable project decisions; read when changing architecture or behavior.
- `../TASK_TEMPLATE.md` — reusable task brief for larger changes.

## Project Docs

- `ROADMAP.md` — larger product direction and priorities.
- `PROGRESS_AND_PLANS.md` — implementation progress and unfinished work.
- `UI_CONSISTENCY_AUDIT.md` — current UI issues and polish priorities.
- `GRAMMAR_LESSON_TEMPLATE.md` — reusable grammar lesson behavior.
- `GRAMMAR_PART_TWO_PLAN.md` — grammar part structure and source-reading model.
- `LESSON_9_GRAMMAR_PLAN.md` — one feature plan: Lesson 9 grammar.

## Technical Reference

- `ARCHITECTURE.md` — folders, boundaries, and application structure.
- `DATABASE_SCHEMA.md` — Supabase tables, relationships, and policies.
- `API_SPEC.md` — Express API endpoints.
- `SEARCH_SPEC.md` — dictionary search design.
- `../WIDGETS.md` — shared widget catalog and usage.

## History / Background

- `../ARCHITECT_LOG.md` — historical architect session notes.
- `CHANGELOG.md` — released change history.
- `team.md` — team/process notes.
- `GRAMMAR_CONVERSATION_QUEST.md` — superseded grammar quest exploration; use only for ideas.
- `../AGENTS.md.original.md` — backup copy of agent rules.
- `../WIDGETS.md.original.md` — backup copy of widget documentation.

## Source Content

- `../output/ocr/modern_chinese_1/` — OCR-derived book lessons.
- For Lesson 9 source, read `../output/ocr/modern_chinese_1/lesson-09/lesson.md`.
- `raw-ocr.md` files are extraction backups; use only when the cleaned lesson has an OCR question.

## Task Routing

| Task | Read |
| --- | --- |
| Any code change | `../AGENTS.md`, relevant code |
| Any grammar lesson | `GRAMMAR_LESSON_TEMPLATE.md`, relevant grammar plan, relevant book source |
| Lesson 9 grammar | `LESSON_9_GRAMMAR_PLAN.md`, `GRAMMAR_LESSON_TEMPLATE.md`, Lesson 9 source |
| New reusable widget | `../AGENTS.md`, `../WIDGETS.md`, relevant widget code |
| UI redesign | `../AGENTS.md`, `UI_CONSISTENCY_AUDIT.md`, relevant screen/widgets |
| Data/API change | `ARCHITECTURE.md`, `DATABASE_SCHEMA.md` or `API_SPEC.md` |
| Dictionary search | `SEARCH_SPEC.md`, relevant services/hooks |
| Product planning | `ROADMAP.md`, `PROGRESS_AND_PLANS.md` |

## Documentation Rule

New active docs need one line here. This index covers the whole RongWaps project, not one lesson or feature. Completed experiments move to the History / Background section. Keep permanent agent rules in `AGENTS.md`, not scattered across planning files.
