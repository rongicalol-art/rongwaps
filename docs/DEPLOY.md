# Deploy checklist

One Node service (`npm run build`, then `npm start`) serves the SPA and the API. Works on Render (Web Service) or Cloudflare. Names only below; set values in the host dashboard, never in git.

## Beta readiness audit — October 23, 2026

**Decision: complete the remaining launch checks before invitations; keep Render Free with its cold-start delay accepted by the owner.** The original audit below used metadata and aggregate statistics only; progress failure reproductions used isolated, synthetic hook fixtures. The follow-up fixes are described separately here; no production user records, schema or grants were changed.

### Progress fixes — October 23 follow-up

- Fixed the three progress blockers in this audit: late async sync results are scoped to their starting login snapshot, each sync operation pins its bearer token across requests/batches, failed saves and pulls retry with bounded backoff, and failed resets restore the entire cleared progress state after waiting for active sync. Reconnect pulls before flushing pending work. First-pull retries retain reviews made locally after an account switch.
- `tests/unit/cloudSyncLifecycle.test.ts` exercises the actual hooks and slice actions with synthetic transport/effects. It covers account switches, sign-out, a new login to the same account, overlapping pulls, pending uploads, retry/reconnect, reset rollback, and bearer-token isolation across 501-record uploads. It does not use real learner progress.
- The follow-up suite passed **1,110 tests**, including the lifecycle regressions. The production build and size budgets passed. The scoped Jev gate has no applicable rules for these backend/state files; it is not an independent semantic review of the lifecycle.
- The Render dashboard confirmed `ronsmandarin` uses the **Free** compute plan. Its cheapest displayed paid option is **$7/month, 0.5 CPU, 512 MB RAM**. The owner explicitly chose **Keep Free for now** after reviewing that price. No paid upgrade was submitted; cold-start delays remain an accepted beta limitation.
- The security/device/restore checks listed below remain open. Concurrent grammar, add-card and flashcard work is outside this fix; rerun the release gate on the final combined release candidate.

### Fix before invitations

| Priority | Finding and evidence | Required fix and acceptance |
| --- | --- | --- |
| P1 | A late cloud pull from account A can mutate account B's active local store. `src/hooks/useCloudSyncFetch.ts` applies results after `getSyncState` without checking whether the request still belongs to the current session. A deferred A request completed after B's pull injected A's card into B's store and replaced the checkpoint with A's. | Guard asynchronous sync work by the current account/session generation, including after every awaited operation and before errors/status writes. Audit the save path as well. Regression: switch A → B and sign out while reads/writes are pending; late successes and failures must not mutate the new session or send its predecessor's state. This is a client race; no cross-user database-policy bypass was demonstrated. |
| P1 | Failed auto-saves do not schedule a retry. `src/hooks/useCloudSyncSave.ts` records backoff but its timer catch only logs. A fixture with one failed save ended with zero timers. An initial failed pull also lacks an explicit reconnect retry. | Schedule bounded retries through the existing sync lifecycle and reconnect handling; clear them on account/session changes. Regression: fail once, restore connectivity without another review or tab switch, then observe the pending upload succeed once without duplicate review events. |
| P1 | Failed progress reset loses the unsynced review outbox. `useResetProgress.ts` calls `resetProgress()` before the RPC, but its rollback snapshot omits `reviewEvents`, `pendingReviewEvents`, `dailyReviewPlan`, `learningBatches` and `wordConfusions`. A rejected reset restored card SRS while leaving the previously nonempty outbox empty. | Restore all state cleared by the reset on failure, taking the snapshot after any wait for active sync. Regression: an offline/failed reset preserves unsynced event IDs, history, plan, confusions, batches, SRS and grammar progress. |
| P1 release readiness | The first production visit returned HTTP 503 and Render's application-loading page. After waking, the site returned 200. The cold-start interstitial was captured in an isolated mobile browser. | Use always-on hosting for the beta, or explicitly accept the cold-start behavior before invitations. Recheck after an idle interval; the first navigation must reach the app without a provider wake-up page. Hosting settings and plan were not inspected or changed. |

### Database: retain the architecture, measure before redesigning

