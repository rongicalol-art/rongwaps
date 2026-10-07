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

Rules:
- `jev:lint` flags are prompts to re-check the file; fix code, never weaken a rule.
- If a check fails, report it with the shortest decisive output line. Do not claim done.
- For UI also confirm: tokens only (no hex), shared widgets reused, no new nested scroller, windows keep the nav bar visible on desktop.
- Report: one line per check — pass/fail/skipped.
