---
name: verify-change
description: Run the Ron's Mandarin verification gate before declaring any src/, server/, tests/, content, workflow or UI change done, and before opening a PR.
---

# Verify change

While working, run what fits the paths you touched (`git status --short`). **Before opening a PR, always run the full gate** (first row) and paste `output/gate/summary.md` into the PR description. To save Actions minutes, CI on PRs into `main` runs only the secret scan and migration safety (must be green); the full suite runs on Release PRs, `production` and PRs labelled `full-ci` (use it when this machine has no Docker).

| Changed | Run |
| --- | --- |
| anything, before a PR | `npm run gate` (every CI check; journeys and the backup self-test when the changed files need them, `-- --all` for everything) |
| lesson/grammar content, `scripts/content/validateLessons.ts` inputs | `npm run content:validate` |
| sign-in, saving/sync, `server/`, `supabase/` | the browser journeys: `npm run gate` runs them against a local Supabase stack (`docs/TESTING.md`); without Docker label the PR `full-ci` and check the `e2e` job passed |
| `supabase/migrations/` | `npm run release:check-migrations`; `npm run gate` also restores a backup across it (CI again on the Release PR) |
| `.github/workflows/` | `actionlint` if available; CI runs them |
| UI | the above, plus look at 390×844 and 1440×900 in light and dark (loading/empty/error/long text; hover/active states not pre-activated) |

UI changes also run the colour check on added lines only (existing files still carry hardcoded colours, so a repo-wide rule would fail):

```bash
git diff -U0 origin/main -- src ':!src/index.css' | grep -E '^\+' | grep -E '#[0-9a-fA-F]{6}\b|text-white|bg-white|(bg|text|border)-(amber|yellow|gray|slate|zinc|red|blue|green|orange)-[0-9]'
```

Any hit = hardcoded colour that will not follow dark mode: swap for a token, or justify it (confetti, user-picked folder colours, art). Screenshot dark mode too: `resize_window` with `colorScheme: "dark"` at 390 and 1440 wide. New tokens are defined in both the light and the dark block of `src/index.css`.

Rules:
- `jev:lint` flags are prompts to re-check the file; fix code, never weaken a rule.
- A failing check is never "unrelated" without proof: find its cause (another session's untracked file, a flaky test). Fix flaky tests at their root.
- For UI also confirm: tokens only (no hex), shared widgets reused, no new nested scroller, windows keep the nav bar visible on desktop.
- Report one line per check (pass/fail/skipped) and what you could not check.