- All **23 local migration versions** were present in the linked database. All **five public application tables** had RLS enabled and a restrictive school-beta policy. The live PostgREST pre-request hook was `public.require_school_beta_access`.
- Aggregate snapshot: **10 profiles, 607 card-progress rows, 612 review events**. The five public tables plus their indexes occupied roughly **1.5 MiB**. This is a small dataset, not proof of beta-scale capacity.
- Relevant indexes already exist: `(user_id, last_updated)` for card deltas, `(user_id, created_at)` for review deltas, and `(user_id, event_id)` uniqueness for retry-safe events. Content packs stay outside Postgres. Changed-card batching, incremental pulls and debounce are appropriate foundations.
- Historical Postgres statement statistics: `get_sync_state` **6,168 calls, 8.08 ms mean / 569.11 ms max**; `upsert_card_progress` **515 calls, 19.95 ms mean / 161.20 ms max**; `append_review_events` **62 calls, 32.92 ms mean / 220.04 ms max**. These are database execution times over the available statistics window, not network latency, percentiles, a current-client-only sample or load-test results.
- Security/performance advisors returned **20 warnings and no errors** at WARN-or-higher: 12 RLS init-plan warnings, five authenticated `SECURITY DEFINER` RPC warnings, two extensions in `public`, and disabled leaked-password protection. The five RPCs were reviewed for caller ownership and grants; their intended privileged behavior is not, by itself, evidence of a vulnerability. Password protection is lower priority for the Google-only beta.
- The 12 ownership policies can cache `auth.uid()` through `(select auth.uid())`; improve them in a reviewed migration with ownership tests. Existing indexes cover the main sync filters. No new index or schema redesign is justified by the measurements above alone.
- The cumulative deadlock counter was **128**, unchanged in two audit samples; `stats_reset` was null, and no client transaction older than 30 seconds appeared in the sampled health query. Determine timestamps and causes from database logs before attributing this to current sync traffic.
- Cold/full `get_sync_state` aggregates all review history into one JSON response; local history also has no retention bound. Benchmark synthetic 10,000- and 100,000-event accounts in a disposable database before choosing pagination/retention. Do not discard learning history merely to make the response smaller.
- Review events reject pre-reset uploads, but the live card-progress upsert does not check the profile reset epoch. Test an already-running old-device save against a concurrent reset in a disposable database; if stale cards reappear, enforce the reset boundary in a reviewed migration.

### Checks completed

| Check | Result |
| --- | --- |
| TypeScript and ESLint | Pass |
| Test suite | **1,096 passed, 0 failed**; includes content and question-planner fixtures, not signed-in production journeys |
| Jev lint | Pass; zero changed eligible files at the initial audit snapshot, not a semantic review of all content |
| Authored lesson validation | Pass |
| Production build | Pass; 985 JSON files precompressed, 108.1 MB source → 32.1 MB Brotli |
| Performance budgets | Pass: main entry 238,261 bytes; initial JS 840,159; critical CSS 246,036; shell precache 1,160,438. Initial JS is close to its 850,000-byte limit. These are bundle-size budgets, not device performance measurements. |
| Built-server school-beta smoke | Pass: 24 protected path/method cases, malformed paths and public shell |
| Built-server authenticated study smoke | Pass with fixture auth: Brotli/gzip/identity, protected sidecars, conditional caching and dictionary worker |
| Warm production signed-out Chrome | Pass at 390×844 and 1440×900: sign-in renders, no document overflow or page JavaScript errors observed |
| Warm production HTTP probes | `/healthz` 200; anonymous `/data/study/manifest.json` 401 with `private, no-store`; retired grading POST 404 |
| Production legal routes | `/privacy` and `/terms` render with HTTP 200 |
| Dependency audit | Two vulnerable packages: high-severity Vite aggregate advisory finding (development tooling), moderate `ip-address` via production `express-rate-limit`. Review advisory reachability and update the existing lockfile through a separate verified dependency change; no automatic audit fix was applied. |

The checks ran on local Node 26; the deployment configuration requests Node 22. Reproduce the release gate in Node 22/CI before tagging a release. Unrelated grammar-practice edits appeared during the audit; they were not authored or included in the audit documentation commit. Rerun the release gate after all concurrent changes are finalized.

### Evidence still required for a launch decision

