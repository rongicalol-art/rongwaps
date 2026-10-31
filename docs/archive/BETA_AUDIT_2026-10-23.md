# Beta readiness audit — October 23, 2026 (archived)

Moved from the deploy checklist on 2026-11-01. Historical evidence only; current process: `docs/RELEASING.md`.

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

