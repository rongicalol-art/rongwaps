@AGENTS.md

- `.claude/hooks/guard.mjs` blocks protected pushes, commits on `main`, hand edits to `public/data/` and printing key files; it asks before merges, migrations, production database commands, provider changes and anything that disturbs the shared folder. Its prompt is the owner's approval, so a blocked command is a stop, not a puzzle to get around.
- `.claude/hooks/lint-edited.mjs` lints each file you edit and reports errors right away.
- Cloud sessions from the phone: book scans come from `npm run materials -- pull <book/lesson>`.