- **Disposable database security/integration tests:** exercise both users' reads/writes, RPCs, profile-media policies, review retries, reset races, export and cascade deletion against the current migrations. The existing SQL suites were not executed: Docker's local daemon was unavailable. Metadata inspection and mocked HTTP tests do not replace these tests.
- **Real account lifecycle:** first school Google sign-in, denied personal account, sign-out/re-entry, expired sessions, two-device sync, export and deletion using designated throwaway accounts. Verify deployed signup/token hooks and OAuth redirects; their dashboard configuration was not inspected.
- **Devices and performance:** real iOS Safari/PWA and Android Chrome, mobile audio/range requests, install/update behavior, slow-network startup, a sustained study session and recovery from interrupted preparation. WebKit automation was unavailable because its browser binary was absent. Desktop Chrome results cannot establish Safari or physical-device performance.
- **Content release scope:** name the exact books/lessons testers can use, then complete human review of representative question fairness, meanings, pinyin, recordings and feedback. Validators and unit tests passed; no new whole-course linguistic/listening review or Jev content judgment was performed.
- **Offline expectations:** protected content is deliberately memory-only in `staticContentService`; a cached app shell does not promise a fresh offline lesson after restarting. Grammar completion is account-scoped local state and is absent from the current cloud metadata payload. Document these limits or explicitly scope work to change them before promising all progress syncs.
- **Monitoring and recovery:** verify both browser `VITE_SENTRY_DSN` and server `SENTRY_DSN`, alert delivery, uptime monitoring, backup retention, a restore drill and a known-good deployment rollback. Monitoring code exists, but its live configuration and backup recoverability were not verified. The Render Blueprint does not currently declare either Sentry DSN.
- **Distribution and feedback:** confirm permission for the beta's textbook scans/recordings and third-party asset attribution. Audio remains public on R2, and Express caches verified token access for up to five minutes; immediate content revocation is not guaranteed. Choose the first tester cohort, provide one feedback route, and ask about confusing questions, lost progress, broken audio and slow screens. These are unresolved decisions, not accepted exceptions.

### Research used to choose these priorities

