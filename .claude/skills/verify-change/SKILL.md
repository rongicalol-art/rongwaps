---
name: verify-change
description: Run the Ron's Mandarin verification gate scoped to what changed. Use before declaring any src/, server/, tests/, content or UI change done.
---

# Verify change

Run once at the end of the task. Pick by changed paths (`git status --short`):

| Changed | Run |
| --- | --- |
| `src/` `server/` `tests/` | `npm run typecheck && npm run lint && npm test && npm run jev:lint` |
| lesson/grammar content, `scripts/content/validateLessons.ts` inputs | `npm run content:validate` |
| `scripts/` only | `npm run lint` |
| docs only | `npm test` (documentation acceptance tests) |
| UI | the above, plus check 390×844 and 1440×1000 (loading/empty/error/long text; hover/active states not pre-activated) |

UI changes also run the colour check on added lines only (256 existing files still carry hardcoded colours, so a repo-wide rule would fail):

```bash
git diff -U0 -- src ':!src/index.css' | grep -E '^\+' | grep -E '#[0-9a-fA-F]{6}\b|text-white|bg-white|(bg|text|border)-(amber|yellow|gray|slate|zinc|red|blue|green|orange)-[0-9]'
```

Any hit = hardcoded colour that will not follow dark mode: swap for a token, or justify it (confetti, user-picked folder colours, art). Then screenshot the change in dark mode too: `resize_window` with `colorScheme: "dark"` at 390 and 1440 wide. New tokens must be defined in both the light and the dark block of `src/index.css`.

Rules:
- `jev:lint` flags are prompts to re-check the file; fix code, never weaken a rule.
- If a check fails, report it with the shortest decisive output line. Do not claim done.
- For UI also confirm: tokens only (no hex), shared widgets reused, no new nested scroller, windows keep the nav bar visible on desktop.
- Report: one line per check — pass/fail/skipped.
