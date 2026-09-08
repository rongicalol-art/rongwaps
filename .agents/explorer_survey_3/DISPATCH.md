# Dispatch for Explorer Survey 3

You are explorer_survey_3.
Working directory: /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_3
Original Request: /Users/ronianb.gica/Projects/rongwaps/.agents/ORIGINAL_REQUEST.md

Focus: Static data extraction (R4), Monolith decomposition (R5), & Build/Test baseline (R7).
See details in your dispatch prompt.

## 2026-09-04T15:36:55Z
You are explorer_survey_3 for the RongWaps fresh-foundation cleanup project.
Your identity: explorer_survey_3
Your working directory: /Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_3
Authoritative request: /Users/ronianb.gica/Projects/rongwaps/.agents/ORIGINAL_REQUEST.md
Your parent orchestrator conversation ID: 3c2faab7-8d44-4972-82e9-ff93d6a3845b

Your mission is technical investigation and planning for:
- Requirement 4 (R4): Static data extraction (dialogueAlignment.ts and grammar data into JSON, update imports)
- Requirement 5 (R5): Monolith decomposition (audioService.ts < 400 lines, useCloudSync.ts, App.tsx < 250 lines, models.ts < 300 lines, fix widget encapsulation, move staging/sources to scripts/)
- Requirement 7 (R7): Baseline build and test health verification

Specifically:
1. Static data extraction (R4):
   - Inspect `src/data/dialogueAlignment.ts` (5,053 lines): examine data shape, exports, consumers, and design JSON extraction + loader.
   - Inspect `src/data/grammar/` (~21 files, ~13,500 lines) and aggregators `interactiveGrammarPages.ts`, `interactiveGrammarLessonOnePartTwo.ts`: design conversion to JSON or line reduction, verifying loadability and types.
2. Monolith decomposition (R5):
   - Inspect `src/services/audioService.ts` (1,119 lines): map sub-concerns (playback engine, TTS/Edge TTS, caching, Web Audio vs HTML5) to plan splitting into sub-modules so `audioService.ts` is < 400 lines.
   - Inspect `src/hooks/useCloudSync.ts` (659 lines): map sync queue logic separation from the React hook.
   - Inspect `src/App.tsx` (431 lines): identify reader lifecycle, grammar loading, auth/sync orchestration to plan extraction into dedicated hooks/components so `App.tsx` is < 250 lines.
   - Inspect `src/types/models.ts` (712 lines): identify grammar types to extract into `grammarModels.ts` and dead lab types to prune so `models.ts` is < 300 lines.
   - Inspect shared widgets: `src/lib/widgets/SmartSentence.tsx` and `src/lib/widgets/PosBadge.tsx`. Identify their imports from `src/services/` and `src/store/` and plan prop-passing refactoring.
   - Inspect `staging/` and `sources/` in `src/features/character-decomposition/`: check `node:crypto` imports and plan moving to `scripts/`.
3. Baseline verification (R7):
   - Run `npm run build` and `npm test` via run_command to establish current baseline pass/fail status and timing.
4. Formulate concrete, step-by-step refactoring plans for R4, R5, and baseline verification for R7.

Write your comprehensive findings to `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_3/survey_report.md` and summarize in `/Users/ronianb.gica/Projects/rongwaps/.agents/explorer_survey_3/handoff.md`.
Update your `progress.md` with timestamps as you work.
When complete, notify parent (conversation ID 3c2faab7-8d44-4972-82e9-ff93d6a3845b) using send_message.
