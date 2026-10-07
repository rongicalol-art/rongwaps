# 🗄️ Supabase Database Schema

This document reflects the **live Ron's Mandarin Supabase schema after the 2026-10 user-data migrations** (`20261004`–`20261007140000`). All reference content (dictionary, vocabulary, character breakdowns, memory hooks) is served 100% pack-first from static edge CDN and cached in local IndexedDB (migration `20261003`). The Supabase database contains strictly private user data.

---

## 📊 Entity Relationship Summary

User tables reference `auth.users.id` with cascade deletion.

```
                  +-------------------+
                  |    auth.users     |
                  +---------+---------+
                            |
        +-------------------+-------------------+
        | (1:1)             | (1:N)             | (1:N)
 +------v--------+  +-------v--------+  +-------v----------+
 | user_profiles |  | user_folders   |  | user_card_progress|
 +---------------+  +-------+--------+  +------------------+
                            | (1:N)
                    +-------v--------+
                    | user_flashcards|
                    +----------------+
```

---

## 📁 Table Definitions

### 1. `user_profiles`
One row per user; profile info + synced preferences.
- **Columns**:
  - `id` (uuid, Primary Key) -> References `auth.users.id` on delete cascade
  - `settings` (jsonb, default `{}`) — synced preferences: `favorites`, `activeBookId`, `characterPreference`, `selectedLessons`, `selectedBooks` (device-local `activeTab` / `sessionProgressIndex` are no longer synced; old rows may still carry them and they are ignored). Lives here rather than in auth `user_metadata` so it is not embedded in every access token. Shape owned by `CloudMetadataPayload` (`src/utils/sync/cloudSyncTransforms.ts`).
  - `updated_at` (timestamptz) — stamped by the server (BEFORE INSERT/UPDATE trigger `touch_user_profile_updated_at`, never the client clock) when settings are written or progress is reset; the pull uses it to decide whether cloud settings are newer than local.
  - `progress_reset_at` (timestamptz, nullable) — reset epoch set by `reset_user_learning_progress`; devices that have not applied it wipe their local progress before merging (see Sync paths).
- **RLS**:
  - Select: `auth.uid() = id` (owner only).
  - Insert/Update: `auth.uid() = id`.
- **Notes**: Row is created by the `handle_new_user` trigger on `auth.users` signup (the trigger itself is created in `20261004`; the baseline does not dump `auth` objects). No email/name/avatar is stored here (dropped in `20261007140000`; the client reads them from the auth session). `userService.syncSettings` upserts `settings` here and creates the row if it is missing.

### 2. `user_folders`
Custom folders created by users to group flashcards.
- **Columns**: `id` (uuid PK), `user_id` (uuid FK → `auth.users` on delete cascade), `name` (text), `color` (text), `created_at` (timestamptz)
- **Indexes**: `idx_user_folders_user_id` on (`user_id`)
- **RLS**: owner-only select/insert/update/delete.
- **Constraints** (`NOT VALID`): `name` ≤ 200 chars, `color` ≤ 64.

### 3. `user_flashcards`
Custom vocabulary cards inside a user's folders.
- **Columns**: `id` (uuid PK), `user_id` (uuid FK → `auth.users` on delete cascade), `folder_id` (uuid FK → `user_folders.id` on delete set null), `simplified` (text), `traditional` (text), `pinyin` (text), `translation` (text), `notes` (text), `measure_words` (text[]), `created_at` (bigint, epoch ms)
- **Indexes**: `idx_user_flashcards_user_id`, `idx_user_flashcards_folder_id`
- **RLS**: owner-only. No realtime: `flashcardService` refetches when the tab becomes visible.
- **Limits**: text columns ≤ 2000 chars, `measure_words` ≤ 100 entries (`NOT VALID` CHECK); at most 5000 rows per user (BEFORE INSERT trigger `user_flashcards_cap`).

### 4. `user_card_progress`
Granular card-level SRS state (the single source of truth for SRS).
- **Columns**:
  - `user_id` (uuid FK) / `card_id` (text) — composite Primary Key
  - `ease` (numeric default 2.5), `interval` (integer default 0), `repetitions` (integer default 0)
  - `next_review_date` (timestamptz), `learning_step` (integer, nullable — intraday step index), `last_updated` (timestamptz — server write time, the incremental-pull cursor)
  - `reviewed_at` (timestamptz, nullable) — when the card was last reviewed (client clock, capped ~5 min into the future by the RPC); the last-write-wins key. Backfilled from `last_updated`.
  - `learned_at` (timestamptz, nullable) — when the card was first learned; non-null means "learned". Monotonic: the RPC keeps the earliest value and never clears it; only a progress reset (row delete) removes it. A learned card that never had SRS state is a placeholder row: `next_review_date` and `reviewed_at` NULL (the client reads it as learned with no SRS record, never due).
