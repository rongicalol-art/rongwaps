# Releasing and recovering

How changes reach learners, how to undo them, and how to get data back, all doable from a phone. Configuration reference (environment variables, Supabase, audio, Study together) is further down. Names only here; values live in the host dashboards and GitHub secrets, never in git.

## How a change reaches learners

```
feature branch ──PR──▶ main ──Release PR──▶ production
   (CI checks)       = staging site        = ronsmandarin.com
```

| Step | What runs by itself |
| --- | --- |
| PR into `main` | CI: secret scan, migration safety, typecheck, lint, Worker checks (Study together and the site server), unit/content tests, build, size budgets; browser journeys when saving, sign-in, server or database change; backup self-test when migrations change |
| Merge into `main` | CI again → **Deploy**: new migrations applied to staging, the staging Study together server deployed, that exact commit built and uploaded to staging, staging checked (right build, staging database only, content gated, noindex). **Release PR** updated |
| Merge the Release PR | CI + browser journeys on `production` → **Deploy**: refuses if a migration isn't applied yet, deploys the Study together server, builds and uploads the exact app commit, checks the live site, **rolls back automatically** and opens an issue if a check fails, tags the release with notes |
| Every night | **Backup** (02:30 Taiwan) with a restore proof; CI and journeys on `main` (03:00) |
| Every morning | **Health** (09:30 Taiwan, read-only): opens or comments on one "Health check" issue when the database passes 400 MB, public sign-ups reach 90% of the cap, reports or feedback arrived since the last good run, or the site and Study together pass 70,000 Worker requests a day (with `CLOUDFLARE_ANALYTICS_TOKEN`); Mondays add a sign-up summary. Run it by hand with *test* ticked to check it reaches your phone |
| At once | **"Not safe" reports** are emailed to the owner by the server (Resend, the feedback settings) |

The site runs on Cloudflare Workers (`server/`, since 2026-11-14; before that Render, whose free plan suspended both sites mid-month). The Deploy workflow is the only deployer: nothing rebuilds on its own, so a rollback is never undone by an automatic redeploy. Each upload is a Worker *version* (the server code, the built site and its settings together), and a rollback puts an earlier version back.

## Release (phone)

