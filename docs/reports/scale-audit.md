# Scale audit: can Ron's Mandarin survive tens of thousands of learners?

Audit date: 2026-11-01. Scope: presence, chat, party rooms (Cloudflare Worker + Durable Objects), Supabase, the Express server on Render, static content. Method: read every file on the hot path, verified claims against official vendor docs (dates given), and load-tested the realtime Worker locally with the same Miniflare runtime CI uses (`scripts/load/socialLoad.mjs`). Nothing in the app was changed. Owner decides product; this report decides technical.

## (a) Verdict

1. The code is clean and correct for one school, but Study together has one deliberate single point: every learner's presence, chat, mentions, invites and room listings pass through **one Durable Object** that refuses the 251st socket, and even with that cap removed it slows visibly by 2,000 learners (measured).
2. Learning itself does not depend on that object. Its ceiling is the **single Render instance** that gates every lesson pack and verifies each new session token with two Supabase calls, with rate limits and a token cache that live in process memory, so adding instances loosens the limits instead of scaling them.
3. The database is not the first bottleneck, but **review history grows without bound** (about 1 KB per review, no retention) and the full pull sends a learner's entire history to every fresh device.
4. Party rooms are already one object per room and scale sideways; they only need to stop funnelling listings and mentions through the single Lobby.
5. Target: shard presence and chat **by lesson**, keep counts in a small index object, serve packs from the edge with the same JWT check the Worker already does, bound and partition review history. Three expand/migrate/contract phases, no downtime, roughly **$150 to $300 a month at 10,000 daily learners**.

## (b) Ranked bottlenecks

Impact columns assume concurrent learners at the stated size (daily actives are 5 to 10 times more). "Effort" is for one engineer with this codebase.

### 1. One Lobby object for everyone (hard cap 250, then O(N) per event)

Evidence:
- Every socket and every ticket goes to `getByName('main')`: `games/index.ts:46`, `games/index.ts:66`. The class comment says it was sized for the school beta: `games/lobby.ts:16`.
- Hard admission cap, 503 past 250 sockets: `games/lobby.ts:79`. Measured: at 500 users exactly 250 were refused with `socket 503` (sweep A below).
- Every chat message scans every socket and deserializes its attachment to find subscribers: `games/lobby.ts:202` (`post`), same for each mention: `games/lobby.ts:223`, and for mention eligibility plus a `SELECT DISTINCT` over the channel: `games/lobby.ts:126-127`.
- `flush()` deserializes all N attachments, builds the full visible roster, and sends up to four frames per socket: `games/lobby.ts:263-286`. The `online` frame lists every visible person (`games/lobby.ts:275`) and goes to every socket with the Online tab open (`games/lobby.ts:281`), so bytes grow with N squared when many people have the roster open.
- `schedule()` runs on every connect, ticket, presence change and close (`games/lobby.ts:40, 53, 87, 110, 230, 306`) and flushes at most every 2 s (`games/lobby.ts:12, 258`), so a wave of 10,000 connections means hundreds of full O(N) flushes during the ramp.
- The 60 s alarm also walks every socket and runs six DELETEs: `games/lobby.ts:288-305`.
- Dedupe state (`sent`) and `lastFlush` are in memory (`games/lobby.ts:18-19`), so after hibernation or eviction the next flush resends every frame to everyone.
- Rooms fan **in** to the same object: every room listing change is an RPC to `main` (`games/room.ts:181`) that triggers a flush (`games/lobby.ts:53`), and every party-chat mention is an RPC to `main` (`games/room.ts:144`).
- Cloudflare's own guidance (fetched 2026-11-01): a single object handles "approximately 500-1,000 requests per second for simple operations", "200-500" with storage writes, and a global coordinator "becomes a bottleneck as traffic grows"; the limits page (updated 2026-10-29) states a soft limit of 1,000 requests per second per object.

