## 2026-09-04T15:47:34Z
<USER_REQUEST>
You are test_writer_e2e for the RongWaps fresh-foundation cleanup project.
Your identity: test_writer_e2e
Your working directory: /Users/ronianb.gica/Projects/rongwaps/.agents/test_writer_e2e
Parent orchestrator conversation ID: 3c2faab7-8d44-4972-82e9-ff93d6a3845b

Authoritative user request: /Users/ronianb.gica/Projects/rongwaps/.agents/ORIGINAL_REQUEST.md
Project document: /Users/ronianb.gica/Projects/rongwaps/.agents/orchestrator_1/PROJECT.md
Plan document: /Users/ronianb.gica/Projects/rongwaps/.agents/orchestrator_1/plan.md

Your mission is to execute the E2E Testing Track (Dual Track):
1. Design and write TEST_INFRA.md at project root (/Users/ronianb.gica/Projects/rongwaps/TEST_INFRA.md) documenting test philosophy, feature inventory, test architecture, and coverage thresholds per the 4-tier methodology:
   - Tier 1: Feature Coverage (happy path requirements verification)
   - Tier 2: Boundary & Corner Cases (limits, extremes, empty inputs)
   - Tier 3: Cross-Feature Interactions (pairwise combinations)
   - Tier 4: Real-World Application Scenarios
2. Design and implement comprehensive tests (under tests/acceptance/ or tests/e2e/ or integrated with Vitest) that test the product as an end user and verify EVERY acceptance criterion in ORIGINAL_REQUEST.md:
   - Documentation criteria (<= 12 markdown files, no .original.md, no claimed deleted files, valid links in docs/INDEX.md, no superseded decisions, no .hermes/.openai)
   - Dependencies & dead code criteria (npm ls missing check, grep zero matches, no empty dirs, phantom stores check, package.json name and devDependencies)
   - AGENTS.md criteria (no deleted docs referenced, no exact pixel rules, no mnemonics in API_SPEC)
   - Static data criteria (dialogueAlignment.ts gone, JSON loadable)
   - Code quality criteria (line counts < targets: App < 250, audioService < 400, models < 300; widget encapsulation; zero node:crypto in src/)
   - Server criteria (server.ts moved, server/ exists)
   - Build & runtime criteria (build, dev, test)
3. Ensure these tests run reliably under npm test or a dedicated test script without breaking existing tests.
4. When complete, publish TEST_READY.md at project root (/Users/ronianb.gica/Projects/rongwaps/TEST_READY.md) with test counts and feature checklist across all tiers.
5. Write your handoff report to /Users/ronianb.gica/Projects/rongwaps/.agents/test_writer_e2e/handoff.md.
Update your progress.md with timestamps as you work.
When done, notify parent (conversation ID 3c2faab7-8d44-4972-82e9-ff93d6a3845b) via send_message.
</USER_REQUEST>
