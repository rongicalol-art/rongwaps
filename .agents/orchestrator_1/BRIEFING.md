# BRIEFING — 2026-09-04T16:08:30Z

## Mission
Orchestrate and execute the RongWaps fresh-foundation cleanup project across all 7 requirements (R1-R7) and satisfy all acceptance criteria without regressions.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/ronianb.gica/Projects/rongwaps/.agents/orchestrator_1
- Original parent: Sentinel
- Original parent conversation ID: abe9f1a0-2515-41e5-bcd8-253e3fd9b3c6

## 🔒 My Workflow
- **Pattern**: Project Orchestration Pattern
- **Scope document**: /Users/ronianb.gica/Projects/rongwaps/.agents/orchestrator_1/PROJECT.md
1. **Decompose**: Survey codebase via 3 parallel Explorers -> Synthesize into PROJECT.md -> Decompose into modular milestones & E2E Testing track -> Dispatch sub-orchestrators/workers.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate check.
   - **Delegate (sub-orchestrator)**: When an item is large, spawn a sub-orchestrator.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical, never auditor)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At 16 spawns, write handoff.md, cancel crons, spawn successor.
- **Work items**:
  1. Survey phase (3 Explorers) [COMPLETE]
  2. PROJECT.md & Milestones creation [COMPLETE]
  3. Milestone 1 (Docs & AGENTS.md) [PASSED & CLOSED]
  4. E2E Testing Track (test suite & TEST_READY.md) [COMPLETE]
  5. Milestone 2 (Dead deps & code, Server) [in-progress: worker_m2]
  6. Milestone 3 (Static data extraction) [pending]
  7. Milestone 4 (Monolith decomposition) [pending]
  8. Milestone 5 (Final Verification & Audit) [pending]
- **Current phase**: 2 (Milestone Execution & Dual Track)
- **Current focus**: Executing Milestone 2 (Dead Dependencies, Dead Code & Server Restructuring)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- File-editing tools ONLY allowed for metadata/state files (.md) in .agents/ folder.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Zero tolerance on integrity violations (Auditor verdict is a binary veto).
- Must satisfy all acceptance criteria in ORIGINAL_REQUEST.md.

## Current Parent
- Conversation ID: abe9f1a0-2515-41e5-bcd8-253e3fd9b3c6
- Updated: 2026-09-04T15:36:00Z

## Key Decisions Made
- Initiated Project Pattern with Survey phase (0).
- Synthesized findings into PROJECT.md and plan.md.
- E2E Testing Track completed and published (51 tests in tests/acceptance/).
- Milestone 1 unanimously approved and closed (11 markdown files, clean audit).
- Dispatched worker_m2 for Milestone 2 implementation.

## Team Roster (Active Milestone)
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| worker_m2 | teamwork_preview_worker | Milestone 2 Implementation | in-progress | 356b8270-9484-4997-a8a5-63bf0877dd65 |

## Succession Status
- Succession required: no
- Current generation: gen 0 / continued
- Spawn count (current batch): 1 / 16
- Pending subagents: 356b8270-9484-4997-a8a5-63bf0877dd65
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 3c2faab7-8d44-4972-82e9-ff93d6a3845b/task-198
- Safety timer: none