1. **Merge work into staging.** In the GitHub app, open the PR, check CI is green, merge. Staging updates in about 10 minutes: https://rons-mandarin-staging.ronm222007.workers.dev
2. **Try it on staging** with your account.
3. **Database changes?** The Release PR says so. Then first: Actions → **Migrate production** → Run workflow (`ref` = `main`, type `production`). It takes a fresh backup, proves it restores, shows a dry run, applies, verifies.
4. **Release:** merge the **Release PR** (`main` → `production`). Updates batch naturally: one Release PR carries everything merged since the last one. Learners get the new version on their next app open; open tabs keep working (previous week's code files stay on the server).
5. Done when the Deploy run is green. A failure notifies you and the site is already back on the previous release.

The Release PR's **Staging** check stays yellow until Deploy has run that exact commit on staging (docs- or test-only changes reuse the running staging build). Don't merge it yellow.

**Merged before migrating?** Deploy refuses ("Not applied: …") and the live site stays as it was. Run **Migrate production**, then Actions → the failed **Deploy** run → *Re-run failed jobs*. If Actions can't run at all, `scripts/release/manualRelease.sh` on the Mac does the same steps after the migration.

Rules that keep this safe: migrations follow expand → migrate → contract (the previous client must keep working; CI blocks drops/renames without `-- migration-safety: contract <reason>`); never release on a red CI; one release at a time.

## Undo a release

- **Automatic:** a failed live check after deploy restores the previous build and opens an issue.
- **By hand:** Actions → **Roll back** → Run workflow (`production`, `previous`). Under a minute, then the same live checks. Cloudflare's dashboard works too: Workers → rons-mandarin → Deployments → the earlier version → Rollback.
- Rollback restores code only. The database stays as it is, which is safe because migrations are backward compatible.
- Cloudflare's rollback works even when GitHub Actions can't run. Cloudflare keeps the last 100 versions.
- **After sign-up opened (6 Nov):** a build from before then has no age step and the old Terms. Roll back only to a release from 5 Nov (8c66d279) or later. If there is none, pause new sign-ups first (`public_cap = 0`, Public accounts below) and fix forward.
- **Study together only:** `npx wrangler rollback --config games/wrangler.jsonc` on the Mac restores the previous Worker version (it asks which); the app keeps working with either.
- **A learner on an app version from before 14 Nov** (an open tab that never reloaded) has no dictionary search until they reload: that version asked the old server to search, and search now runs on the device. Lessons and saved progress are unaffected.
- Then fix forward: branch → PR into `main` → staging → Release PR.
- **Hotfix** (staging holds unreleased work you don't want live): branch from `production`, PR into `production` (CI and journeys run), merge. Release PR opens a back-merge into `main` automatically from a `back-merge/production-…` copy; merge it.
- **Never merge a PR whose head is `production`.** "Automatically delete head branches" deletes the head branch on merge, so that deletes the live branch and every later release and Migrate production fails (PR #74, 2026-11-04). If it happens: open the merged PR → **Restore branch**, or `git push origin <last production sha>:refs/heads/production` from the Mac (owner-typed; the guard blocks AI pushes to it). Keep that repo setting off: Settings → General → Pull Requests.

## Restore data

Backups: nightly, encrypted to the owner's age key, private R2 bucket `rongwaps-backups`: `daily/` 35 days, `monthly/` 90 days, `manual/` (pre-migration) 90 days (bucket lifecycle rules; Privacy §6 promises 90 days at most). Each was restored and compared (every row count, policy, grant, function, trigger, migration, cron job) before it was kept. `LATEST` names the newest.

**The private key** (`rongwaps-backup-identity.txt`) is in the owner's password manager and in `~/Library/Application Support/RonsMandarin/backup-key/` on the Mac. Without it no backup can be read: never delete both. `scripts/release/backup/verify-key.sh` proves a key matches what GitHub encrypts to (run it for both copies; it prints only public keys), then fetch and restore-check one backup.

On the Mac (needs `brew install age`, `wrangler login`, Docker):

```sh
scripts/release/backup/fetch.sh latest ~/restore-work          # or an object key
scripts/release/backup/restore-check.sh ~/restore-work         # proves it in a throwaway container
```

Real recovery restores into a **new** Supabase project, never over production: replay `role-settings.sql`, `pg_restore` the public, private and migration-history schemas, load `auth`/`storage` data into the new project's own tables, replay `cron.sql`, rerun `restore-check`'s metadata comparison against it, then plan the switch explicitly (data written since the backup is lost). Practise this in the first restore drill before it is needed. Delete `~/restore-work` afterwards: it holds learner data.

Not in these backups: profile photo files (only their records), Study together chat (Durable Objects, short-lived by design), audio (rebuilt from `content/` and the R2 audio bucket).

## When something breaks

1. Don't ask learners to clear site data: unsynced work lives on their device.
2. If it started with a release: **Roll back** first, investigate second.
3. Where to look:

| Symptom | First place |
| --- | --- |
| Site down or slow | Cloudflare → Workers → rons-mandarin → Logs / Metrics / Deployments; Deploy run history. "Error 1027" on lessons means the free 100,000 Worker requests a day ran out (Free-tier limits below) |
| Errors on learners' devices or the server | Sentry (filter by release = the commit) |
| Sign-in or saving | Supabase → ChineseApp → Logs (auth, PostgREST) |
| Study together | Cloudflare → Workers → rons-mandarin-games → Logs |
| Audio | `audio.ronsmandarin.com`, Cloudflare R2 metrics |
| Backups | Actions → Backup. No missed-backup alert yet: it needs the Sentry cron monitor and `SENTRY_BACKUP_CRON_URL` (one-time setup below) |

4. Never put tokens, keys or learner records in issues, chat or logs.
5. Learner data exposed, a key leaked or a sign-in stolen: `docs/reference/INCIDENTS.md`.

## Guards

GitHub cannot lock branches on a free private repo, so the lock lives here:

| Guard | Stops |
| --- | --- |
| `.githooks/pre-push` (installed by `npm ci`) | pushes to `main` or `production` from any tool on a machine |
| `.githooks/pre-commit` | commits containing credentials |
| `.claude/hooks/guard.mjs` | AI sessions: protected/force pushes, hook bypass, commits on `main`/`production`, hand edits to `public/data/` or key files, printing key files (denied); merges, hosted migrations, production DB commands, live Worker deploys, Render/Cloudflare/GitHub API changes, and branch switches, stashes, cleans or non-fast-forward merges in the shared folder while other sessions have worktrees (ask the owner) |
| Codex rules (`~/.codex/rules/default.rules`) | the same pushes (forbidden), merges and migrations (prompt) |
| Deploy workflow | anything whose CI or journeys failed; production commits with unapplied migrations |

Owner-only emergency override for a direct push: `ALLOW_PROTECTED_PUSH=1 git push …`, typed by hand.

## Environments

| | Production | Staging |
| --- | --- | --- |
| Site | https://ronsmandarin.com | https://rons-mandarin-staging.ronm222007.workers.dev (noindex) |
| Branch | `production` | `main` |
| Site Worker (`server/`) | `rons-mandarin` (`server/wrangler.jsonc`) | `rons-mandarin-staging` (`server/wrangler.staging.jsonc`) |
| Supabase | ChineseApp `ylpzxpqyfaayavkvhikw` (Mumbai) | `zpljyjcbqkrelpdzvmqz`, synthetic accounts only |
| Study together Worker (`games/`) | `rons-mandarin-games` | `rons-mandarin-games-staging` |
| Sentry | on | off |

Never copy production data or keys into staging.

## Phone setup

- **GitHub app:** review and merge PRs, run workflows (Migrate production, Roll back), read Deploy results. Comment `@claude <task>` on a PR or issue to have Claude Code work on it in GitHub Actions (owner-only; it cannot push to `main` or `production`).
- **Claude Code on the web / Claude app:** cloud sessions on this repo, laptop off. Environment settings: setup script `npm ci`; environment variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` = staging values (public), `MATERIALS_R2_ACCOUNT_ID`, `MATERIALS_R2_ACCESS_KEY_ID`, `MATERIALS_R2_SECRET_ACCESS_KEY` = the read-only materials token; network access must allow `*.r2.cloudflarestorage.com`.
- **Book scans in the cloud:** `npm run materials -- pull book3/L07` fetches one lesson's scans and transcripts into `materials/` (private bucket `rongwaps-materials`). On the Mac, `npm run materials -- push` uploads new scans (read-write token).

## Free-tier limits to watch

Figures from each provider's pricing page, checked 2026-11-05 (pre-launch review); Cloudflare Workers rechecked 2026-11-14. Recheck before relying on them.

| Service | Free limit | What learners see when it runs out | Watch |
| --- | --- | --- | --- |
| Cloudflare Workers Free: the site (`server/`) | Public files (the app's code, fonts, pictures, public pages): free and unlimited, no sleeping. **100,000 server requests a day** for the whole account, shared with Study together: each lesson-content file a browser has not saved yet, each feedback or report, and each screen address opened directly counts as one. 20,000 files and 25 MB a file per build (a build has about 3,700) | Past 100,000: lessons stop loading for everyone until 00:00 UTC (08:00 Taiwan); the landing page still opens | Health with `CLOUDFLARE_ANALYTICS_TOKEN` (alerts at 70,000). The free plan has no usage notifications. The fix is Workers Paid ($5 a month, 10 million requests) |
| Supabase Free | 500 MB database, 1 GB file storage, 5 GB egress a month, 50,000 monthly active users; pauses after a week idle | Past a limit the project is restricted: saving progress and sign-in fail for everyone | Health (database size). Review history and photos are capped per account (20261106120000) |
| Cloudflare Workers Free: Study together (`games/`) | Its own 100,000 Durable Object requests a day, plus its share of the server requests above | Study together stops until 00:00 UTC; lessons keep working | Same Health check |
| Cloudflare R2 | 10 GB storage | Uploads of audio or backups fail | Audio + backups (90 days) + scans |
| GitHub Actions (private repo) | 2,000 minutes a month, then the budget set in Billing. Every staging and production deploy now builds the site here (several minutes each) | Nothing ships, backs up or alerts (happened 2026-11-04) | `npm run gate` runs checks locally; staging builds only when app code changed; set an Actions budget with alert emails. `scripts/release/manualRelease.sh` releases from the Mac when Actions can't |
| Sentry Developer | 5,000 errors a month, 1 cron monitor | New crash reports are dropped silently | 5% of performance notes are sent; set a client-key rate limit and spike protection |

## Remaining one-time setup

- [ ] Repository private (guards above replace GitHub's branch lock)
- [ ] `production` branch at the live commit
- [ ] Cloudflare: `ronsmandarin.com` attached to the Worker `rons-mandarin` (Workers → rons-mandarin → Settings → Domains & Routes → Add → Route `ronsmandarin.com/*`), and a redirect rule sending `www.ronsmandarin.com` to it. The domain is attached in the dashboard, not in `server/wrangler.jsonc`, so the release token needs no access to the domain
- [ ] Worker secrets on `rons-mandarin` (Settings → Variables and Secrets, type *Secret*): `RESEND_API_KEY`, `FEEDBACK_EMAIL_FROM`, `FEEDBACK_EMAIL_TO`, `SENTRY_DSN`. The first three also on `rons-mandarin-staging` if staging should send email. Deploys keep secrets
- [ ] GitHub secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit), `SENTRY_AUTH_TOKEN` (source maps, optional), `PRODUCTION_DATABASE_URL`, `STAGING_DATABASE_URL`, `BACKUP_R2_ACCESS_KEY_ID`, `BACKUP_R2_SECRET_ACCESS_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`
- [ ] GitHub variables: `PRODUCTION_SUPABASE_ANON_KEY`, `STAGING_SUPABASE_ANON_KEY` (the public keys the builds use), `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `STAGING_URL`, `R2_ACCOUNT_ID`, `BACKUP_BUCKET`, `BACKUP_AGE_RECIPIENT`, `SENTRY_BACKUP_CRON_URL`; Actions allowed to create pull requests
- [ ] R2 buckets `rongwaps-backups` (lifecycle + 7-day lock) and `rongwaps-materials`
- [ ] Sentry alert on new issues; backup cron monitor
- [ ] Supabase → staging project → Authentication → URL Configuration: the staging site address above in Site URL and Redirect URLs
- [ ] Render: delete both web services once the Cloudflare site has run a week (they are suspended and unused)
- [ ] Staging Google sign-in client; owner email in staging `private.beta_owner_emails`
- [ ] First restore drill into a new project, timed
- [ ] `scripts/release/backup/verify-key.sh` for the Mac and password-manager keys
- [ ] Optional GitHub secret `CLOUDFLARE_ANALYTICS_TOKEN` (Account Analytics: Read) for the Health usage check
- [x] Repo Settings → General: "Automatically delete head branches" off (it deleted `production` once; turned off 2026-11-08)

# Configuration reference

## Build and start

- Build: `npm ci && npm run build` (outputs `dist/`: the site, the Brotli copies of every content pack, and Cloudflare's `_headers`; carries the previous week's code files when `CARRY_OVER_FROM` names the live site). `APP_ENV` (`production` or `staging`) and `APP_COMMIT` are set by the Deploy workflow
- Run the built site as Cloudflare does: `npm start` (http://localhost:3000, `wrangler dev` with `server/wrangler.jsonc`)
- Upload: `node scripts/release/cloudflare.ts deploy <config> <commit>` (the Deploy workflow; `manualRelease.sh` on the Mac)
- Node version: `.nvmrc`

## Beta content trim and login gate

- Full course packs and scans are bundled in `dist/data` so accounts with full-course grants can access all books and lessons, while the client and database gate non-granted accounts. `scripts/build/trimBetaContent.ts` can still be run manually if an asset-trimmed beta bundle is specifically desired.
- The server (`server/content.ts`) serves those lesson packs and scans only with a valid Supabase bearer token (`Cache-Control: private`, 1,200/min per learner); `staticContentService.fetchContent` sends the token and the book-page viewer loads scans as blobs. Keep the gated folder list in sync between the two files.
- Cloudflare serves a file without running the server only when its address is on the public list in `server/wrangler.jsonc` (`run_worker_first`). `/data` is never on it, and an address that matches nothing on the list reaches the server, so the lock fails closed. `npm run server:test` runs the real rules in Cloudflare's local runtime; `tests/unit/serverAssets.test.ts` keeps the list in step with the build.
- Probe after deploy: `curl -i https://<host>/data/vocabulary/book-1.json` must return 401; `/data/dictionary/manifest.json` must also return 401 without a token. Every `/data` pack is gated, dictionary included.
- Use `curl --path-as-is` to check encoded mount names (`/%64ata/grammar/book-1.json`) and duplicate slashes (`//data/grammar/book-1.json`) also return 401 without a token. The gate normalizes the full request path before serving any file.

## Decomposition runtime pack (V3 character breakdowns)

- `public/data/decomposition-runtime/` ships with the app and is served only through the same authenticated `/data` gate (`server/content.ts` gates the whole directory). The published runtime pack is the default; set `VITE_DECOMPOSITION_RUNTIME=legacy` to roll the breakdowns back to the legacy service.
- Produce the pack in two scripted steps; never hand-edit it: `npm run decomposition:pack:promote` verifies every shard against the candidate manifest checksums and requires cleared license reviews in `content/character-decomposition/license-reviews.json`; `npm run decomposition:pack:publish` copies the promoted pack into `public/data`.
- The published manifest must read `"publishable": true`, `"distribution": "production"`, and a `licenseGate` with `"status": "approved"` and no open blockers. `RuntimePackLoader` refuses anything else in production, so a bad pack degrades to legacy instead of serving a candidate.
- License: the pack derives from CHISE/CJKVI IDS (GPL-2.0-or-later), Make Me a Hanzi dictionary data (LGPL-3.0-or-later) and CNS11643 open data (OGDL 1.0), and is distributed under GPL-3.0-or-later. `NOTICE.txt` and `licenses/` ship inside the pack; the Terms page carries the user-facing credits. Keep both in sync when sources change.
- Probe after deploy: signed out, `/data/decomposition-runtime/manifest.json` returns 401; signed in, it returns the manifest with `publishable: true`.

## Environment variables

Client (build-time, public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `VITE_CONTENT_BASE_URL`, `VITE_AUDIO_BASE_URL`, `VITE_SENTRY_DSN`, `VITE_DECOMPOSITION_RUNTIME` (`legacy` rolls the breakdowns back; the published runtime pack is the default), `VITE_DECOMPOSITION_RUNTIME_PACK_BASE_PATH` (defaults to `/data/decomposition-runtime` in production builds).

Server (`server/env.ts`): public values in `server/wrangler*.jsonc` (`APP_ENV`, `SUPABASE_URL`, `GAMES_SERVER_URL`); `COMMIT` and `SUPABASE_ANON_KEY` passed with each deploy; Worker secrets `RESEND_API_KEY`, `FEEDBACK_EMAIL_FROM`, `FEEDBACK_EMAIL_TO`, `SENTRY_DSN`. `npm run dev` reads the same names from `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for the two Supabase values).

Error tracking: the server reports to the same Sentry project as the browser (`SENTRY_DSN`; never on staging), tagged with the release (the commit). Build-time secrets `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (production only) upload hidden source maps for readable stack traces; `scripts/build/uploadSourceMaps.ts` then deletes every map from `dist`.

`TYPESAFE_API_KEY` is used only by local/CI Jev content-review tools, not the deployed app server. Azure Speech credentials are not used. 

## Supabase dashboard

### School-only beta access

Apply `supabase/migrations/20261016015445_school_beta_access.sql` before deploying the matching app/server. The database owns the authorization rule: a verified Google identity with a student email (`s` + digits + `@stu.edu.tw`) and Google Workspace `custom_claims.hd = stu.edu.tw`, or a verified Google email explicitly approved in `private.beta_owner_emails`. This confirms school-account membership, not current enrollment. The school-beta migration itself seeds no owner exception; the full-course migration below adds the explicitly approved owner account.

`20261018154836_full_course_access_grants.sql` and `20261020102750_grant_owner_full_course.sql` add a private per-account lesson grant and seed `gwaporon311@gmail.com` in both the full-course table and the beta-owner allowlist. Apply them before deploying the matching client. It unlocks all lesson books for that verified Google account; delete its full-course row to revoke the lesson grant, and its beta-owner row to revoke beta access too.

Enable these Authentication hooks after applying the migration:

- Before User Created: `pg-functions://postgres/private/before_school_beta_signup`
- Custom Access Token: `pg-functions://postgres/private/school_beta_access_token_hook`

The first filters registrations; the second checks provider-owned identities on sign-in and refresh and, since `20261101120000_access_claims_in_token.sql`, stamps its decision into the token it issues (`school_beta: true`, `full_course: true|false`). The PostgREST pre-request function and restrictive user-table policies keep checking identities on every request and never trust those claims. Express checks the token signature against the project's signing keys (`shared/accessToken.ts`) and trusts the stamped claim without calling Supabase; the client reads the same claims before publishing a signed-in user. Tokens without the claims (issued before the migration, legacy shared-secret tokens, a signing-key outage) fall back to `getUser` plus `has_beta_access` in Express and to the `has_beta_access`/`has_full_course_access` RPCs in the client. Existing users and progress are retained.

### Public accounts

**Launch** (`shared/publicLaunch.ts`): sign-up opened to anyone 18+ on 2026-11-06, Study together included (owner decision, 2026-11-05). New accounts accept the new Terms and Privacy at sign-up and start with initials; accounts made earlier are bound from 2026-11-14 (the notice). Shu-Te viewers see Shu-Te learners first in the online list, faces and lesson lists (`games/lobby.ts`, `public_account` claim).

Owner steps to open sign-up, in order (the release with #77 and #79 and the `20261106120000` migration must be live first):

1. Google Cloud → Google Auth Platform → Audience: External and **In production** (in Testing, only listed test users can sign in). Branding (name, logo, support email, Privacy and Terms links) can follow: until Google checks it, the sign-in screen names the Supabase address.
2. Supabase production → Authentication → Hooks: *Before User Created* `private.before_school_beta_signup` and *Custom Access Token* `private.school_beta_access_token_hook` both on; Sign In / Providers: Email off.
3. Production SQL editor: `update private.signup_settings set public_open = true, updated_at = now();`
4. Sign up with a personal Gmail on ronsmandarin.com (a private window): the age step, then the app. Then `select private.public_account_count();` should say 1.
5. On or after 6 Nov, redeploy production once (a release, or Actions → Deploy → re-run) so the prebuilt landing and About pages carry the new wording for search engines; again on or after 14 Nov is optional.
6. Each morning: the Health issue. Raise `public_cap` (300) in steps as it suggests.

**Launch week checklist** (owner; updated 2026-11-05 for opening on 6 Nov):

| By | Step |
| --- | --- |
| Thu 5 Nov, night | Release #77 + #79: migration `20261106120000` on production (Migrate production, or the SQL editor), the Study together server, then the app. Steps 1–4 above. Repo Settings → General: untick "Automatically delete head branches". GitHub Billing when you can |
| Fri 6 Nov | Promote. Watch the Health issue and "Not safe" emails. Redeploy once (step 5) |
| 7–13 Nov | Cloudflare → Workers → Overview: requests a day against 100,000. Sentry: client-key rate limit (about 100 an hour) and spike protection. Worker secrets: the three feedback email settings exist; send one test feedback. `verify-key.sh` for both key copies, then fetch and restore-check one backup. Run Health once with *test* ticked. Supabase JWT expiry 900 s with a higher token-refresh rate limit, set together |
| Sat 14 Nov | The new Terms and Privacy bind accounts made before 6 Nov. Morning: Health issue |

Once open, accounts refused for not being Google or not verified see "Sign in with a Google account whose email is verified" (`google_only:`). `school_beta_only:` reads "Use your s…@stu.edu.tw account" before 6 Nov and "closed to new sign-ins for now" after it (the emergency stop). Reports older than 12 months are deleted daily at 03:10 Taiwan (`delete-old-reports` cron job).

`20261104120000_public_accounts.sql` lets any Google account with a verified email in, once the owner opens it. It ships closed: until then nothing changes. The hooks above stay as they are. Settings live in the database, so changing them needs no deploy (Supabase dashboard → SQL editor, staging first):

| To | Run |
| --- | --- |
| Open to everyone | `update private.signup_settings set public_open = true, updated_at = now();` |
| Raise the sign-up cap | `update private.signup_settings set public_cap = 500, updated_at = now();` |
| Pause new sign-ups only (everyone signed up keeps access) | `update private.signup_settings set public_cap = 0, updated_at = now();` (new people see "full for now"; set it back to resume) |
| Emergency stop (public accounts lose saving and lessons at once, Study together at their next sign-in refresh; school ones keep it; no data deleted) | `update private.signup_settings set public_open = false, updated_at = now();` |
| Ban an account | `insert into private.account_flags (user_id, banned_at, banned_reason) values ('<user id>', now(), '<why>') on conflict (user_id) do update set banned_at = now(), banned_reason = excluded.banned_reason;` |
| Unban | `update private.account_flags set banned_at = null, banned_reason = null where user_id = '<user id>';` (also frees the Google account for sign-up again) |
| Count public accounts | `select private.public_account_count();` |

A ban stops database requests at once and sign-in at the next token refresh (within an hour); the landing page then says "This account can't sign in". It also keeps a one-way code of the Google account (`private.banned_identities`, 2 years), so deleting the account doesn't let the same Google account join again. A new public account that never answers the age step (and saved nothing) is deleted after 7 days (`delete-unconfirmed-accounts` cron job, 03:20 Taiwan); accounts from before 2026-11-06 are never touched by it. New public sign-ups past the cap are refused with `signups_full:` (the landing page says it is full for now); existing accounts keep access. A new public account sees a one-time age step before the app (`src/screens/auth/AgeCheck.tsx`): "I'm 18 or older" records it with `confirm_age()`; "I'm under 18" deletes the new account and returns to the landing page. Check with `npm run db:test` against a local or staging database (every file rolls back; it refuses production).

### Reports, blocks and limits

Learners report from a profile's ⋯ menu or under a chat line (a reason in one tap) and can block from the same places; a blocked pair stops seeing each other in Study together (online lists, faces, chat, mentions, cheers, invites, profile visits), and party chat hides the other person's lines. Unblock: Settings → Study together → Blocked people.

| To | Run (Supabase SQL editor) |
| --- | --- |
| Read new reports | `select r.id, r.created_at, r.reason, r.place, r.message, r.reporter, r.target from private.user_reports r order by r.id desc limit 50;` |
| Who an account is | `select email, raw_user_meta_data->>'full_name' as name from auth.users where id = '<user id>';` |
| Ban the reported account | the Ban row under Public accounts above |
| Check a chat report against the server's copy | Cloudflare → Workers → rons-mandarin-games → Durable Objects → **Lobby** `main` → Data Studio: `select * from reports where msg = <message_id>;` (kept 30 days; party rooms keep `room_reports` only until the room closes) |
| Look at a reported photo | `target_photo` is the Google photo link, or the path of an upload: Supabase → Storage → `profile-media/<user id>/avatar.webp` (a learner can replace it, so look soon) |
| Remove a photo | Delete that file in Supabase Storage, and ban if needed; the learner falls back to initials |

A report's `message` is what the reporter's app sent, so it can be invented: before banning for a chat line, find the same line in the server's copy (row above). `message_id`, `target_name` and `target_photo` say which line, name and photo it was.

Daily limits per account (UTC day): 300 chat lines per chat, 200 cheers, 60 party invites, 20 reports. Display names with words on the list in `shared/nameFilter.ts` (after folding accents, look-alike letters, dots and spaces), links, emails and phone numbers are refused by the games Worker and the profile editor; chat lines have those words masked as ＊＊. Names that pose as the app ("Ron" on its own, "Admin", "Staff", 官方, 老師) are refused by the Worker except for `OWNER_EMAILS` (`games/wrangler*.jsonc`). New accounts that haven't answered the 18+ step can't join Study together. Extend the lists in that file. A banned account's open Study together connection ends when its sign-in does (within an hour; tickets last at most 15 minutes). To end it at once, use `SOCIAL_BANNED` below.

### Study together emergency

| To | Do (Mac, `npx wrangler … --config games/wrangler.jsonc`) |
| --- | --- |
| Pause chat and races for everyone, at once | `npx wrangler secret put SOCIAL_PAUSED --config games/wrangler.jsonc` → `1`. Undo: `npx wrangler secret delete SOCIAL_PAUSED --config games/wrangler.jsonc` |
| Shut one or more accounts out, at once | `npx wrangler secret put SOCIAL_BANNED --config games/wrangler.jsonc` → `<user id>,<user id>` (replace the whole list; delete the secret to clear it). Also ban them in the database |
| Remove what someone posted | Cloudflare → Workers → rons-mandarin-games → Durable Objects → Lobby `main` → Data Studio: `delete from chat where uid = '<user id>';` (lines expire after 24 hours anyway) |
| Undo a bad Worker release | `npx wrangler rollback --config games/wrangler.jsonc` |

Changing a secret deploys a new Worker version, which closes every open connection; apps reconnect by themselves, and paused or banned ones are told why. Lessons keep working throughout.

`20261023120000_inactive_account_cleanup.sql` schedules the daily 12-month inactive-account deletion with `pg_cron` (see `docs/DATABASE_SCHEMA.md`). Check `select * from private.inactive_accounts();` after applying it; it must not list anyone who is still studying.

Grant an owner exception only after the owner explicitly supplies the exact Google email; insert its lowercase value into `private.beta_owner_emails` through an administrative database connection. Removing that row immediately denies subsequent database requests; lesson content and the app's start-up check follow at the account's next token refresh (tokens last one hour). Neither client-editable `user_metadata` nor Google's account-picker hints authorize access.

Local security tests: use a disposable Supabase Postgres container, clone its initialized `postgres` database into `school_beta_test`, copy the three migrations into the container, then run `tests/database/schoolBetaAccess.test.sql` with psql's `migration`, `course_migration` and `claims_migration` variables pointing to `20261016015445`, `20261018154836` and `20261101120000`. Where creating a database is impossible (some sandboxes), run a copy against the throwaway container's own `postgres` database and delete the container afterwards. The fixture refuses other database names and never uses real user progress.

`npm run server:test` exercises the gate in Cloudflare's local runtime with canonical, encoded, duplicate-slash and traversal paths using both GET and HEAD, over a small made-up site with synthetic accounts. To check a real build: `npm run build`, `npm start`, then `node scripts/release/smoke.ts http://127.0.0.1:3000 --env production` (signed out; it never writes).

Remaining content exposure: every `/data` pack (lesson, grammar, readings, scans, dictionary, decomposition, memory hooks and other reference packs) requires a school session. Recorded audio remains on the public R2 CDN. School-only authentication does not make those R2 URLs private, nor revoke files previously downloaded. Their protection is a separate content-delivery task.

1. Authentication, URL Configuration: Site URL = production origin; add it (and any preview origin) to Redirect URLs.
2. Providers: enable Google, add the production origin and Supabase callback to the Google OAuth client.
3. Attack Protection: enable captcha.
4. Sign In / Providers, Email: confirm email on; minimum password length set.

## After a release: what a person still checks

The Deploy workflow already checks the live build, database, content gate, service worker and Study together config (`scripts/release/smoke.ts`), and the browser journeys cover sign-in, isolation and saving. Occasionally, and after anything touching these, check by hand on a real phone (Safari) and desktop:

- Google sign-in with a school account; sign out and back in
- a lesson plays recorded audio
- install as PWA; the update prompt appears after a release
- data export and account deletion on a throwaway account

## Domain follow-up

The production domain is `https://ronsmandarin.com`. Add `og:url`, `og:image` (absolute URL), `twitter:image` and canonical link in `index.html`; add `sitemap.xml`; keep `robots.txt` aligned with beta visibility. Keep the Supabase Site URL and Redirect URLs above in sync with this canonical domain.

## Production audio delivery

Set `VITE_AUDIO_BASE_URL` to an R2 custom domain in the Cloudflare zone. The `r2.dev` public endpoint is for development, is rate limited, and does not support Cloudflare edge caching. Rebuild the client after changing this public value.

- Enable caching for MP3 files on the custom domain. Use a finite TTL for filenames whose content can change; use long immutable caching only with versioned filenames.
- Original textbook vocabulary and reader MP3s have `Cache-Control: public, max-age=86400` (one day). The metadata-only update verified all 4,184 objects retained their ETags, lengths, content types and custom metadata. Versioned pronunciation clips keep their longer immutable policy.
- Set bucket CORS to allow GET/HEAD from the production app and localhost/preview origins used for testing. Public, credential-free audio may use `AllowedOrigins: ["*"]` to cover rotating temporary preview domains. Expose `Content-Length`, `Content-Range` and `Accept-Ranges`. Browser streaming can work without CORS while fetch-based preloading/offline downloads fail.
- Verify MP3 range requests return 206 with `Content-Range` and `Content-Length`; verify repeat requests show Cloudflare cache hits on the custom domain.
- Keep audio requests direct to the CDN. The app server handles synthesis/cache misses, not delivery of every recorded clip.

References: [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [R2 and Cloudflare Cache](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/).

### Vocabulary leading-silence pipeline

`python3 scripts/audio/trimVocabularyAudio.py` audits original `modernchinese-B…mp3` vocabulary clips and stages candidates in `output/audio/vocabulary-trim-v1/`. It uses FFmpeg MP3 frame copy, a conservative -55 dB silence threshold, and a 100 ms target lead-in. Actual output must retain 80–160 ms before detected sound; decoded speech from 80 ms through the original last sound must match the original PCM exactly. Inconsistent MP3 seek metadata is handled by measuring the result and backing off. Unsafe candidates keep their original reference. This is waveform verification, not a claim of human listening review.

After a complete audit, `node --import dotenv/config --import tsx scripts/audio/publishTrimmedVocabulary.ts` validates the local assets and vocabulary identities. Add `--upload --apply` to upload immutable, hash-named copies under `vocabulary-trimmed/v1/` and regenerate the vocabulary packs plus manifest. The publisher verifies the source R2 ETags and both copies' hashes before changing references, uses conditional writes, and records provenance in `content/audio/vocabulary_trim.json`. Re-run `npm run flashcard-extras:export` after changing the vocabulary manifest. Existing originals, character sounds, supplements, and aligned reader tracks are preserved. `VITE_AUDIO_BASE_URL` must point to the R2 custom domain serving these copies. Deploy/reload the app to pick up the new pack version; previously stored explicit original URLs still identify the original clips.

### Licensed character sounds

The CNS11643 female pronunciation subset contains 1,262 MP3 files (19,835,565 bytes), including 24 source-labelled book neutral-tone WAVs encoded as mono 44.1 kHz 96 kbps MP3 under `pronunciation/cns-female-20250113/` in R2. It uses the [Open Government Data License 1.0](https://data.gov.tw/license); attribution is shown in Terms. Source labels identify syllable and tone. Neutral clips are reference sounds; full-word recordings remain authoritative for contextual pitch. This CNS import does not split, stitch, replace or generate word audio.

The generated versioned lookup in `public/data/pronunciation-audio/` loads lazily through the existing pack loader. Only explicitly requested clips stream; successfully completed playback subsequently saves that clip through the existing bounded audio cache. Offline replay requires previously cached metadata and clips, available browser storage and bucket CORS. Interrupted playback does not guarantee an offline copy.

`content/audio/cns_pronunciation_audio.json` records source, license and individual hashes. After an authenticated R2 upload verifies every object, `npx tsx scripts/audio/exportCnsAudio.ts` regenerates the public metadata from that receipt. Initial import uses `npx tsx scripts/audio/importCnsAudio.ts --source-dir=<official-female-directory> --upload` with the existing R2 environment configuration. Import checks decoding and uses conditional writes; it does not overwrite textbook recordings. Human listening review remains required; successful decoding is not an audio-quality assessment.

A licensed Commons/Shtooka recording fills the missing 團圓 word recording. Its attribution and CC BY-SA 3.0 US license are in Terms and `content/audio/book_audio_supplements.json`; the MP3 remains under that license. `scripts/audio/exportBookAudioSupplements.ts --apply` verifies its R2 object and regenerates the book reference and manifest without replacing originals. `scripts/audio/auditBookAudio.ts --r2` reports every book’s word references, traditional/simplified character-reading coverage, alignment exceptions and WordBuild tile coverage to `output/audio/book-coverage.json`. R2 credentials come from the existing environment. The audit verifies nonempty assets, not listening quality.

Six additional whole-word MP3s (95,876 bytes) were generated offline with Qwen3-TTS's preset Vivian voice and approved by the owner after the listening preview on 2026-10-11. Four fill absent book word references; 玫瑰 and 人家 remain reading-specific supplements and preserve the original book audio. Model licensing, hashes and review provenance are in the same receipt. The existing lazy pronunciation index carries the six exact word/reading mappings separately from isolated syllables. Character breakdown labels a complete-word fallback; WordBuild never substitutes it on a tile tap. No model ships in the app, and no sentence or reader behavior changes. Owner approval is not an independent phonetic assessment.

### Grammar studio recording quality

`HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/generateGrammarStudioAudio.py --refresh-audio` masters the local studio inventory and regenerates takes above four Chinese characters per second with a slower, connected delivery. It uses the existing Vivian/Dylan voices without tempo stretching. MP3 output is mono, 24 kHz, 96 kbps; the encoder measures delivered loudness and corrects codec peak overshoot to keep true peaks at or below -1 dBFS. Grammar examples play these recordings at their native rate.

Before publication, run `HF_HUB_OFFLINE=1 output/qwen-pilot-venv/bin/python scripts/audio/scoreGrammarStudioTakes.py --verify-manifest`. The local Qwen3-ASR 0.6B 8-bit model must already be cached. This checks file hashes, loudness, peaks and retained speech waveforms, and requires an independent transcription to match every recording's spoken syllables. MMS alignment scores are diagnostic; these automated checks do not claim human listening or independent tone verification. Synthesis uses the authored simplified text to avoid Qwen misreading traditional forms such as 餓, while retaining the selected Taiwan voice and traditional display text.

`node --import dotenv/config --import tsx scripts/audio/publishGrammarStudioAudio.ts --upload` refuses incomplete inventories or missing quality checks, uploads new immutable objects, verifies their stored hashes and writes `content/audio/grammar_studio_audio.json` with provenance and QA results. Then run `npm run content:export` to regenerate grammar packs and manifests before deploying the app. Existing object names remain available for rollback.

## Performance notes

- Lesson packs (`/data/...`) are `private` browser-cached: hashed names for a year, others revalidate. Never `public` (Cloudflare must not store gated content).
- The server never sleeps (Cloudflare Workers), but a learner's connection can be slow. While a learner is signed in, manifests read the browser's saved copy first, then ask the server for a newer one; after 4 s without a full answer the saved copy is used and the server's reply refreshes it for next time (`revalidateOrSavedCopy` in `src/services/staticContentService.ts`); a refetch after a deploy removed a listed part always asks the server. Content requests wait up to 75 s before failing, and the Books skeleton says "Still loading. The connection is slow." after 5 s.
- The dictionary runs on the device (`src/services/dictionaryEngine.ts` in a worker): no server searches. Tapping a word reads one small dictionary shard; the first search downloads the search index (about 4 MB, kept by the browser until the index changes), while the common-words pack answers at once. An idle dictionary worker is closed after 5 minutes to free memory.
- Study packs ship same-lesson examples only; other-lesson examples load via "Show more" from `flashcard-extras`. `npm run perf:check` enforces size budgets (study part ≤ 30 kB Brotli, book page ≤ 250 kB).
- Book pages: `npm run book-pages:recompress` (1100px, q72; needs `cwebp`/`dwebp`, skips already-small pages).
- Audio CDN (optional): put the `vocabulary-audio` bucket behind a CDN/Cloudflare R2 custom domain and set `VITE_AUDIO_BASE_URL` to its origin at build time. Files already have content-hashed names, so use long immutable caching.
- Every `dist/data` JSON gets Brotli/gzip sidecars from `npm run build:precompress` (last build step; re-run it after a manual `trimBetaContent`). The server ignores a sidecar older than its JSON.
- Manifest-listed packs are fetched as `file.json?v=<sha256>`; the server sends those as immutable (1 year), so repeat visits make no request at all. Breakdown opens use one `decomposition-runtime/hot.json` (all course characters + parts) instead of ~8 shard requests.

# Study together (presence, global/lesson/party chat, quiz races)

Signed-in students see who is studying each lesson (faces on Books tiles, "N here" in the lesson window, faces in the practice header), open the compact global face stack in the Books header for classmates’ profiles and current lessons/activities, chat globally or per lesson, send preset cheers (加油！ 好棒！ 一起考試？ 等我一下) and race each other in the mixed vocab quiz. Settings → Show me online hides presence; messages and race participation remain visible when used.

## Ownership and transport

- `shared/lobby.ts` owns validated Lobby frames; `shared/quizRace.ts` owns selection, seats, rounds, progress and expiry. A room has at most six players. Starting requires at least two players and every reserved seat to be connected. Between rounds the host can remove a player: their socket closes with code 4003, their seat is freed, and `room.removed` stops them rejoining that room.
- `shared/accessToken.ts` (shared with the site server) verifies Supabase JWT signatures, issuer, audience, authenticated role, anonymous status and expiry against project JWKS. Concurrent key fetches coalesce; imported keys are cached for 10 minutes and unknown key IDs can refresh at most once per minute. Signing-key outages return retryable 503 responses. The school token hook remains the beta-access authority; user-editable metadata is not authorization.
- `games/lobby.ts` is one hibernating SQLite Durable Object (`main`). Presence lives in socket attachments and starts hidden until the privacy preference arrives; an in-memory index (by account and by chat channel) is rebuilt from them after each wake and by every maintenance alarm, so a chat line reaches only its channel's subscribers and a mention, cheer, invite or card only its recipients. Presence changes go out at most once every 2 seconds (a trailing timer, not a billed alarm); unchanged frames are suppressed per socket. Everyone receives compact lesson counts and four global face samples, ordered longest-present first; each lesson list carries its first 30 people (the count stays exact). The Online list is a snapshot of at most 100 people (this lesson first, then the most recently active), sent when the social panel opens and on request (`roster`, at most every 3 seconds), never streamed. Open-room listings (newest 20, reused for 30 seconds unless a listing changes) go only to open panels for current clients (`sub` with `v: 2`) and to every subscribed socket for older ones. Maintenance (stale sockets, expired rows) runs every 5 minutes while anyone is connected. Lobby tickets are rate-limited inside the Lobby (30 burst, one per 2 seconds), saving the account-object request. The lobby admits 2,000 active connections (`LOBBY_CAPACITY`, measured in `docs/reports/scale-audit.md`).
- Global chat uses channel `0`; lesson channels use their existing lesson keys. Chat shows the last 50 messages **per channel** for 24 hours. Expired chat, tickets and listings are removed by alarms, including after everybody leaves. Reports deduplicate per reporter/message and retain at most 1,000 rows for 30 days. With no connections, cleanup runs hourly. Chat requires a subscription to its channel. Text is capped at 300 Unicode characters, controls/bidi overrides are stripped, and markup renders as plain text. Chat limits persist by account across reconnects: one message/second, five/10 seconds, and no identical repeat within 30 seconds. Other limits: one cheer/3 seconds, ten invite batches/minute, plus a socket token bucket. Muting is a local notification preference.
- Mentions use selected account IDs rather than typed names. The server checks visible classmates or recent channel authors, and active room members for party chat. A bounded 30-item inbox and message snapshots live for 24 hours; read state and delivery deduplication survive reconnects. Party delivery uses a room outbox with five-second retries; room membership is checked before private previews are replayed. Opening a lesson mention follows its chat without changing study presence. Party mentions open the current room or an authorized message snapshot; unavailable rooms show a fallback. Mute suppresses live alerts.
- Profile visits: tapping a classmate (people list or chat avatar) asks the Lobby for their visit card (`card-ask`); the Lobby forwards it to that classmate's socket, whose own device answers with a `ProfileCard` (cover, book, start month, words/characters known, streak) or `null` when Settings → Show my profile is off. Both people must be visibly online. The Lobby forwards the card to the asker without storing it and keeps a cover URL only when it is a signed `profile-media/<id>/cover.webp` link.
- `games/room.ts` is one hibernating Durable Object per race. SQLite stores the authoritative state and reconnect deadlines. Private party chat uses this same authenticated room socket, checks active membership on every send/report, retains at most 50 messages for the room’s lifetime (never over 24 hours), and shares the same text/cooldown rules. Its history and reports are deleted with the room. The Party/Chat tabs remain available in the room; the practice header opens party chat during a race. The room is also held in memory: an answer-count-only change is broadcast at once but written at most every 10 seconds (a timer), while phase changes, finishes and membership changes are written immediately; after an eviction each player's next answer restores their cumulative count. Rooms last 30 minutes; a race has a 10-minute deadline and at least five minutes remain after that deadline for results. Alarms enforce deadlines without any browser staying open. Empty rooms leave listings immediately and reclaim stored rows/alarms shortly afterward. Expired room codes cannot be joined.
- Start begins a 60-second preparation window. Every client must build the same seeded quiz, load its first question and audio, and send a SHA-256 fingerprint of its selected deck and plan. The race clock starts only after all connected clients are ready with matching fingerprints. A content mismatch fails immediately; clients that never finish preparing are removed at timeout, and the race ends if fewer than two players remain.
- Each account has a coordination object: five creations/hour, a connection-request bucket for room requests (30 burst, 30/minute refill; Lobby tickets use the Lobby's own bucket), one reserved/current room, and conditional release. Repeated create requests reuse the existing room code. Upgrading a socket in another room removes the old seat; moving away from a host seat transfers ownership. Old cleanup cannot release the newer room's claim. Room codes/links are capabilities for signed-in school users; closed listings do not implement a separate invitation ACL.
- Invitations reuse the current waiting room. The server checks the sender's current membership and whether that room still accepts players, rather than trusting a stale listing. Full, expired and unauthorized invitations produce feedback. Room revisions prevent delayed listing publications from overwriting newer state. Pending listing updates persist through eviction and retry every five seconds; final room cleanup waits for the Lobby to acknowledge closure, up to its 35-minute listing retention window. An open room announces once in the first selected lesson's chat.
- Never-public rooms do not publish to or create records in the Lobby; invitations check the room directly. Once a room becomes public, subsequent visibility/closure updates still publish and retry durably after failure or hibernation. Listing publications compare visible summaries, ignoring the state revision: readiness, scores and temporary disconnect/reconnects do not republish unchanged listings. Room and Lobby scheduling retain an existing earlier alarm rather than writing it again for every action; that alarm recomputes the next deadline when it fires. Hibernation and automatic ping replies remain enabled.
- Explicit Leave removes the seat immediately, transfers the host to a connected participant where possible, and closes an empty room. A temporary disconnect reserves the seat/host for **60 seconds**. Returning within that window retains progress; after it, a lobby seat is removed or a racing player is marked Left, and ownership moves on. Half-open sockets time out after 90 seconds without activity/pong; that begins the same reconnect window.
- Client and server limit outgoing client frames/HTTP join bodies to 4 KiB, including avatar URLs; byte counts include multi-byte text. Client sends stop when the WebSocket buffer exceeds 64 KiB.
- Socket tickets are one-use and expire after 30 seconds or JWT expiry, whichever is sooner. They travel in WebSocket subprotocols; access tokens only travel in HTTPS Authorization headers. Connections reauthorize at JWT expiry or after 15 minutes. Only `APP_ORIGIN` is accepted. Authenticated `POST /rooms/:code/leave` is an idempotent fallback when the leave frame cannot arrive. Replacement/expired connections clear their local view without sending Leave against the new tab.
- Client transport uses jittered exponential backoff capped around 15 seconds, handshake/pong watchdogs, online/visibility wakeups, cancellable ticket requests and generation guards. Temporary outages keep retrying; permanent access/room failures stop. Lobby sockets close 30 seconds after hiding the tab. Race sockets stay available for background reconnects; mobile OS suspension is still subject to the grace deadline.
- Progress retains only the latest unsent update and replays it after reconnect; successful duplicate reports are suppressed. Every room command carries a round number, so old-round frames cannot affect a rematch. Each player's first nonzero deck size is frozen. Counts are monotonic and correct answers cannot grow without progress. Rapid host settings edits coalesce while awaiting the previous acknowledgement; Start waits for the final choices to be saved.
- A race uses one book from `RACE_BOOKS` (`shared/courseAccess.ts`: Book 1 Intro–16, Books 2–4 1–16). All four books are open in the beta; selections without a book are Book 1. Races use their own selection directly, without overwriting personal lesson picks or switching to a library/review deck. Personal exclusions, confusion history, match preferences, shuffle/restart and mode switching cannot alter the race plan. The same seed and canonical card order drive each phone. Progress-only snapshots preserve configuration references so competitors' answers do not re-render the whole quiz or reload its deck.
- A network reconnect preserves the current mounted quiz. Waiting rooms and results can reopen from tab session storage after a reload. **Reloading an unfinished race withdraws the player**, rather than replaying previously recorded SRS answers. A fresh page/device cannot restart a race that already reports its progress. Closing the quiz also leaves the race. Sign-out/unmount cancels pending joins and closes transports. The DEV simulator refuses to start a quiz while signed in.
- Scores are self-reported by clients: this is a casual learning race, not a cheat-proof assessment. The server validates lifecycle/count invariants but does not receive or grade answers. The first-question fingerprint catches content/version divergence before start; later recordings still load on demand, and real mobile background behavior needs device checks.

## Setup status

The Worker needs a redeploy for this version (new `LOBBY` binding, migration `v2`, `SUPABASE_URL` var). The site server's `GAMES_SERVER_URL` stays the same. Persisted rooms from the previous game are rejected and reclaimed rather than interpreted as quiz races. A two-account production check remains a launch step.

For a fresh checkout:

1. Inspect `wrangler --help`, `wrangler types --help`, `wrangler dev --help` and `wrangler deploy --help` through the project-local binary. Verify script flags against that version.
2. Run `npm run games:types`, then `npm run games:check`. Generated binding declarations are ignored; regenerate them for every fresh checkout and binding change.
3. For local development, run the normal app on localhost:3000 and the Worker on localhost:8787. Override the Worker's `APP_ORIGIN` to exactly `http://localhost:3000` using the installed CLI's documented variable override. The development server defaults `GAMES_SERVER_URL` to localhost:8787. Signed-out dev mode has no token, so study together stays off there.
4. For production, keep `APP_ORIGIN=https://ronsmandarin.com`, verify the authenticated member's Workers deployment role, then `npm run games:deploy`. The client obtains the public origin from `/api/games/config`; no rebuild or custom game domain is required.

Without `GAMES_SERVER_URL` (or when the Worker is down) every social element stays hidden and lessons keep working.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run jev:lint`, `npm run games:check`, `npm run games:test` and `npm run games:load` (500 synthetic learners against a local Worker with latency and bytes-per-learner budgets; `scripts/load/README.md`). The runtime suite uses real SQLite Durable Objects in Miniflare and throwaway signing keys; test-only alarm controls are bundled exclusively into that harness. It covers host handoff, hibernated reconnect, duplicate creates, authoritative HTTP leave, abandoned seats, cross-room takeover, unauthorized invites, replayed tickets, JWT/origin rejection, per-lesson history, report deduplication and expired-data cleanup. Client tests cover cancelled requests, stale callbacks, latest-progress replay, settings acknowledgements, fatal closure, watchdogs and outages beyond six retries. The app-server suite also exercises 150 cold authenticated accounts behind a single campus IP.

The synthetic load scenario opens **150 Lobby sockets plus 150 race sockets in 38 rooms**, converges one 150-person lesson count with its capped list, checks requested Online snapshots and that presence changes never stream them, checks panel-aware clients get room listings only while the panel is open, fans out 150 chat messages to all students, and sends **40 progress reports per student (6,000 total)** before finishing all races. Test-only counters report actual room SQL rows written, alarm writes and listing RPC calls during the answering phase; counters and control routes are absent from the production Worker. A local comparison on 2026-10-25 reduced alarm writes from 6,000 to 38, SQL rows written from 6,076 to 6,000, and listing calls from 38 to zero; throttled answer-count writes (2026-11-01) reduced the 6,000 rows to 188, and the suite now fails if rows exceed one per four answers. The optimized run measured 1.76 s presence convergence, 444 ms chat fanout and 61 ms p95 completion publication; JWKS was fetched once. These counts exclude setup, cleanup, Lobby/account objects and billed compute duration. They are local correctness/stress measurements, not deployed billing totals or a daily quota guarantee.

Before launch, exercise two school **test** accounts against the deployed Worker: presence, chat, invite → existing room → Join, host Leave, network loss/rejoin, results/rematch, Report/mute, and a complete race on 390-pixel mobile and 1440-pixel desktop. Reloading an unfinished race should withdraw rather than record answers again. Never race on the owner's real deck. Deploy the Worker and app together: older clients do not send required round numbers, and the short-lived legacy tickets will need to be reissued.

Throughput is no longer the first limit for one school: the Lobby admits 2,000 sockets and converged 2,000 in 2.8 s locally (`docs/reports/scale-audit.md`). On the Workers Free plan the daily allowances below run out first; daily cost depends on connections, messages, race answers and active duration. The Workers Free allowances are 100,000 Durable Object requests, 13,000 GB-s and 100,000 SQLite rows written per day. Incoming WebSocket messages count at 20:1 for request billing; outgoing frames and auto-answered pings are not billed as requests. Alarms, RPC calls, ticket/seat records and state writes also consume resources. For example, 150 students each answering 40 race words generates 6,000 progress events before setup/cleanup. Rooms write answer counts at most every 10 seconds: the 150-learner scenario wrote 188 room rows for those 6,000 answers (one per answer before), and a real 5-minute, 4-player race writes roughly five times fewer rows than before. Observe deployed request, duration, SQL and error metrics before promising sustained daily capacity. Free-plan allowance exhaustion can stop social features until reset; ordinary studying remains independent. See Cloudflare's [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and [WebSocket guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).

### Capacity follow-up — October 29, 2026

Run `npm run games:test -- --users 250 --soak-seconds 120` for the extended local scenario. The default remains 150 users and 10 seconds of paced answers. Users must be even, from 2 to 250; pacing accepts 10–300 seconds. The runner dispatches only into its own Miniflare runtime, uses throwaway JWT signing keys and synthetic accounts, intercepts external key requests, and cannot be pointed at production. No production authentication bypass, new dependency, deployed resource or real learner record is needed.

The extended run ramps in groups of 50, checks a full one-lesson roster, delivers every student's chat message to every subscriber, replaces all Lobby connections, then runs four-player races (the last room may have two players). Setup batches bound the local dispatcher's loopback TCP connections; all student sockets remain connected concurrently. An unbounded setup burst initially produced local `ECONNRESET` failures, so this is not evidence that production can accept 250 simultaneous TCP handshakes. The suite also checks the connection past capacity is rejected (the harness sets capacity to its user count; production admits 2,000), an abusive sender alone is disconnected, expired sessions close, and unchanged presence does not fan out again. Auto-response pings keep idle Lobby sockets healthy during long races.

Measured on one local 250-user run with 120-second answer pacing:

| Measurement | Result |
| --- | --- |
| Concurrent sockets / race rooms | 250 Lobby + 250 race sockets / 63 rooms |
| Chat deliveries | 62,500, all received |
| Full chat burst fanout / p95 subscriber batch completion | 1,626 ms / 1,607 ms |
| Lobby replacement and roster convergence | 2,308 ms |
| Answer updates / p95 race completion publication | 10,000 / 102 ms |
| Answer-phase room SQL writes / alarm writes / listing RPCs | 10,000 / 126 / 0 |
| Unexpected Lobby/race disconnections or race action errors | 0 before intentional rate/expiry checks |

Chat timing measures receipt of the entire 250-message burst, not per-message p95 latency. Room counters exclude setup/cleanup, Lobby and account objects, SQL reads and billed duration. Two minutes is a short sustained check, not an all-day soak or production capacity guarantee. Keep 100–150 simultaneous users as the conservative planning target until the full deployed app is measured; 250 remains the Lobby admission ceiling.

One slow-network bug was reproduced and fixed in the shared client transport: an outgoing buffer above 64 KiB previously rejected frames while leaving the socket live, so a final race update could wait indefinitely without another snapshot. Congestion now closes the connection through the existing reconnect path; the existing controller replays current progress after recovery. Regression checks cover congestion recovery and oversized Unicode frames without disconnecting a healthy socket. Ordinary chat also skips presence/history eligibility scans when there are no selected mentions; mentioned messages retain the existing authorization checks. No end-to-end latency improvement is claimed from that change.

Read-only production inspection found Workers Logs/Traces enabled. The Lobby's last-24-hour dashboard showed 757 requests, 29 aggregate errors, 28 classified client disconnects, zero displayed CPU-limit/memory-limit/internal/uncaught-worker errors, about 1.64 MB p99 memory, and 201 SQL rows written. The displayed categories did not account for every aggregate error; do not reinterpret the remaining difference as a diagnosed bug. These are low-traffic historical observations, not measurements under the synthetic load. Long WebSocket request wall times are not chat-delivery latency.

The captured production browser console had no warnings/errors. A historical local `PeoplePanel` initialization error was present; the current source already ordered that declaration correctly, and opening the panel succeeded. The DEV 50-classmate simulator also opened without a captured console error. Browser automation stalled during responsive viewport testing, so mobile/desktop end-to-end races, physical Safari checks, real database load and cloud quota exhaustion remain unverified. No fake crowd was sent to production, and no deployment or hosting-plan change was made.

## In-app feedback

Apply `20261025120000_private_feedback.sql` before deploying the feedback form.
The only write path is the authenticated `submit_feedback` RPC; the private
inbox is available to the operator through SQL, not client APIs.
Run `supabase db query --linked --file supabase/tests/feedback.sql` to verify
permissions, school access, retry deduplication, validation, hourly caps and
account-deletion cleanup. The fixtures are synthetic and rolled back.

For automatic operator email, configure these **server-only** variables in the
web host (never in Vite/client config):

- `RESEND_API_KEY`: a Resend sending API key.
- `FEEDBACK_EMAIL_FROM`: a sender on your verified Resend domain.
- `FEEDBACK_EMAIL_TO`: the operator inbox, e.g. the public contact address.

No new npm dependency is needed; the server calls Resend using native fetch.
Send a clearly labeled test from a designated test account and verify delivery
after configuration. Do not test against the owner's learning progress.
Submission success confirms database storage; email is best effort and failures
log only the submission UUID. Inspect the private inbox if email is unavailable:
`select * from private.feedback order by created_at desc;`.
