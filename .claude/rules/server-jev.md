---
paths:
  - "server/**"
  - "scripts/jev/**"
---
# Server & Jev rules

- The backend in `server/` is a Cloudflare Worker (`worker.ts`); every route is in `app.ts`, written against web-standard `Request`/`Response` so `npm run dev` and the tests run the same code. No Node-only APIs there, and no state shared between requests except settled values (Cloudflare forbids one request waiting on another's unfinished work). Static media streams from CDN. `server/` must not import browser app code (ESLint-enforced). API contract: `docs/API_SPEC.md`.
- Cloudflare's free plan allows about 10 ms of CPU per request: heavy work belongs in the build or on the device (the dictionary runs in the browser), not in a request.
- Files are public only when listed in `run_worker_first` in `server/wrangler.jsonc`; `/data` never is. After changing routing or the gate: `npm run server:test`.
- Jev (TypeSafe System One) is development/content-review tooling only: key `TYPESAFE_API_KEY` stays in local/CI tooling, never in `src/` or production web-service configuration. Shared client + pinned model in `scripts/jev/client.ts`; smoke check `npm run jev:check`.
- No runtime grading API: `/api/jev/grade-answer` returns 404.
- Jev judges (score/choice); code owns thresholds and verdicts. Instructions in English; Chinese only in state.
- `jev:lint` flags: re-check the file; never weaken a rule to silence it — fix code or calibrate the threshold in `scripts/jev/lintRuleSet.ts`.