- [Duolingo: frontend prediction](https://blog.duolingo.com/frontend-prediction/) describes immediate local progress, later upload of offline sessions, and explicit reconciliation tradeoffs.
- [Anki: syncing and conflicts](https://docs.ankiweb.net/syncing.html) describes merging review histories and choosing the latest card state when a card is reviewed on multiple devices.
- [Supabase: production checklist](https://supabase.com/docs/guides/deployment/going-into-prod) covers advisors, access policies, load testing and recovery planning.
- [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [query optimization](https://supabase.com/docs/guides/database/query-optimization) support ownership testing and query/index measurement.
- npm advisory references: [ip-address](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5), [Vite filesystem access](https://github.com/advisories/GHSA-rq7h-c2jc-7f22), [Vite middleware](https://github.com/advisories/GHSA-9jrq-w75r-8gcw). The npm Vite finding also includes platform/editor-specific launch-editor advisories; it is not evidence of a production exploit.

## Build and start

- Build: `npm ci && npm run build` (outputs `dist/` and `dist-server/server.js`)
- Start: `npm start`
- Node version: `.nvmrc`

## Beta content trim and login gate

- Full course packs and scans are bundled in `dist/data` so accounts with full-course grants can access all books and lessons, while the client and database gate non-granted accounts. `scripts/build/trimBetaContent.ts` can still be run manually if an asset-trimmed beta bundle is specifically desired.
- The server (`server/index.ts`) serves those lesson packs and scans only with a valid Supabase bearer token (`Cache-Control: private`, 600/min per user); `staticContentService.fetchContent` sends the token and the book-page viewer loads scans as blobs. Keep the gated folder list in sync between the two files.
- Probe after deploy: `curl -i https://<host>/data/vocabulary/book-1.json` must return 401; `/data/dictionary/manifest.json` must also return 401 without a token. Every `/data` pack is gated, dictionary included.
- Use `curl --path-as-is` to check encoded mount names (`/%64ata/grammar/book-1.json`) and duplicate slashes (`//data/grammar/book-1.json`) also return 401 without a token. The gate normalizes the full request path before static-file serving.

## Decomposition runtime pack (V3 character breakdowns)

- `public/data/decomposition-runtime/` ships with the app and is served only through the same authenticated `/data` gate (`server/index.ts` gates the whole directory). The published runtime pack is the default; set `VITE_DECOMPOSITION_RUNTIME=legacy` to roll the breakdowns back to the legacy service.
- Produce the pack in two scripted steps; never hand-edit it: `npm run decomposition:pack:promote` verifies every shard against the candidate manifest checksums and requires cleared license reviews in `content/character-decomposition/license-reviews.json`; `npm run decomposition:pack:publish` copies the promoted pack into `public/data`.
- The published manifest must read `"publishable": true`, `"distribution": "production"`, and a `licenseGate` with `"status": "approved"` and no open blockers. `RuntimePackLoader` refuses anything else in production, so a bad pack degrades to legacy instead of serving a candidate.
- License: the pack derives from CHISE/CJKVI IDS (GPL-2.0-or-later), Make Me a Hanzi dictionary data (LGPL-3.0-or-later) and CNS11643 open data (OGDL 1.0), and is distributed under GPL-3.0-or-later. `NOTICE.txt` and `licenses/` ship inside the pack; the Terms page carries the user-facing credits. Keep both in sync when sources change.
- Probe after deploy: signed out, `/data/decomposition-runtime/manifest.json` returns 401; signed in, it returns the manifest with `publishable: true`.

## Environment variables

Client (build-time, public): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `VITE_CONTENT_BASE_URL`, `VITE_AUDIO_BASE_URL`, `VITE_SENTRY_DSN`, `VITE_DECOMPOSITION_RUNTIME` (`legacy` rolls the breakdowns back; the published runtime pack is the default), `VITE_DECOMPOSITION_RUNTIME_PACK_BASE_PATH` (defaults to `/data/decomposition-runtime` in production builds).

Server (secret): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

Server (config): `TRUST_PROXY` (set behind Render/Cloudflare so rate limits see real IPs).

`TYPESAFE_API_KEY` is used only by local/CI Jev content-review tools, not the deployed app server. Azure Speech credentials are not used. Remove obsolete `TYPESAFE_API_KEY`, `JEV_DAILY_LIMIT`, `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` settings from existing web-service environments; removing them from the Blueprint does not confirm deletion from an existing service.

## Supabase dashboard

### School-only beta access

Apply `supabase/migrations/20261016015445_school_beta_access.sql` before deploying the matching app/server. The database owns the authorization rule: a verified Google identity with a student email (`s` + digits + `@stu.edu.tw`) and Google Workspace `custom_claims.hd = stu.edu.tw`, or a verified Google email explicitly approved in `private.beta_owner_emails`. This confirms school-account membership, not current enrollment. The school-beta migration itself seeds no owner exception; the full-course migration below adds the explicitly approved owner account.

`20261018154836_full_course_access_grants.sql` and `20261020102750_grant_owner_full_course.sql` add a private per-account lesson grant and seed `gwaporon311@gmail.com` in both the full-course table and the beta-owner allowlist. Apply them before deploying the matching client. It unlocks all lesson books for that verified Google account; delete its full-course row to revoke the lesson grant, and its beta-owner row to revoke beta access too.

Enable these Authentication hooks after applying the migration:

- Before User Created: `pg-functions://postgres/private/before_school_beta_signup`
- Custom Access Token: `pg-functions://postgres/private/school_beta_access_token_hook`

The first filters registrations; the second checks provider-owned identities on sign-in and refresh. The PostgREST pre-request function and restrictive user-table policies also block previously issued unauthorized tokens. Express verifies `has_beta_access` using each request's token; the client checks the same RPC before publishing a signed-in user. Existing users and progress are retained.

`20261023120000_inactive_account_cleanup.sql` schedules the daily 12-month inactive-account deletion with `pg_cron` (see `docs/DATABASE_SCHEMA.md`). Check `select * from private.inactive_accounts();` after applying it; it must not list anyone who is still studying.

Grant an owner exception only after the owner explicitly supplies the exact Google email; insert its lowercase value into `private.beta_owner_emails` through an administrative database connection. Removing that row immediately denies subsequent protected requests. Neither client-editable `user_metadata` nor Google's account-picker hints authorize access.

Local security tests: use a disposable Supabase Postgres container, clone its initialized `postgres` database into `school_beta_test`, copy both migrations into the container, then run `tests/database/schoolBetaAccess.test.sql` with psql's `migration` and `course_migration` variables pointing to them. The fixture refuses other database names and never uses real user progress.

After `npm run build`, run `python3 tests/production/schoolBetaSmoke.py` to exercise the real Express gate with canonical, encoded, duplicate-slash and traversal paths using both GET and HEAD. It starts a temporary server and does not sign in or write progress.

Remaining content exposure: every `/data` pack (lesson, grammar, readings, scans, dictionary, decomposition, memory hooks and other reference packs) requires a school session. Recorded audio remains on the public R2 CDN. School-only authentication does not make those R2 URLs private, nor revoke files previously downloaded. Their protection is a separate content-delivery task.

1. Authentication, URL Configuration: Site URL = production origin; add it (and any preview origin) to Redirect URLs.
2. Providers: enable Google, add the production origin and Supabase callback to the Google OAuth client.
3. Attack Protection: enable captcha.
4. Sign In / Providers, Email: confirm email on; minimum password length set.

## Post-deploy smoke test

- `/` loads, title and sign-in window read "Ron's Mandarin"
- Sign in with Google, sign out, then sign in again; a first-time Google sign-in creates the account
- Add a custom flashcard, reload, it persists and syncs on a second device
- A lesson plays recorded audio; text without a recording uses browser speech
- `POST /api/jev/grade-answer` returns 404, including when sent a bearer token
- `/privacy` and `/terms` render
- Install as PWA; icon and name look right; works offline after first load
- Delete account and data export work on a throwaway account

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
- Study packs ship same-lesson examples only; other-lesson examples load via "Show more" from `flashcard-extras`. `npm run perf:check` enforces size budgets (study part ≤ 30 kB Brotli, book page ≤ 250 kB).
- Book pages: `npm run book-pages:recompress` (1100px, q72; needs `cwebp`/`dwebp`, skips already-small pages).
- Audio CDN (optional): put the `vocabulary-audio` bucket behind a CDN/Cloudflare R2 custom domain and set `VITE_AUDIO_BASE_URL` to its origin at build time. Files already have content-hashed names, so use long immutable caching.
- Every `dist/data` JSON gets Brotli/gzip sidecars from `npm run build:precompress` (last build step; re-run it after a manual `trimBetaContent`). The server ignores a sidecar older than its JSON.
- Manifest-listed packs are fetched as `file.json?v=<sha256>`; the server sends those as immutable (1 year), so repeat visits make no request at all. Breakdown opens use one `decomposition-runtime/hot.json` (all course characters + parts) instead of ~8 shard requests.

# Study together (presence, global/lesson/party chat, quiz races)

Signed-in students see who is studying each lesson (faces on Books tiles, "N here" in the lesson window, faces in the practice header), open the compact global face stack in the Books header for classmates’ profiles and current lessons/activities, chat globally or per lesson, send preset cheers (加油！ 好棒！ 一起考試？ 等我一下) and race each other in the mixed vocab quiz. Settings → Show me online hides presence; messages and race participation remain visible when used.

## Ownership and transport

- `shared/lobby.ts` owns validated Lobby frames; `shared/quizRace.ts` owns selection, seats, rounds, progress and expiry. A room has at most four players. Starting requires at least two players and every reserved seat to be connected.
- `games/auth.ts` verifies Supabase JWT signatures, issuer, audience, authenticated role, anonymous status and expiry against project JWKS. Concurrent key fetches coalesce; imported keys are cached for 10 minutes and unknown key IDs can refresh at most once per minute. Signing-key outages return retryable 503 responses. The school token hook remains the beta-access authority; user-editable metadata is not authorization.
- `games/lobby.ts` is one hibernating SQLite Durable Object (`main`) for the school beta. Presence lives in socket attachments and starts hidden until the privacy preference arrives. Presence changes batch at most once every 2 seconds; unchanged frames are suppressed. Users are grouped by lesson once per flush. Everyone receives compact lesson counts, four global face samples (including students browsing outside a lesson) and open-room listings; full Online lists go only to subscribers. The lobby admits 250 active connections and has a 150-user synthetic regression.
- Global chat uses channel `0`; lesson channels use their existing lesson keys. Chat shows the last 50 messages **per channel** for 24 hours. Expired chat, tickets and listings are removed by alarms, including after everybody leaves. Reports deduplicate per reporter/message and retain at most 1,000 rows for 30 days. With no connections, cleanup runs hourly. Chat requires a subscription to its channel. Text is capped at 300 Unicode characters, controls/bidi overrides are stripped, and markup renders as plain text. Chat limits persist by account across reconnects: one message/second, five/10 seconds, and no identical repeat within 30 seconds. Other limits: one cheer/3 seconds, ten invite batches/minute, plus a socket token bucket. Muting is a local notification preference.
- `games/room.ts` is one hibernating Durable Object per race. SQLite stores the authoritative state and reconnect deadlines. Private party chat uses this same authenticated room socket, checks active membership on every send/report, retains at most 50 messages for the room’s lifetime (never over 24 hours), and shares the same text/cooldown rules. Its history and reports are deleted with the room. The Party/Chat tabs remain available in the room; the practice header opens party chat during a race. Rooms last 30 minutes; a race has a 10-minute deadline and at least five minutes remain after that deadline for results. Alarms enforce deadlines without any browser staying open. Empty rooms leave listings immediately and reclaim stored rows/alarms shortly afterward. Expired room codes cannot be joined.
- Start begins a 60-second preparation window. Every client must build the same seeded quiz, load its first question and audio, and send a SHA-256 fingerprint of its selected deck and plan. The race clock starts only after all connected clients are ready with matching fingerprints. A content mismatch fails immediately; clients that never finish preparing are removed at timeout, and the race ends if fewer than two players remain.
- Each account has a coordination object: five creations/hour, a connection-request bucket (30 burst, 30/minute refill), one reserved/current room, and conditional release. Repeated create requests reuse the existing room code. Upgrading a socket in another room removes the old seat; moving away from a host seat transfers ownership. Old cleanup cannot release the newer room's claim. Room codes/links are capabilities for signed-in school users; closed listings do not implement a separate invitation ACL.
- Invitations reuse the current waiting room. The server checks the sender's current membership and whether that room still accepts players, rather than trusting a stale listing. Full, expired and unauthorized invitations produce feedback. Room revisions prevent delayed listing publications from overwriting newer state. Pending listing updates persist through eviction and retry every five seconds; final room cleanup waits for the Lobby to acknowledge closure, up to its 35-minute listing retention window. An open room announces once in the first selected lesson's chat.
- Never-public rooms do not publish to or create records in the Lobby; invitations check the room directly. Once a room becomes public, subsequent visibility/closure updates still publish and retry durably after failure or hibernation. Listing publications compare visible summaries, ignoring the state revision: readiness, scores and temporary disconnect/reconnects do not republish unchanged listings. Room and Lobby scheduling retain an existing earlier alarm rather than writing it again for every action; that alarm recomputes the next deadline when it fires. Hibernation and automatic ping replies remain enabled.
- Explicit Leave removes the seat immediately, transfers the host to a connected participant where possible, and closes an empty room. A temporary disconnect reserves the seat/host for **60 seconds**. Returning within that window retains progress; after it, a lobby seat is removed or a racing player is marked Left, and ownership moves on. Half-open sockets time out after 90 seconds without activity/pong; that begins the same reconnect window.
- Client and server limit outgoing client frames/HTTP join bodies to 4 KiB, including avatar URLs; byte counts include multi-byte text. Client sends stop when the WebSocket buffer exceeds 64 KiB.
- Socket tickets are one-use and expire after 30 seconds or JWT expiry, whichever is sooner. They travel in WebSocket subprotocols; access tokens only travel in HTTPS Authorization headers. Connections reauthorize at JWT expiry or after 15 minutes. Only `APP_ORIGIN` is accepted. Authenticated `POST /rooms/:code/leave` is an idempotent fallback when the leave frame cannot arrive. Replacement/expired connections clear their local view without sending Leave against the new tab.
- Client transport uses jittered exponential backoff capped around 15 seconds, handshake/pong watchdogs, online/visibility wakeups, cancellable ticket requests and generation guards. Temporary outages keep retrying; permanent access/room failures stop. Lobby sockets close 30 seconds after hiding the tab. Race sockets stay available for background reconnects; mobile OS suspension is still subject to the grace deadline.
- Progress retains only the latest unsent update and replays it after reconnect; successful duplicate reports are suppressed. Every room command carries a round number, so old-round frames cannot affect a rematch. Each player's first nonzero deck size is frozen. Counts are monotonic and correct answers cannot grow without progress. Rapid host settings edits coalesce while awaiting the previous acknowledgement; Start waits for the final choices to be saved.
- Races use their own Book 1 selection directly, without overwriting personal lesson picks or switching to a library/review deck. Personal exclusions, confusion history, match preferences, shuffle/restart and mode switching cannot alter the race plan. The same seed and canonical card order drive each phone. Progress-only snapshots preserve configuration references so competitors' answers do not re-render the whole quiz or reload its deck.
- A network reconnect preserves the current mounted quiz. Waiting rooms and results can reopen from tab session storage after a reload. **Reloading an unfinished race withdraws the player**, rather than replaying previously recorded SRS answers. A fresh page/device cannot restart a race that already reports its progress. Closing the quiz also leaves the race. Sign-out/unmount cancels pending joins and closes transports. The DEV simulator refuses to start a quiz while signed in.
- Scores are self-reported by clients: this is a casual learning race, not a cheat-proof assessment. The server validates lifecycle/count invariants but does not receive or grade answers. The first-question fingerprint catches content/version divergence before start; later recordings still load on demand, and real mobile background behavior needs device checks.

## Setup status

The Worker needs a redeploy for this version (new `LOBBY` binding, migration `v2`, `SUPABASE_URL` var). Render's `GAMES_SERVER_URL` stays the same. Persisted rooms from the previous game are rejected and reclaimed rather than interpreted as quiz races. A two-account production check remains a launch step.

For a fresh checkout:

1. Inspect `wrangler --help`, `wrangler types --help`, `wrangler dev --help` and `wrangler deploy --help` through the project-local binary. Verify script flags against that version.
2. Run `npm run games:types`, then `npm run games:check`. Generated binding declarations are ignored; regenerate them for every fresh checkout and binding change.
3. For local development, run the normal app on localhost:3000 and the Worker on localhost:8787. Override the Worker's `APP_ORIGIN` to exactly `http://localhost:3000` using the installed CLI's documented variable override. The Express development configuration defaults `GAMES_SERVER_URL` to localhost:8787. Signed-out dev mode has no token, so study together stays off there.
4. For production, keep `APP_ORIGIN=https://ronsmandarin.com`, verify the authenticated member's Workers deployment role, then `npm run games:deploy`. The client obtains the public origin from `/api/games/config`; no rebuild or custom game domain is required.

Without `GAMES_SERVER_URL` (or when the Worker is down) every social element stays hidden and lessons keep working.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run jev:lint`, `npm run games:check` and `npm run games:test`. The runtime suite uses real SQLite Durable Objects in Miniflare and throwaway signing keys; test-only alarm controls are bundled exclusively into that harness. It covers host handoff, hibernated reconnect, duplicate creates, authoritative HTTP leave, abandoned seats, cross-room takeover, unauthorized invites, replayed tickets, JWT/origin rejection, per-lesson history, report deduplication and expired-data cleanup. Client tests cover cancelled requests, stale callbacks, latest-progress replay, settings acknowledgements, fatal closure, watchdogs and outages beyond six retries. The app-server suite also exercises 150 cold authenticated accounts behind a single campus IP.

The synthetic load scenario opens **150 Lobby sockets plus 150 race sockets in 38 rooms**, converges one 150-person lesson/Online list, fans out 150 chat messages to all students, and sends **40 progress reports per student (6,000 total)** before finishing all races. Test-only counters report actual room SQL rows written, alarm writes and listing RPC calls during the answering phase; counters and control routes are absent from the production Worker. A local comparison on 2026-10-25 reduced alarm writes from 6,000 to 38, SQL rows written from 6,076 to 6,000, and listing calls from 38 to zero. The optimized run measured 1.76 s presence convergence, 444 ms chat fanout and 61 ms p95 completion publication; JWKS was fetched once. These counts exclude setup, cleanup, Lobby/account objects and billed compute duration. They are local correctness/stress measurements, not deployed billing totals or a daily quota guarantee.

Before launch, exercise two school **test** accounts against the deployed Worker: presence, chat, invite → existing room → Join, host Leave, network loss/rejoin, results/rematch, Report/mute, and a complete race on 390-pixel mobile and 1440-pixel desktop. Reloading an unfinished race should withdraw rather than record answers again. Never race on the owner's real deck. Deploy the Worker and app together: older clients do not send required round numbers, and the short-lived legacy tickets will need to be reissued.

150 concurrent users fits this room/lobby layout; daily cost depends on messages, race answers and active duration. The Workers Free allowances are 100,000 Durable Object requests, 13,000 GB-s and 100,000 SQLite rows written per day. Incoming WebSocket messages count at 20:1 for request billing; outgoing frames and auto-answered pings are not billed as requests. Alarms, RPC calls, ticket/seat records and state writes also consume resources. For example, 150 students each answering 40 race words generates 6,000 progress events before setup/cleanup; repeated all-day races can exceed the free row-write budget. Observe deployed request, duration, SQL and error metrics before promising sustained daily capacity. Free-plan allowance exhaustion can stop social features until reset; ordinary studying remains independent. See Cloudflare's [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and [WebSocket guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).
