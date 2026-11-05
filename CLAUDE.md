# Ron's Mandarin (repo: rongwaps) — Claude Code

@AGENTS.md

- Skills (`.claude/skills/`): `task-start` for non-trivial work · `rongwaps-ui-director` for any screen, design, motion or visual audit · `verify-change` before saying done · `cleanup-loop` (`/loop /cleanup-loop`) for code reduction. Path rules in `.claude/rules/` load on their own.
- `.claude/hooks/guard.mjs` denies protected pushes and asks before merges, migrations, production database commands and provider changes. Its prompt is the owner's approval: never work around it.
- Web dashboards (Render, Supabase, Sentry, Cloudflare, Google Cloud): sign in with the owner's Google account ("Continue with Google"). If Google itself isn't signed in, ask the owner to sign in; never type their password.
- From the phone the owner uses cloud sessions: book scans come from `npm run materials -- pull <book/lesson>`; Docker may be missing there, so label those PRs `full-ci` and CI runs the browser journeys.