Impact: 1k concurrent: 750 learners see "Study together is full" (lessons still work). 10k: the social layer is unavailable to 97.5%; if the cap were simply raised, presence convergence measured 10.3 s at 2,000 users and the object is CPU-bound, so it would not be usable. 100k: impossible in this shape.

Effort: medium to large. New object classes and client routing, 1 to 2 weeks, described in (c) and (d).

### 2. Render single instance gates every lesson pack and verifies tokens through Supabase

Evidence:
- Every `/data/**` request (packs, page scans, manifests) is served by Express after auth: `server/index.ts:253-277`. Responses are `private` so Cloudflare never caches them: `server/index.ts:263, 272`, confirmed by design in `docs/RELEASING.md:245`. Production is behind Cloudflare (`server: cloudflare` response header on 2026-11-01), so only `/assets/*` (immutable, `server/index.ts:302`) benefits from the edge.
- A lesson opens "dozens of /data files in parallel" (`server/index.ts:75`). The gated tree is 137 MB on disk (`public/data`, measured), largest: flashcard-extras 46 MB, book-pages 28 MB, dictionary 18 MB.
- Each new token costs two Supabase round trips (`auth.getUser` and `rpc('has_beta_access')`): `server/index.ts:97-100`. Results are cached per process for 5 minutes with a hard cap of 2,000 entries: `server/index.ts:78-79, 161-164`. Past 2,000 distinct live tokens the cache evicts and every request re-verifies.
- Rate limiters use `express-rate-limit`'s default in-memory store, per process: `server/index.ts:124-141, 178, 245`. The API spec already admits "multiple replicas multiply the limit" (`docs/API_SPEC.md:110`).
- Hosting is one Render Free web service with no scaling settings: `render.yaml:1-11`; the doc lists the Free plan (0.1 CPU, 512 MB, sleeps after 15 min, 750 hours a month): `docs/RELEASING.md:110`. Render docs (fetched 2026-11-01): free instances spin down after 15 minutes without traffic, wake in "about one minute"; manual scaling exists on all workspaces, autoscaling needs a Pro workspace, up to 100 instances on paid compute, traffic load-balanced evenly, no sticky sessions.
- The dictionary API runs one worker thread per instance with a 256-deep queue and a 15 s deadline that closes the worker on timeout: `server/dictionary.ts:8, 60, 68`; jobs are processed strictly one at a time: `server/dictionary.worker.ts:112-114`.
- Checked and fine: Supabase's docs list `/auth/v1/user` under a 30-per-5-minutes-per-IP limit, but the auth server source applies that limiter only to `PUT /user` (updates); `GET /user`, which `getUser` calls, is not limited (verified in `supabase/auth` `internal/api/api.go`, 2026-11-01). So this is a latency and dependency cost, not a hard cap.

Impact: 1k concurrent: fine on a Starter or Standard instance when arrivals are spread; a synchronized classroom start is the weak moment (cold start, cold tokens). 10k: pack serving alone is thousands of file requests per second on one Node process, the token cache thrashes above 2,000 live tokens and the dictionary queue fills at peaks. 100k: not possible on one instance; several instances need shared limits and lose the token cache.

Effort: small for local JWT verification (one day, pattern already exists in `games/auth.ts`); medium for packs at the edge (3 to 5 days); small for edge rate limiting.

### 3. Review history grows without bound and is pulled whole

Evidence:
- `user_review_events`: one row per review, payload up to 32 KB, primary key (user_id, event_id), index (user_id, created_at): `supabase/migrations/20261017170727_fsrs_review_history.sql:15-24`. A real payload carries `before` and `after` scheduler state plus ids (`src/utils/srs/reviewEvents.ts:13-20`), about 0.7 to 1 KB per row.
- No retention or partitioning anywhere in `supabase/migrations/` (grep for partition, retention, drop old rows: none). Only a learner's own reset or the 12-month inactive-account job deletes rows (`20261023120000_inactive_account_cleanup.sql`).
- The full pull returns **every** event the learner ever made: the `e` CTE has no limit when `p_since` is null (`20261017170727_fsrs_review_history.sql:166-169, 172`). Every fresh device, cleared storage or account switch does a full pull (`src/hooks/useCloudSyncFetch.ts:73-76, 100`).
- The client keeps the whole history in the store and persists it to IndexedDB (`reviewEvents` in `PERSISTED_ARRAY_KEYS`, `src/store/useAppStore.ts:288-298`; merge in `src/store/slices/learningSlice.ts:122-126`).
- Insert path is a plpgsql loop with one INSERT and one correlated subselect per event (`:45-65`); bounded to 500 per call, so acceptable, but per-row.

