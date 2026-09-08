## 2026-09-04T15:47:34Z

You are worker_m1 for the RongWaps fresh-foundation cleanup project.
Your identity: worker_m1
Your working directory: /Users/ronianb.gica/Projects/rongwaps/.agents/worker_m1
Parent orchestrator conversation ID: 3c2faab7-8d44-4972-82e9-ff93d6a3845b

Authoritative user request: /Users/ronianb.gica/Projects/rongwaps/.agents/ORIGINAL_REQUEST.md
Survey findings: /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_1/survey_report.md
Survey handoff: /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_1/handoff.md

Your mission is to execute Milestone 1: Documentation Nuclear Cleanup (R1) & AGENTS.md Rewrite (R3).

Write ownership:
You own root markdown files (AGENTS.md, DECISIONS.md, AGENTS.md.original.md, WIDGETS.md.original.md, ARCHITECT_LOG.md, TASK_TEMPLATE.md, WORK_CONTEXT.md), docs/*.md files, and .hermes/ and .openai/ directories.
DO NOT modify source code or existing test files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. Delete the 30 obsolete markdown files across root and docs/ identified in survey_report.md.
2. Delete the 2 .original.md backup files (AGENTS.md.original.md and WIDGETS.md.original.md).
3. Delete .hermes/ and .openai/ directories.
4. Overwrite DECISIONS.md with the trimmed 17 active decisions provided in survey_report.md. Ensure zero occurrences of "supersed".
5. Overwrite docs/INDEX.md with the rewritten index provided in survey_report.md. Verify all referenced files exist.
6. Overwrite AGENTS.md with the rewritten instructions provided in survey_report.md.
7. Verification:
   - Run python check: total markdown files in root + docs/ <= 12 (excluding README.md).
   - Run grep check: zero occurrences of "supersed" in DECISIONS.md.
   - Verify .original.md, .hermes, .openai do not exist.
   - Run build and test suite: npm test, npm run content:validate, npm run lint, npm run build. All must pass.
8. Write your completion report to /Users/ronianb.gica/Projects/rongwaps/.agents/worker_m1/handoff.md following the 5-component handoff format (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
Update your progress.md with timestamps as you work.
When done, notify parent (conversation ID 3c2faab7-8d44-4972-82e9-ff93d6a3845b) via send_message.
