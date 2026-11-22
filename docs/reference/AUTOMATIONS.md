# The AI team and its automations (T3 Code)

How the owner works with AIs since 2026-11-22, and what each scheduled run does. Scheduled runs read their section of this file from `origin/main`, so a PR that edits a section changes what the next run does. `../../AGENTS.md` rules apply to every run.

## Who does what

| Who | Does | Never |
| --- | --- | --- |
| **Lead**: Claude Opus 5.5 (or Fable 5.2, the owner can switch a thread) | Plans, designs, all UI and styling, judges every helper's work, writes and watches PRs | Merges without the owner's word |
| Claude Sonnet 5.5 | Mechanical code from the lead's exact plan, test fixes | Design or UI styling |
| Claude Haiku 5.5 | Lookups, log reading, first triage of errors | Writing shipped code |
| Codex (`gpt-6.1-sol` or newer sol, medium at most; `gpt-6-luna` for cheap work; never astra) | Chinese content authoring and review, blind solving, mechanical code | Design or UI styling |
| Gemini 4 Neon (Antigravity) | Reviews the screenshots of every UI change (390 and 1440 wide, light and dark); scouts ideas; Gemini 3.8 Flash for cheap long reads | Writing code or content |

The lead gives a helper a brief with the files, the goal and what to check, then checks the result. Helpers spend the owner's usage: use one where one will do (`../../AGENTS.md`).

## A normal task

1. One T3 thread per task, in its own worktree from `origin/main`.
2. The lead builds and checks it: the checks that fit, `npm run gate` before the PR, and screenshots at the sizes the change can affect. Gemini Neon reviews the screenshots of UI work before the owner sees them.
3. The owner gets screenshots and a phone link (`npm run dev` with `--host`).
4. The lead opens the PR, watches it until the checks are green, fixes failures, then says "ready to merge".
5. New features or anything with several reasonable designs: interview the owner first (questions with options, one recommended).

## Rules for every scheduled run

- **May do alone:** bug fixes, speed fixes, cleanup, safe package updates. Each one is a small PR from its own worktree and branch, with the gate summary, watched until the checks are green. At most 3 fix PRs a night.
- **Suggest only, then wait for the owner's yes:** new features, anything learners would notice as a change, lesson or pack content (product decisions), anything costing money.
- **Never:** merge, run *Migrate production*, write to a production database, change hosting, provider or secret settings, send email or messages, or edit `public/data/` by hand. A guard prompt during a run is a stop: write it down for the morning thread.
- Check open PRs first (`gh pr list`) and don't redo work already in one.
- At the end, write a few lines to `output/automations/<YYYY-MM-DD>-<run>.md` in the main folder: what was done, each PR named in plain words with its link, what's left. The morning thread reads them.
- Spend lightly: Haiku/Sonnet/Flash for reading and scouting, the lead model for fixing and judging, Opus subagents at medium effort.

## Schedule (Taiwan time; the Mac and T3 must be on and awake)

| When | Run |
| --- | --- |
| Every 6 hours | Error watch |
| 03:00 Mon-Sat | Nightly fixer, focus by day (below) |
| 03:00 Sun | Weekly deep audit |
| 09:30 (GitHub) | Health check and the learner report (`.github/workflows/health.yml`) |
| 10:00 | Morning thread |

### Error watch

