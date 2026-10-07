---
name: task-start
description: Start any non-trivial Ron's Mandarin task (new feature, redesign, multi-file change, content work, "make a plan", "suggest"). Sets the plan-first flow and keeps context reads minimal.
---

# Task start

1. **Classify** in one line: tweak/bug · feature · design/redesign · content/pipeline · backend.
2. **Tweak/bug** (one area, clear fix): state the inferred intent in one line, fix, verify (`verify-change`). No plan.
3. **Anything else:** read only what matters:
   - `docs/INDEX.md` routing row for the task, plus the code the task touches.
   - For UI: `rongwaps-ui-director` skill. Look at the current screen (screenshot/browser) before proposing.
   - Use grep/glob to locate code; don't read whole directories or `docs/archive|reference`.
4. **Plan** (≤ 8 bullets, self-contained so another model could execute it): goal, files to touch, approach, what is reused, risks, acceptance checks. For design work be creative — propose something better than the literal ask and say why. If the request is ambiguous, ask at most 3 questions with a recommended default for each.
5. **Stop and wait for "go".** On "go"/"continue": execute phase by phase, no re-discussion.
6. **Finish:** run `verify-change` scoped to what changed. Report in 1–3 lines: what changed, what was verified, anything the owner must decide. No diff recap.
7. If asked for a handoff: write a short md (current task, state, next steps, files) — nothing historical.

Ask before: new dependency or abstraction, moving/deleting files, schema or pack changes.
