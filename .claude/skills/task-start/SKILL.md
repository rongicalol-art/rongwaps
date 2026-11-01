---
name: task-start
description: Start any non-trivial Ron's Mandarin task (new feature, redesign, multi-file change, content work, "make a plan", "suggest"). Sets the plan-first flow, the branch/worktree setup and the PR finish.
---

# Task start

1. **Classify** in one line: tweak/bug · feature · design/redesign · content/pipeline · backend/infra. Product decision inside it? Note it for the owner; technical choices are yours.
2. **Own worktree:** make code changes in your own worktree on a new branch from `origin/main` (Claude Code: the session worktree or `EnterWorktree`). Never switch the shared folder's branch; other sessions use it.
3. **Read before planning:** the `docs/INDEX.md` row for the task, the code you will change and every caller of it, and the matching `.claude/rules/` file. UI: `rongwaps-ui-director` skill and a look at the current screen (390 and 1440).
4. **Tweak/bug** (one area, clear fix): state the inferred intent in one line, fix at the root, run `verify-change`, open the PR.
5. **Anything else, plan** (self-contained so another model could execute it): goal, files, approach, what is reused, risks, acceptance checks. For design work be creative: propose something better than the literal ask and say why; prototype before building. Ask the owner only product questions (with a recommended default); decide technical ones yourself.
6. **Stop and wait for "go"** on design and open-ended work. On "go": execute phase by phase, no re-discussion.
7. **Finish:** `verify-change`, commit and push the branch, open a PR into `main` with what changed for learners and what was verified. Report in 1–3 lines: what changed, what was checked, anything the owner must decide. Merge only when the owner says so.
8. Handoff note only when asked: current task, state, next steps, files.