1. `node scripts/release/smoke.ts https://ronsmandarin.com --env production` (signed out, read only).
2. Failed GitHub runs in the last 6 hours: `gh run list --status failure --limit 10`.
3. Sentry: `node --env-file=/Users/ronianb.gica/Projects/rongwaps/.env scripts/release/sentryIssues.ts 6` (needs the owner's `SENTRY_READ_TOKEN`; skip quietly without it).
4. All fine: one line, stop. Something breaks for learners: open a task thread to fix it (rules above) and note it for the morning thread.

### Nightly fixer

| Day | Focus |
| --- | --- |
| Mon | **Bugs**: Sentry errors of the last 3 days, flaky or failing tests, typecheck/lint warnings. Fix the top ones. |
| Tue | **Speed**: `npm run build`, `npm run perf:check`, bundle and pack sizes against last week, slow screens. Fix what is clearly worth it. |
| Wed | **Cleanup**: the `cleanup-loop` skill, at most 2 commits, as one PR. |
| Thu | **Content check**: the `mandarin-content-qa` agent on content changed in the last 14 days, plus a Codex blind check. Findings only: content changes are the owner's call. |
| Fri | **Phone-screen check**: screenshots of the main screens on production and staging at 390 wide, light and dark (signed out, and the DEV window's UI Previews locally). Gemini Neon looks for anything broken or off; the lead fixes real visual bugs as a PR. |
| Sat | **Packages**: `npm outdated`; patch and minor updates that pass the gate, as one PR. Majors become suggestions. |

### Weekly deep audit (Sunday)

The lead (Opus, high effort) audits bugs, speed, security and accessibility, one area per Opus subagent at medium effort (at most 4). It fixes up to 3 clear problems as PRs and writes the rest as ranked suggestions with evidence. It doesn't re-audit what `docs/reports/` or open PRs already cover.

### Morning thread

One new thread a day. It reads:

- the newest `learner-report` artifact: `gh run list --workflow health.yml --limit 1 --json databaseId`, then `gh run download <id> -n learner-report -D output/automations/learner-report-<date>`
- `output/automations/` notes since yesterday
- open PRs and their checks (`gh pr list`), the open "Health check" issue, the error watch thread

It writes, short and in plain words. A PR or merge is always named by what it does in plain words ("the quiz screen crash fix"), with its link on the name, never by its number ("#202"):

1. **Overnight**: what was done, with PR links, and which are ready to merge.
2. **Waiting on you**: merges, decisions, owner steps.
3. **Learners**: 4-6 lines from the learner report (active yesterday and this week, new accounts, came back, busiest lessons, hardest words) and one thing it suggests.
4. **Errors** learners hit, and what is being done.
5. **Ideas**: 3-5 ranked suggestions (features, fixes, speed, cool stuff). Each says what learners get, what it costs, and one recommendation. A Gemini Neon scout writes candidates from the learner report and the app; the lead picks and ranks them.
6. **What's new** (only when production changed since yesterday): a 3-line note for learners the owner can post or skip.

The owner replies "do 1 and 3": the lead opens one task thread per pick, interviews first when the pick is big, and follows *A normal task*.

## Learner report

`scripts/release/learner-report.sql` (read-only, inside a read-only transaction) → `scripts/release/learnerReport.mjs` → the `learner-report` artifact and the Health run's summary, every day at 09:30 Taiwan. It counts active learners (answered at least one card) by day, week and month; new accounts; who came back; study minutes and where (daily review, quizzes, flashcards…); busiest and quietest hours, so releases go out in the quietest hours; the most studied lessons; the hardest words; and Study together and friends activity.

The privacy policy allows "anonymous, combined statistics only", so the report never shows an account id, name or email. A lesson, word or group row appears only once 3 or more learners are in it, so no row can point at one person. "Online" for the whole app isn't recorded; "seen in Study together" is the closest number.

## Owner steps

- **Sentry read token** (for the error watch): sentry.io → Settings → Developer Settings → Personal Tokens → Create, scopes `project:read` and `event:read` only. Add it to the main folder's `.env` as `SENTRY_READ_TOKEN=...` yourself.
- **Keep the Mac awake at night**: System Settings → Battery → Options → "Prevent automatic sleeping on power adapter when the display is off", Mac on the charger, T3 open.
- `CLOUDFLARE_ANALYTICS_TOKEN` (Health's Worker-request warning): GitHub secret with Account Analytics: Read, listed in `../RELEASING.md`.