Impact (100 reviews per active learner per day, 1 KB each): 1k daily actives: 100 MB a day, past the Pro plan's 8 GB in about 3 months, then $0.125 per GB-month. 10k: 1 GB a day, about 30 GB a month; a one-year learner's first sync on a new phone downloads 30 to 40 MB of JSON. 100k: 10 GB a day; full pulls become the dominant egress and the table needs partitioning to stay maintainable.

Effort: medium, about one week, expand/migrate/contract (section d).

### 4. Rooms are sharded, but every room talks to the single Lobby and to per-user limit objects

Evidence:
- One object per room, at most 6 players: `games/room.ts:12`, `shared/quizRace.ts:35`. Each action re-reads and re-parses the whole room JSON, stringifies it twice to diff, writes it back and broadcasts the full state to all players: `games/room.ts:295, 309-331, 151-156`. That is fine for 6 players.
- Clients send one progress frame per answer (`src/features/social/useRaceQuiz.ts:37-49`, deduped in `src/features/social/raceController.ts:238-241`): one incoming message (billed 20:1), one SQLite row write and one broadcast per answer.
- Listings and mentions fan in to `main` (see 1). Every HTTP join or ticket also costs a request and a row write on the per-account `limit:<user>` object: `games/index.ts:56`, `games/room.ts:66-74`.
- Measured: room create p95 about 300 ms and progress round trip p95 about 150 ms at 100 users locally; both grew with the number of rooms in the local runs because all rooms share one local process. In production rooms run independently, so that growth should not transfer; it was not verified on Cloudflare.

Impact: rooms themselves scale to 100k; the Lobby coupling is what breaks (item 1).

Effort: part of item 1 (a tiny `RoomsIndex` object and a per-user inbox object).

### 5. Sync write pattern and database policy cost

Evidence:
- Saves are debounced 10 s with a 45 s cap (`src/utils/sync/cloudSyncQueue.ts:142-143`), each save is two RPCs plus an optional settings upsert (`src/hooks/useCloudSyncSave.ts:54-70`), batches of 500 rows (`src/services/userService.ts:58`). Pull on every tab focus or reconnect (`src/hooks/useCloudSync.ts:66-70`). Upsert is set-based with last-write-wins (`20261031120000_close_write_gaps.sql:16-101`). Indexes match the queries (`20260912_db_cleanup.sql:23-27`, `20261005_...:43-44`).
- The school gate runs twice per request: once as the PostgREST pre-request hook (`20261016015445_school_beta_access.sql:93-104, 140`) and once as a restrictive policy on every user table (`:120-128`), each a join of `auth.users` and `auth.identities` with a regex (`:19-46`). Both are indexed lookups wrapped in `(select ...)`, so once per statement, not per row.
- Clients only talk to PostgREST over HTTP; nothing holds Postgres connections (`src/services/supabaseClient.ts`, `server/supabase.ts`). Advisory locks are per account and short (`20261025120000:28`, `20261026120000:44`). Triggers are per-row count checks on small tables (`20261007120000:129-148`).

Impact: at 10k daily actives this is about 10 requests per second average with 10x peaks; a Small or Medium compute ($15 to $60) carries it. Not a bottleneck before 100k.

Effort: none required now. Optional later: put the school claim in the JWT via the existing access-token hook so policies compare a claim instead of joining auth tables.

### What is fine (checked, no action)