- **Indexes**: `idx_user_card_progress_user_updated` on (`user_id`, `last_updated`) — serves the incremental pull filter; the PK (`user_id`, `card_id`) covers id lookups.
- **RLS**: owner-only.
- **Constraints** (`NOT VALID`: new writes only): `card_id` 1–128 chars; `ease` 1–10, `interval` 0–36500, `repetitions` 0–100000, `learning_step` null or 0–100.
- **Notes**: Written via the `upsert_card_progress` RPC (batched); read through `get_sync_state`. Due cards for review sessions are derived from local SRS state (`deriveLocalDueCardIds`).

---

## ⚡ Stored Procedures (RPCs)

All RPCs except the trigger are `SECURITY DEFINER`, filter by `auth.uid()`, and are executable by `authenticated` only.

| RPC | Purpose | Notes |
|---|---|---|
| `get_sync_state(p_since timestamptz default null)` | The whole pull as one jsonb: `cards` (each with `reviewed_at` and `learned_at`), `cursor`, `profile` (`updated_at`, `settings`, `progress_reset_at`), `folders` | Cards are incremental from `p_since` (`>=`); `cursor` is the newest `last_updated` among returned cards. Folders and profile are always returned (so `p_since` in the far future is a cheap profile + folders read). Used by `userService.getSyncState` / `getFolders` |
| `upsert_card_progress(p_records jsonb)` | Batch upsert card rows (fills `user_id` from JWT) | Max 500 records. Last write wins per row for the SRS fields: they are overwritten only if the incoming `reviewed_at` (default `now()` for records with SRS state but no time, i.e. older clients) is >= the stored one. `learned_at` merges separately (`COALESCE(stored, incoming)`, never cleared), so a learned flag persists with an unchanged or even older review; a stale record that adds nothing is a no-op. A record with no `next_review_date`/`reviewed_at` stores a learned-only placeholder. Numeric fields are clamped to the CHECK ranges. `last_updated = now()` on every write |
| `reset_user_learning_progress()` | Deletes the caller's `user_card_progress` rows (learned flags included) | Sets `user_profiles.progress_reset_at` (the reset epoch) and `updated_at`; creates the profile row if missing |
| `export_my_data()` | The caller's own data as one jsonb: `exported_at`, `profile`, `folders`, `flashcards`, `card_progress` (rows include `learned_at`) | Backs "Download my data" in Settings (`userService.exportMyData`) |
| `delete_my_account()` | Deletes the caller's `auth.users` row; every user table cascades from it | Raises when unauthenticated. Backs "Delete account" in Settings (`userService.deleteMyAccount`); the client then signs out locally and clears the persisted store. Added in `20261007130000` |
| `handle_new_user()` | Trigger on `auth.users` insert → creates an empty `user_profiles` row (id only) | Not executable by `anon`/`authenticated` |
| `enforce_user_flashcard_cap()` | Trigger: 5000 `user_flashcards` rows per user | `SECURITY DEFINER` |
| `touch_user_profile_updated_at()` | Trigger: server-stamps `user_profiles.updated_at` | |

---

## 🔐 RLS & Grants Notes

- All `user_*` tables have RLS enabled with owner-only policies; `anon` has no privileges on them (revoked per table in `20260827` and again for the user tables in `20261007120000`, which also stopped default privileges from granting `anon` on future tables/functions), `authenticated` lacks TRUNCATE/REFERENCES/TRIGGER, and the user RPCs are not executable by `anon`/`PUBLIC`.
- Removed over time: reference content tables (`dictionary`, `character_breakdowns_v2`, `book_vocabulary`, `mnemonics`) and `search_dictionary` (2026-10-03); `user_daily_progress` + `upsert_daily_progress` (nothing read them; XP/streaks were removed), `user_profiles.learned_cards` (legacy array mirror) and `user_profiles.last_activity` (never applied to client state) (2026-10-06); `user_learned_cards`, `append_learned_cards`, `replace_learned_cards` (folded into `user_card_progress.learned_at`) and `user_profiles.email` / `full_name` / `avatar_url` (auth PII duplicates) (2026-10-07); earlier cleanup (2026-08-27): `global_dictionary`, `character_breakdowns` (v1), `historical_dictionary`, `personal_vocabulary` + `personal_vocab_folders`, `user_progress`, `mnemonic_generation_queue`.
- Synced preferences were moved out of auth `user_metadata` into `user_profiles.settings` (20261005 backfills, 20261006 strips them from `user_metadata`).

---

## 🔄 Sync paths

`useCloudSyncFetch` pulls with **one** `get_sync_state` call (plus `since` for incremental pulls); `useCloudSyncSave` writes deltas: `upsert_card_progress` (changed cards, each carrying `learned_at` when learned) and a `user_profiles` settings upsert when settings changed. Card RPC errors propagate (no direct-upsert fallback), so the changes stay dirty and retry.

