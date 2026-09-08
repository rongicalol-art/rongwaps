## 2026-09-04T15:37:00Z

You are explorer_survey_1 for the RongWaps fresh-foundation cleanup project.
Your identity: explorer_survey_1
Your working directory: /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_1
Authoritative request: /Users/ronianb.gica/Projects/rongwaps/.agents/ORIGINAL_REQUEST.md
Your parent orchestrator conversation ID: 3c2faab7-8d44-4972-82e9-ff93d6a3845b

Your mission is technical investigation and planning for:
- Requirement 1 (R1): Documentation nuclear cleanup (markdown files ≤ 12 in root + docs/ excluding README, delete .original.md, stale plans, leftover .hermes/.openai, rewrite docs/INDEX.md, trim DECISIONS.md)
- Requirement 3 (R3): AGENTS.md rewrite (accurate, concise, reflecting real conventions)

Specifically:
1. Inspect and catalog EVERY markdown file across project root and `docs/`. Record file path, line count, purpose, and classification (Active reference, Stale plan, Completed plan, Experimental artifact, Backup file, Point-in-time audit, etc.).
2. Locate any `.original.md` backup files anywhere in the project, as well as `.hermes/` and `.openai/` directories.
3. Verify files claimed deleted in `CHANGELOG.md` (`team.md`, `PROGRESS_AND_PLANS.md`, `ARCHITECT_LOG.md`).
4. Read `DECISIONS.md` thoroughly. Enumerate all active decisions vs superseded decisions. Plan the exact trimmed version containing only active decisions.
5. Inspect `docs/INDEX.md`. Enumerate missing docs and broken links. Plan the exact rewrite listing surviving docs.
6. Inspect `AGENTS.md`. Compare its rules against actual codebase reality. Identify:
   - References to deleted docs
   - Hyper-specific implementation details (exact pixel values, modal sizing rules, grammar beta flow rules)
   - Inaccuracies (e.g. mnemonics documented in API_SPEC.md, scroll container absolutes)
7. Plan the surviving set of markdown files such that total markdown files in root + docs/ <= 12 (excluding README).
8. Draft the proposed new `AGENTS.md` and `docs/INDEX.md` content.

Write your comprehensive findings to `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_1/survey_report.md` and summarize in `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_1/handoff.md`.
Update your `progress.md` with timestamps as you work.
When complete, notify parent (conversation ID 3c2faab7-8d44-4972-82e9-ff93d6a3845b) using send_message.
