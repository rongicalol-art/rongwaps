# Study together load test

`socialLoad.mjs` drives N synthetic learners through the realtime Worker: connect to the Lobby, spread over lessons, open the Online list, chat in a lesson and in global chat, change lessons, create and join race rooms, answer, finish. It prints one JSON line per phase (p50/p95/p99/max, errors, generator lag) and a summary table, and writes the full report under `output/load/` (gitignored).

Dev-only: nothing in `src/` or `server/` imports it. Findings and the plan live in `docs/reports/scale-audit.md`.

## Local (safe anywhere)

The Worker runs in Miniflare inside this process with a throwaway signing key and synthetic accounts, exactly like `tests/games/runtime.mjs`.

```bash
node scripts/load/socialLoad.mjs --target local --users 100,250,500 --rooms 200
```

`--lift-cap` removes the Lobby's 250-socket admission check **inside the test bundle only** (app code is untouched) to find where one Lobby object actually breaks:

```bash
node scripts/load/socialLoad.mjs --target local --users 500,2000,10000 --rooms 300 --timeout 300 --lift-cap
```

Local numbers show algorithmic cost (how latency grows with N), not Cloudflare's absolute latency. Watch `generatorLagMs`: when it climbs, this process is the bottleneck, not the Worker.

## Staging (owner-run)

Staging accepts only school Google sign-ins, so the script cannot mint tokens. The owner issues them: create synthetic accounts allowed by `private.beta_owner_emails` on the **staging** project, sign each in, and put one access token per line in a file outside the repo (tokens last one hour).

```bash
node scripts/load/socialLoad.mjs --target staging --users 100 \
  --url https://rons-mandarin-games-staging.ronm222007.workers.dev \
  --origin https://ronsmandarin-staging.onrender.com \
  --tokens-file ~/staging-tokens.txt
```

Guards: both hosts must contain `staging`, production hosts are refused, every token must be issued by the staging Supabase project and none by production, tokens are never printed. The deployed staging Lobby keeps its 250 cap, so expect `socket 503` past 250 users; that is the measurement.

## Options

| Flag | Default | Meaning |
| --- | --- | --- |
| `--users` | `100` | comma-separated sizes, run one after another |
| `--lessons` | `20` | lessons users spread over |
| `--online-share` | `0.1` | share with the Online list open (full roster frames) |
| `--global-share` | `0.2` | share following global chat during the global burst |
| `--chatters` | `50` | senders per chat burst |
| `--churn` | `0.2` | share changing lesson in the churn phase |
| `--rooms` | all | cap on race rooms |
| `--room-size` | `4` | players per room (2–6) |
| `--answers` | `10` | progress frames per player |
| `--batch` | `100` | connections opened in parallel |
| `--timeout` | `120` | seconds before a phase counts as broken |
| `--skip-rooms` | off | presence and chat only |
| `--json` | `output/load/…` | report path |
