---
paths:
  - "server/**"
  - "scripts/jev/**"
---
# Server & Jev rules

- Express backend in `server/`: neural TTS and caching. Static media streams from CDN. `server/` must not import browser app code (ESLint-enforced). API contract: `docs/API_SPEC.md`.
- Jev (TypeSafe System One) is development/content-review tooling only: key `TYPESAFE_API_KEY` stays in local/CI tooling, never in `src/` or production web-service configuration. Shared client + pinned model in `scripts/jev/client.ts`; smoke check `npm run jev:check`.
- No runtime grading API: `/api/jev/grade-answer` returns 404. `server/jevClient.ts` is not imported by the server entry point.
- Jev judges (score/choice); code owns thresholds and verdicts. Instructions in English; Chinese only in state.
- `jev:lint` flags: re-check the file; never weaken a rule to silence it — fix code or calibrate the threshold in `scripts/jev/lintRuleSet.ts`.
