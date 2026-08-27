# 🗄️ Supabase Database Schema

This document reflects the **live RongWaps Supabase schema after the 2026-08-27 data cleanup** (migration `20260827000000_data_cleanup.sql`). It is the single source of truth for the `public` schema; if the database drifts from this document, update the document.

---

## 📊 Entity Relationship Summary

User tables reference `auth.users.id` with cascade deletion.

```
                  +-------------------+
                  |    auth.users     |
                  +---------+---------+
                            |
       +--------------------+--------------------+--------------------+
       | (1:1)              | (1:N)              | (1:N)              | (1:N)
+------v-------+    +-------v--------+   +-------v--------+    +-------v--------+
| user_profiles |   | user_folders   |   | user_card_progress |  | user_daily_progress|
+------+--------+    +-------+--------+   +-------------------+  +------------------+
       |                     | (1:N)
       |             +-------v--------+
       |             | user_flashcards|
       |             +----------------+
```

Reference content tables (`dictionary`, `character_breakdowns_v2`, `book_vocabulary`, `mnemonics`) are RLS-free, publicly readable, and **read pack-first from static JSON** (`public/data/...`) with the database as fallback — see [Fetch paths](#-fetch-paths).

---

## 📁 Table Definitions

### 1. `user_profiles`
One row per user; profile info + learning metadata.
- **Columns**:
  - `id` (uuid, Primary Key) -> References `auth.users.id` on delete cascade
  - `email` (text)
  - `full_name` (text)
  - `avatar_url` (text)
  - `learned_cards` (text[] default `'{}'`) — migrated from the dropped `user_progress` table
  - `last_activity` (text) — migrated from the dropped `user_progress` table
  - `updated_at` (timestamptz)
- **RLS**:
  - Select: `auth.uid() = id` (owner only).
  - Insert/Update: `auth.uid() = id`.
- **Notes**: Row is created by the `handle_new_user` trigger on signup. `userService.syncMetadata` upserts `learned_cards`/`last_activity` here.

### 2. `user_folders`
Custom folders created by users to group flashcards.
- **Columns**: `id` (uuid PK), `user_id` (uuid FK), `name` (text), `color` (text), `created_at` (timestamptz)
- **Indexes**: `idx_user_folders_user_id` on (`user_id`)
- **RLS**: owner-only select/insert/update/delete.

### 3. `user_flashcards`
Custom vocabulary cards inside a user's folders.
- **Columns**: `id` (uuid PK), `user_id` (uuid FK), `folder_id` (uuid FK → `user_folders.id` on delete set null), `simplified` (text), `traditional` (text), `pinyin` (text), `translation` (text), `notes` (text), `measure_words` (text[]), `created_at` (bigint)
- **Indexes**: `idx_user_flashcards_user_id`, `idx_user_flashcards_folder_id`
- **RLS**: owner-only. Realtime channel `public:user_flashcards` used by `flashcardService`.

### 4. `user_card_progress`
Granular card-level SRS state (the single source of truth for SRS).
- **Columns**:
  - `user_id` (uuid FK) / `card_id` (text) — composite Primary Key
  - `ease` (numeric default 2.5), `interval` (integer default 0), `repetitions` (integer default 0)
  - `next_review_date` (timestamptz), `last_updated` (timestamptz)
- **Indexes**: `idx_user_card_progress_user_id`, `idx_user_card_progress_next_review`
- **RLS**: owner-only.
- **Notes**: Written via the `upsert_card_progress` RPC (batched); read by `userService.getProgress`. The old `user_progress` table (with a dead `srs_data` jsonb column) was dropped in the cleanup.

### 5. `user_daily_progress`
Daily XP/study totals; one row per user per date.
- **Columns**:
  - `user_id` (uuid FK) / `date` (text `YYYY-MM-DD`) — composite Primary Key
  - `xp_earned`, `cards_reviewed`, `cards_learned`, `study_time_minutes` (integers)
  - `activities_breakdown` (jsonb, `{"flashcards":0,"quiz":0,"listening":0,"writing":0}`)
  - `created_at`, `updated_at`
- **Indexes**: `idx_user_daily_progress_user_date` on (`user_id`, `date` DESC)
- **RLS**: owner-only.
- **Notes**: Written exclusively through the `upsert_daily_progress` RPC (atomic increment + breakdown merge).

### 6. `dictionary`
The canonical dictionary (~122k entries). Supersedes the dropped `global_dictionary` duplicate.
- **Columns**: `id` (integer PK, sequence), `traditional` (text), `simplified` (text), `pinyin_numbered`, `pinyin_accented`, `pinyin_flat`, `pinyin_syllables` (text), `definitions` (jsonb), `english_tsvector` (generated `tsvector`), `frequency_score` (float8), `curriculum_level` (int default 99), `is_book_vocab` (bool), `created_at`
- **Indexes**: btree on `simplified` and `traditional` (exact/prefix lookups), trigram GIN on `simplified`/`traditional`/`pinyin_flat`, GIN on `definitions`, GIN on `english_tsvector`
- **RLS**: none — publicly readable reference data.
- **Read path**: static shard packs (`public/data/dictionary/`, 64 shards) via IndexedDB first, then direct table queries; search goes through the `search_dictionary` RPC.

### 7. `character_breakdowns_v2`
Character decomposition data (~9.6k characters). The v1 `character_breakdowns` table was dropped.
- **Columns**: `character` (text PK), `radical` (text), `pinyin` (text[]), `definition` (text), `decomposition` (text), `components_historical` (text[])
- **Indexes**: trigram GIN on `decomposition` (component "used in" fallback)
- **RLS**: none — publicly readable.
- **Read path**: static shard packs (`public/data/breakdowns/`, 32 shards) first, then direct table queries. "Used in" lists resolve from the static inverted index (`public/data/breakdowns/used-as.json`) with the trgm-indexed query as fallback.

### 8. `book_vocabulary`
Curriculum vocabulary (~4k rows) used as the fallback source when static vocabulary packs are unavailable.
- **Columns**: `id` (text PK), `traditional`, `simplified`, `pinyin`, `pos`, `meaning`, `examples`, `variants`, `audio`, `tags`
- **RLS**: none — publicly readable.

### 9. `mnemonics`
Cache of AI-generated memory hooks (read-only from the learner app; generation was removed).
- **Columns**: `id` (text PK, `word_{text}` or `{char}`), `character` (text), `mnemonic` (text), `content_type` (text), `created_at`
- **Indexes**: `idx_mnemonics_character`, `idx_mnemonics_content_type`
- **RLS**: public select; insert/update/delete restricted to `service_role`.
- **Notes**: `getCachedMnemonic` reads are micro-batched client-side (one `IN` query per burst instead of per-character round trips).

---

## ⚡ Stored Procedures (RPCs)

| RPC | Purpose | Notes |
|---|---|---|
| `search_dictionary(search_query text, result_limit int default 50)` | Scored dictionary search (hanzi/pinyin/english) | Hanzi queries use tiered exact→prefix→capped-substring matching; the legacy `search_dictionary(text)` ILIKE overload was dropped in the cleanup |
| `upsert_card_progress(p_records jsonb)` | Batch upsert SRS card rows (security definer, fills `user_id` from JWT) | |
| `upsert_daily_progress(...)` | Atomic daily progress increment + activity breakdown merge | Validates `p_user_id = auth.uid()` |
| `get_user_aggregate_stats(p_user_id uuid)` | Server-side streak/XP/review aggregates | |
| `reset_user_learning_progress()` | Clears the caller's `user_card_progress` and `learned_cards` | Added in the cleanup; was previously missing from the live DB |
| `handle_new_user()` | Trigger on `auth.users` insert → creates `user_profiles` row | |

---

## 🔐 RLS & Grants Notes

- All `user_*` tables have RLS enabled with owner-only policies; `anon` grants were revoked from user tables in the cleanup (RLS already denied reads; the grants were misleading).
- `mnemonics` has RLS; content tables (`dictionary`, `character_breakdowns_v2`, `book_vocabulary`) are open reads.
- Dropped in the cleanup (2026-08-27): `global_dictionary` (duplicate of `dictionary`), `character_breakdowns` (v1), `historical_dictionary` (empty), `personal_vocabulary` + `personal_vocab_folders` (never read by the app), `user_progress` (metadata migrated to `user_profiles`), `mnemonic_generation_queue` (no writers/workers anywhere in the codebase), the dead `user_profiles.personal_vocab_*` columns, and the legacy `search_dictionary(text)` overload.

---

## 🚚 Fetch Paths

Client code never talks to the database directly for reference content — it goes through `src/services/` which implement a **pack-first** strategy:

1. **Static packs** (`public/data/...`) fetched once and cached in IndexedDB (`staticContentService`, keyed by manifest version with stale-version pruning):
   - dictionary lookups → `public/data/dictionary/` shards
   - character breakdowns → `public/data/breakdowns/` shards
   - breakdown "used in" lists → `public/data/breakdowns/used-as.json` (component → characters inverted index)
   - course vocabulary → `public/data/vocabulary/` book packs
   - course examples → `public/data/course-examples/`
   - stroke data → `public/hanzi-data/` (CDN fallback)
2. **Supabase fallback**: direct table queries or RPCs when packs are missing/unavailable.
3. **In-memory caches** (`src/utils/cache.ts`) dedupe repeated lookups; `requestTiming` instruments data calls.

The former `public/dictionary_trie.json` (13 MB startup download) was removed in the cleanup; word validation and segmentation now resolve through pack-backed batch lookups instead.