JWT verification at the edge with cached JWKS (`games/auth.ts`); the Hibernation WebSocket API with auto-response pings (`games/lobby.ts:33, 81`); attachments far below the 16,384-byte limit (Cloudflare docs); SQLite objects clean up with alarms and `deleteAll` (`games/room.ts:351, 369`); per-connection token buckets and per-account chat cooldowns (`games/lobby.ts:97-100`, `shared/lobby.ts:25-29`); client reconnect with jittered backoff and a 30 s hidden-tab close (`src/services/socialService.ts:68`, `src/features/social/useSocialLifecycle.ts:11`); precompressed `.br`/`.gz` sidecars (`server/index.ts:278-294`); immutable hashed assets and a shell-only service-worker precache with enforced budgets (250 kB main, 850 kB initial JS, 275 kB CSS, 1.3 MB precache, `scripts/performance/checkBudget.ts`); audio on an R2 custom domain (`render.yaml:24`).

## (c) Target architecture for presence, party and chat

Sharding key: **the lesson** (`bookId*100+lessonId`, already the protocol's channel key, `shared/lobby.ts:3`). Presence counts, "who is here" and lesson chat are all per lesson, so one object per lesson gives natural rooms of hundreds, not tens of thousands.

Objects (all SQLite-backed, hibernating):

| Object | Instances | Holds | Fan-out |
| --- | --- | --- | --- |
| `LessonRoom` | one per lesson key, plus `global:<n>` shards for people outside a lesson | sockets of people in that lesson; last 50 chat lines (24 h); per-account chat cooldowns | counts and people frames to its own sockets only (hundreds) |
| `PresenceIndex` | one | `lesson -> count, 4 faces`, `user -> lesson room` routing table | receives a throttled RPC from each `LessonRoom` on change (at most every 2 s per room, about 50 rooms), answers paged roster reads |
| `RoomsIndex` | one | open race listings (100 rows) | receives listing RPCs from race rooms; pushes the list to lesson rooms on change |
| `UserInbox` | one per user, created on first mention | mention notices (24 h), unread flags | delivers to the user's current lesson room via `PresenceIndex`; survives offline |
| `GameRoom` | one per race (unchanged) | race state, party chat | 6 players |
| `limit:<user>` | one per user (unchanged) | request bucket, room reservation | none |

Routing: the Worker front door becomes `/lessons/:key/socket` (and `/global/socket`); tickets are issued by the target object exactly as today. A client keeps **one** socket; changing lesson means a reconnect to another object (two requests), which the client already does on every reconnect by replaying `here` and `sub` (`src/features/social/lobbyController.ts:151`). Global counts reach each socket from its own lesson room, which gets them from `PresenceIndex`, so the counts frame is O(lessons) and never O(N).

Product-visible change for the owner to decide: the full Online roster stops being pushed to every open panel and becomes a paged list loaded on demand (and searchable). Faces, per-lesson "N here" and chat stay live. At 10,000 online a live roster is not readable anyway.

Capacity: 10k concurrent over the 49 lesson keys open today (`shared/courseAccess.ts`) is about 200 sockets per room; a hot lesson of 2,000 is still within one object's comfort ("thousands of clients per instance", Cloudflare). At 100k, hot lessons need sub-shards (`lesson:<key>:<n>`) with a parent that relays chat between shards; design it then, not now.

What stays where:
- Supabase: auth, learner data, folders, feedback, anything that must survive, be exported or deleted with the account. If real DMs or chat history are ever wanted, they belong here (a `messages` table with RLS), with Durable Objects only for live delivery.
- Durable Objects: ephemeral presence, last-50 chat, listings, rate limits, 24 h mention inbox.
- Edge (Workers + R2): lesson packs and page scans, verified per request with the same JWT check, cached at the edge after the check (content is identical for every learner; only the right to read it is personal).
- Render: the API (dictionary, feedback) and the shell, until the dictionary index moves to a Worker too.

Why not Supabase Realtime Presence: Pro allows 500 concurrent connections and 50 presence messages per second, with 10 presence keys per object (Supabase limits docs, fetched 2026-11-01), and the Presence guide says it suits "slow-changing state". Team (10,000 connections) starts at $599 a month. Durable Objects give per-room isolation for about $5 a month plus usage.

Why not Ably or Pusher: Ably caps presence at 200 members per channel on every plan; Pusher Premium (10,000 connections) is $499 a month and Growth Plus (30,000) is $1,199 (both fetched 2026-11-01). They solve fan-out but not the per-lesson state the app already keeps in SQLite.

## (d) Phased migration plan (app keeps working throughout)

Each step is a PR into `main`, staged, then released; old and new paths coexist until the contract step.

Phase 0, quick wins (days, no architecture change):
1. Express verifies the Supabase JWT locally with cached JWKS, mirroring `games/auth.ts`, and trusts the token hook as the school-access authority (the hook already refuses to issue tokens to non-school users, `20261016015445:79-89`). Removes two Supabase calls per token and the 2,000-entry cache ceiling. Acceptance: `/data` requests make zero auth calls; e2e journeys green.
2. Move the per-IP limiter to Cloudflare (one WAF rate-limiting rule on `/api/*` and `/data/*`) and keep the per-user limiter only as a backstop. Acceptance: limits hold with two Render instances.
3. Render: Starter now, Standard with two instances before 1,000 concurrent. Acceptance: smoke checks pass with scaling on.
4. Lobby micro-fixes inside the current design: compute `attachments()` once per `post()`, index subscribers per channel in memory and rebuild on wake. Buys headroom under 250, does not lift the cap. Acceptance: `npm run games:test -- --users 250`, chat p95 unchanged or better.
5. Bound the full pull: new RPC parameter so a full pull returns the last 90 days of events (and a paged `get_review_history` for older ones); client stops persisting history older than that. Expand first (new param with old default), switch client, then contract the old shape. Acceptance: new-device sync of a one-year account under 5 MB.

Phase 1, expand (1 to 2 weeks): add `LessonRoom`, `PresenceIndex`, `RoomsIndex`, `UserInbox` classes (wrangler migration `v3`, `new_sqlite_classes`), routes `/lessons/:key/socket` and `/global/socket`; `GameRoom` dual-publishes listings to `main` and `RoomsIndex`, mentions to `main` and `UserInbox`. `/api/games/config` returns `{ url, version: 2 }`. Nothing in the client changes yet. Acceptance: `games:test` suite extended for the new objects; both routes serve the staging Worker; load test shows `LessonRoom` convergence under 2 s at 2,000 users per room and `PresenceIndex` under 1,000 RPC per minute at 10k.

Phase 2, migrate: client connects to lesson rooms when `version >= 2`; Online tab reads the paged roster; mention inbox comes from `UserInbox`. Keep `/lobby/socket` alive for stale tabs (the PWA activates new builds at once, `vite.config.ts:111`). Acceptance: two-account production check from `docs/RELEASING.md:297`, metrics show `main` traffic falling to zero within two weeks.

Phase 3, contract: remove `Lobby` (wrangler `deleted_classes`), the `/lobby` routes and the dual publishing. Acceptance: `games:check` dry run, no `main` requests in Cloudflare analytics for 14 days.

Supabase, expand/migrate/contract for review history: create `user_review_events_v2` partitioned by range on `reviewed_at` (the event's own time, so a retried upload lands in the same partition), primary key (user_id, reviewed_at, event_id), monthly partitions created by pg_cron (already installed, `20261023120000:20`), retention 13 months then drop. `append_review_events` writes both tables (expand), a one-off backfill copies old rows, `get_sync_state` reads v2 (migrate), old table dropped (contract). The repo's CI migration-safety check already enforces that the previous client keeps working.

Content at the edge, expand/migrate/contract: a `content` Worker with an R2 binding and the JWT check from `games/auth.ts`, deploy step syncs `dist/data` to R2 (pattern: `scripts/audio/syncAudioToR2.ts`); `VITE_CONTENT_BASE_URL` points at it. One client change is required: `src/services/staticContentService.ts:57-59` refuses a protected pack from another origin, so the guard must allow the content Worker's origin. Express keeps serving `/data` until clients have switched, then drops the gate.

## (e) Cost per 10,000 active learners

Assumptions: 10,000 daily active learners, 2,000 concurrent at peak, 30 minutes of study each, 100 reviews a day, 3 races a day for a third of them, 10 chat lines a day, 5 Lobby connections a day. Prices are the vendors' published numbers fetched 2026-11-01; Render instance prices could not be read from Render's page (dynamic) and come from third-party summaries, so treat them as approximate.

| Item | Working | Monthly |
| --- | --- | --- |
| Cloudflare Workers Paid | base plan (Durable Objects on Free are capped at 100k requests and 100k row writes a day, which 10k learners exceed on day one) | $5 |
| Durable Object requests | about 50 billable requests per learner-day (connections, RPCs, alarms, incoming messages at 20:1) = 15M a month, 1M included, $0.15 per extra million | about $2 |
| Durable Object row writes | about 180 per learner-day (tickets, chat, race state per answer) = 54M a month, 50M included, $1 per extra million | about $4 |
| Durable Object duration | objects idle between events are eligible to hibernate and unbilled (Cloudflare pricing page, updated 2026-10-18); if every race room stayed awake its full 10 minutes it would be about 17M GB-s, $208. Realistic processing time is a small fraction | $0 to $25 |
| Supabase Pro + compute | Pro $25 with $10 credit; Small or Medium compute for 10 to 100 PostgREST requests a second | $30 to $75 |
| Supabase storage | review events about 1 GB a day; with 13-month retention it levels near 400 GB: $0.125 per GB-month past 8 GB. Without retention it grows about $4 a month, every month | up to $50 |
| Supabase egress | pulls and saves, well under 250 GB included once the full pull is bounded | $0 |
| Render | Standard (1 CPU, 2 GB) times two instances, third-party price $25 each | about $50 |
| R2 | 137 MB of packs plus audio, egress free | under $1 |
| Total | | roughly $150 to $250 |

At 10,000 **concurrent** (about 50,000 daily actives) scale the Supabase compute to Large or XL ($110 to $210) and expect roughly $300 to $450 a month. The social layer stays cheap at every size because outgoing WebSocket frames are free and rooms hibernate.

## (f) Measurements

Tool: `scripts/load/socialLoad.mjs` (dev-only, documented in `scripts/load/README.md`). Target: the real Worker code in Miniflare on this 4-CPU container, synthetic accounts and a throwaway signing key, exactly like CI's `tests/games/runtime.mjs`. Local numbers show how cost grows with N, not Cloudflare's absolute latency. Scenario per size: connect in batches of 100, spread over 20 lessons, 10% open the Online list, a 50-sender chat burst in one lesson and one in global chat (20% following), 20% change lesson within 5 s, then rooms of 4 play 10 answers.

Baseline: the repo's own 150-user suite passed here (`npm run games:test`): presence convergence 5.6 s during the ramp, 150 messages to 150 users in 1.96 s (p95 1.95 s), race finish p95 202 ms.

{{SWEEP_TABLE}}

{{FANOUT_NOTES}}

What could not be run and exactly what is missing:
- Staging: the deployed staging Worker answers (`/healthz` 200 in 0.5 s) and the script has a `--target staging` mode with production refusals, but staging accepts only school Google sign-ins and this container holds no Supabase keys, so no access tokens could be issued. Missing: a file of staging access tokens for synthetic accounts (owner adds them to the staging `private.beta_owner_emails`, signs them in, exports the tokens; they last one hour). Then `node scripts/load/socialLoad.mjs --target staging --users 250 ...` as in the README.
- Express and Supabase under load: not measured. A production build plus a local Supabase stack would be needed (Docker is present here, the Supabase CLI is not); the e2e helper `tests/e2e/support/stack.ts` shows how fake learners are minted locally.
- Cloudflare-side absolute latency, duration billing and hibernation behaviour of one Lobby at 2,000 sockets: only inferable from the local curve and the vendor's 1,000 requests-per-second guidance.

## Hypotheses checked

| Hypothesis | Result |
| --- | --- |
| The single Lobby (`getByName('main')`) caps at 250 sockets and is the first ceiling | Confirmed for Study together: `games/lobby.ts:79`, measured 250 refusals at 500 users. For learning as a whole the Render content gate and token path are the earlier ceiling (item 2); the Lobby only hides social features. |
| `post()` and `deliverMention()` deserialize every socket; `flush()` every 2 s is O(N) | Confirmed: `games/lobby.ts:202, 223, 263-286`. Flush runs at most every 2 s on activity (`:258`) and every 60 s from the alarm otherwise (`:304`). The `online` frame makes it O(N) bytes per subscriber on top. |
| Database is not the first bottleneck; `user_review_events` is unbounded (32 KB per row) with no retention | Confirmed, and worse: the full pull returns the whole history (`20261017170727:166-172`) and the client persists it (`useAppStore.ts:293`). Real rows are about 1 KB; 32 KB is only the check constraint. |
| `express-rate-limit` uses memory, so limits loosen with more Render instances | Confirmed: no `store` option (`server/index.ts:124-141`); the API spec says so too (`docs/API_SPEC.md:110`). The token cache (`:78-79`) and the dictionary worker (`server/dictionary.ts:8`) are per process as well. |
| Chat is intentionally ephemeral (~35 min); real DMs or history need Postgres | Partly wrong: lobby and lesson chat keep the last 50 lines per channel for 24 hours (`shared/lobby.ts:12-13`, `games/lobby.ts:194, 298`); 35 minutes is the room-listing retention (`games/lobby.ts:13`) and party chat dies with its room. Right that durable DMs or history belong in Postgres (export, deletion, RLS), with objects for live delivery. |

## Sources

Official docs fetched 2026-11-01 unless dated otherwise.
- Cloudflare Durable Objects limits (updated 2026-10-29): https://developers.cloudflare.com/durable-objects/platform/limits/
- Cloudflare Durable Objects pricing (updated 2026-10-18): https://developers.cloudflare.com/durable-objects/platform/pricing/
- Cloudflare rules of Durable Objects (throughput, sharding, 50,000-player example): https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Cloudflare WebSocket Hibernation API (16,384-byte attachments, in-memory reset): https://developers.cloudflare.com/durable-objects/api/websockets/ and https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare Workers pricing (updated 2026-10-02): https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare workers-chat-demo (one object per room, per-room ceiling, hibernation): https://github.com/cloudflare/workers-chat-demo
- PartyServer (rooms as named objects, hibernation, 2 KB connection state): https://github.com/cloudflare/partykit/blob/main/packages/partyserver/README.md
- Supabase pricing: https://supabase.com/pricing ; compute sizes and pooler limits: https://supabase.com/docs/guides/platform/compute-and-disk
- Supabase Realtime limits and Presence guide: https://supabase.com/docs/guides/realtime/limits , https://supabase.com/docs/guides/realtime/presence
- Supabase Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits ; auth server routes: https://github.com/supabase/auth/blob/master/internal/api/api.go
- Supabase partitioning guide: https://supabase.com/docs/guides/database/partitions
- Render free instances and scaling: https://render.com/docs/free , https://render.com/docs/scaling ; outbound IP ranges: https://render.com/docs/static-outbound-ip-addresses ; instance prices from third-party summaries (unverified): https://comparedge.com/tools/render/performance
- Ably limits: https://ably.com/docs/general/limits ; Pusher Channels pricing: https://pusher.com/channels/pricing/
- express-rate-limit stores (library README via forks and https://openapps.pro/packages/rate-limit-redis )
- jklm.fun, skribbl.io, Kahoot: no public engineering write-up found (searched 2026-11-01); the room-per-object pattern above follows Cloudflare's chat demo and PartyServer instead.