**Pull checkpoint.** The sync slice persists `syncCheckpoint = { userId, cursor, srs }`: the last pull's server cursor plus the SRS state known to be on the server (the upload-delta baseline; without it the first save after a cold load would re-upload every card outside the incremental pull). Cleared on sign-out, account switch and a reset-epoch wipe; absent means a full pull.

**Learned.** `learnedCards: string[]` stays the store shape; only `srsRowMapping.ts` maps it to `learned_at` (`rowsToProgress` on pull, `srsDataToUpsert(…, learned)` on push). A card uploads when its SRS fields change, and a pass always changes them, so the flag rides with that record. Rows without `next_review_date` give a learned id and no SRSData.

**Conflicts (last write wins by review time).** `SRSData.lastReviewedAt` ↔ `reviewed_at` (mapped only in `srsRowMapping.ts`). The server keeps the newer review per card; on pull, `mergePulledSrsData` keeps the local card when its `lastReviewedAt` is strictly newer than the cloud row's (it then differs from the baseline, so the next save re-pushes it), otherwise takes the cloud row.

**Reset epoch.** `reset_user_learning_progress` stamps `progress_reset_at`; the resetting device records it (`progressResetSeen[userId]`, persisted in the learning slice). On every pull `applyProgressResetEpoch` wipes local progress from before an epoch newer than the stored one (cards reviewed after it survive), refetches in full if the pull was incremental, then merges. Folders are written directly (and only) by `flashcardService` (create/delete) and mirrored into the store by the caller; `get_sync_state` is the only read path (`userService.getFolders` re-reads them after a failed delete), and guest folders are uploaded once via `importFolders` on first sign-in.

## 🚚 Fetch Paths (reference content)

Client code never talks to the database for reference content — it goes through `src/services/` which resolve **pack-first** from static packs (`public/data/...`) cached in IndexedDB (`staticContentService`, keyed by manifest version with stale-version pruning):

- dictionary lookups → `public/data/dictionary/` shards
- character breakdowns → `public/data/breakdowns/` shards
- course vocabulary → `public/data/vocabulary/` book packs
- course examples → `public/data/course-examples/`
- memory hooks → `public/data/memory-hooks/` book packs
- parts index (breakdown "Sound family" + "Appears in" cards) → `public/data/relations/parts.json`, `parents` (part → characters built from it, sound-alikes first with `=` `~` `≈` grade marks) + `phonetic` (character → its sound part); learner pool = course ∪ levels, no pinyin/meaning/level in the pack — `npm run relations:build`
- character pronunciation (Taiwan-first readings: course reading, then CC-CEDICT "Taiwan pr.", variants `~`, other readings with an example word) → `public/data/pronunciation/pronunciation.json` (`npm run pronunciation:build`; then `relations:build`, whose sound grades use every reading)
- TOCFL character/word levels (TBCL 1–7 scale; HSK gap fill) → `public/data/levels/levels.json`, schema v2 (`npm run levels:build`)
- stroke data → `public/data/strokes/` shards (CDN fallback)

In-memory caches (`src/utils/cache.ts`) dedupe repeated lookups; `requestTiming` instruments data calls.

## 🚀 Applying the 2026-10 migrations (order matters)

Verified locally with `supabase db reset` (all migrations replay on a fresh Postgres) plus a signup and client-RPC run against the local stack.

0. `20261007120000` (hardening, abuse limits, `reviewed_at` LWW, reset epoch, server-stamped `updated_at`) is additive and backwards compatible in both directions: apply it before or after the client that sends `reviewed_at` / reads `progress_reset_at` (until it is applied the client simply gets no LWW protection and no reset epoch). Existing rows are untouched (constraints are `NOT VALID`; `reviewed_at` is backfilled from `last_updated`).
0b. `20261007130000` (`delete_my_account`, `export_my_data`) is purely additive (two new functions); apply it before shipping the client that shows the Settings "Account" section, otherwise those buttons surface an error.
1. `20261004` (signup trigger + FK cascade) and `20261005` (additive: `settings`, `get_sync_state`) — safe any time; apply `20261005` **before** deploying the client.
2. Deploy the client that calls `get_sync_state`.
3. `20261006` (contract: drops the legacy array, `last_activity`, daily progress, strips `user_metadata`) — only after old tabs/PWAs have updated; an old client reads the dropped columns.
4. `20261007140000` (`learned_at`, `user_learned_cards` + its RPCs dropped, profile PII columns dropped) is **not** compatible with the previous client in either direction (the old client calls the dropped RPCs and reads `get_sync_state().learned`): ship it together with the matching client; an old open tab/PWA errors on save until it updates. It aborts (rolling back) if any learned card would be left without `learned_at`. Verified locally by restoring a production backup onto the previous schema and applying it; one row predating the NOT VALID SRS CHECK (interval out of range) is clamped because Postgres re-checks that constraint on UPDATE.
