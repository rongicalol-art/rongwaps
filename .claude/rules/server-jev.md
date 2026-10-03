---
paths:
  - "server/**"
  - "src/services/answerGradingService.ts"
  - "scripts/jev/**"
---
# Server & Jev rules

- Express backend in `server/`: neural TTS + Jev grading. Static media streams from CDN. `server/` must not import browser app code (ESLint-enforced). API contract: `docs/API_SPEC.md`.
- Jev (TypeSafe System One): key `TYPESAFE_API_KEY` server/script-side only, never in `src/`. Shared client + pinned model in `scripts/jev/client.ts`; smoke check `npm run jev:check`.
- Runtime grading: `POST /api/jev/grade-answer` (`server/jevClient.ts`) + `src/services/answerGradingService.ts`, free-text fallback in `useDragBlankExercise`. Missing key or 503 = exact-match only. Pass only when meaning, grammar and natural all clear thresholds.
- Jev judges (score/choice); code owns thresholds and verdicts. Instructions in English; Chinese only in state.
- `jev:lint` flags: re-check the file; never weaken a rule to silence it — fix code or calibrate the threshold in `scripts/jev/lintRuleSet.ts`.
