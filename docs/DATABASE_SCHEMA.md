# 🗄️ Supabase Database Schema

This document reflects the **live RongWaps Supabase schema after the 2026-10-06 user-data migrations** (`20261004`–`20261006`). All reference content (dictionary, vocabulary, character breakdowns, memory hooks) is served 100% pack-first from static edge CDN and cached in local IndexedDB (migration `20261003`). The Supabase database contains strictly private user data.

---

## 📊 Entity Relationship Summary

User tables reference `auth.users.id` with cascade deletion.

```
                  +-------------------+
                  |    auth.users     |
                  +---------+---------+
                            |
        +-------------------+-------------------+--------------------+
        | (1:1)             | (1:N)             | (1:N)              | (1:N)
 +------v--------+  +-------v--------+  +-------v----------+  +------v-----------+
 | user_profiles |  | user_folders   |  | user_card_progress|  | user_learned_cards|
 +---------------+  +-------+--------+  +------------------+  +------------------+
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
  - `email` (text), `full_name` (text), `avatar_url` (text)
  - `settings` (jsonb, default `{}`) — synced preferences: `favorites`, `activeBookId`, `characterPreference`, `sessionProgressIndex`, `activeTab`, `selectedLessons`, `selectedBooks`. Lives here rather than in auth `user_metadata` so it is not embedded in every access token. Shape owned by `CloudMetadataPayload` (`src/utils/cloudSyncTransforms.ts`).
  - `updated_at` (timestamptz) — bumped when settings are written or progress is reset; the pull uses it to decide whether cloud settings are newer than local.
- **RLS**:
  - Select: `auth.uid() = id` (owner only).
  - Insert/Update: `auth.uid() = id`.
- **Notes**: Row is created by the `handle_new_user` trigger on `auth.users` signup (the trigger itself is created in `20261004`; the baseline does not dump `auth` objects). Email/name/avatar are copied once at signup and not refreshed — the client reads them from auth metadata. `userService.syncSettings` upserts `settings` here and creates the row if it is missing.

### 2. `user_folders`
Custom folders created by users to group flashcards.
- **Columns**: `id` (uuid PK), `user_id` (uuid FK → `auth.users` on delete cascade), `name` (text), `color` (text), `created_at` (timestamptz)
- **Indexes**: `idx_user_folders_user_id` on (`user_id`)
- **RLS**: owner-only select/insert/update/delete.

### 3. `user_flashcards`
Custom vocabulary cards inside a user's folders.
- **Columns**: `id` (uuid PK), `user_id` (uuid FK → `auth.users` on delete cascade), `folder_id` (uuid FK → `user_folders.id` on delete set null), `simplified` (text), `traditional` (text), `pinyin` (text), `translation` (text), `notes` (text), `measure_words` (text[]), `created_at` (bigint, epoch ms)
- **Indexes**: `idx_user_flashcards_user_id`, `idx_user_flashcards_folder_id`
- **RLS**: owner-only. Realtime channel `public:user_flashcards` used by `flashcardService`.

### 4. `user_card_progress`
Granular card-level SRS state (the single source of truth for SRS).
- **Columns**:
  - `user_id` (uuid FK) / `card_id` (text) — composite Primary Key
  - `ease` (numeric default 2.5), `interval` (integer default 0), `repetitions` (integer default 0)
  - `next_review_date` (timestamptz), `learning_step` (integer, nullable — intraday step index), `last_updated` (timestamptz)
- **Indexes**: `idx_user_card_progress_user_updated` on (`user_id`, `last_updated`) — serves the incremental pull filter; the PK (`user_id`, `card_id`) covers id lookups.
- **RLS**: owner-only.
- **Notes**: Written via the `upsert_card_progress` RPC (batched); read through `get_sync_state`. Due cards for review sessions are derived from local SRS state (`deriveLocalDueCardIds`).

### 5. `user_learned_cards`
One row per learned card — the only store of `learnedCards`.
- **Columns**:
  - `user_id` (uuid FK → `auth.users` on delete cascade) / `card_id` (text) — composite Primary Key
  - `created_at` (timestamptz default now()) — the incremental-pull key
- **Indexes**: `idx_user_learned_cards_created` on (`user_id`, `created_at`)
- **RLS**: owner-only.
- **Notes**: Written via `append_learned_cards` / `replace_learned_cards`; read through `get_sync_state`. Cleared by `reset_user_learning_progress`.

---

## ⚡ Stored Procedures (RPCs)

All RPCs except the trigger are `SECURITY DEFINER`, filter by `auth.uid()`, and are executable by `authenticated` only.

| RPC | Purpose | Notes |
|---|---|---|
| `get_sync_state(p_since timestamptz default null)` | The whole pull as one jsonb: `cards`, `learned`, `cursor`, `profile` (`updated_at`, `settings`), `folders` | Cards and learned ids are incremental from `p_since` (`>=`); `cursor` is the newest timestamp among returned rows. Used by `userService.getSyncState` |
| `upsert_card_progress(p_records jsonb)` | Batch upsert SRS card rows (fills `user_id` from JWT) | |
| `append_learned_cards(p_cards text[])` | Insert new learned-card ids (`ON CONFLICT DO NOTHING`) | The common sync path for first passes |
| `replace_learned_cards(p_cards text[])` | Make the learned set exactly `p_cards`: delete ids that left, insert new ones | First sync and progress-reset shrink; surviving rows keep `created_at` |
| `reset_user_learning_progress()` | Clears the caller's `user_card_progress` and `user_learned_cards` | Also bumps `user_profiles.updated_at` |
| `handle_new_user()` | Trigger on `auth.users` insert → creates the `user_profiles` row | |

---

## 🔐 RLS & Grants Notes

- All `user_*` tables have RLS enabled with owner-only policies; `anon` grants were revoked from user tables, and the user RPCs are not executable by `anon`/`PUBLIC`.
- Removed over time: reference content tables (`dictionary`, `character_breakdowns_v2`, `book_vocabulary`, `mnemonics`) and `search_dictionary` (2026-10-03); `user_daily_progress` + `upsert_daily_progress` (nothing read them; XP/streaks were removed), `user_profiles.learned_cards` (legacy array mirror) and `user_profiles.last_activity` (never applied to client state) (2026-10-06); earlier cleanup (2026-08-27): `global_dictionary`, `character_breakdowns` (v1), `historical_dictionary`, `personal_vocabulary` + `personal_vocab_folders`, `user_progress`, `mnemonic_generation_queue`.
- Synced preferences were moved out of auth `user_metadata` into `user_profiles.settings` (20261005 backfills, 20261006 strips them from `user_metadata`).

---

## 🔄 Sync paths

`useCloudSyncFetch` pulls with **one** `get_sync_state` call (plus `since` for incremental pulls); `useCloudSyncSave` writes deltas: `upsert_card_progress` (changed cards), `append_learned_cards` / `replace_learned_cards`, and a `user_profiles` settings upsert when settings changed. Folders are written directly (and only) by `flashcardService` (create/delete, realtime-mirrored); the pull just reads them, and guest folders are uploaded once via `importFolders` on first sign-in.

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

1. `20261004` (signup trigger + FK cascade) and `20261005` (additive: `settings`, `get_sync_state`) — safe any time; apply `20261005` **before** deploying the client.
2. Deploy the client that calls `get_sync_state`.
3. `20261006` (contract: drops the legacy array, `last_activity`, daily progress, strips `user_metadata`) — only after old tabs/PWAs have updated; an old client reads the dropped columns.
