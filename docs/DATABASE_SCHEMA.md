# 🗄️ Supabase Database Schema

This document details the database tables, relationships, Row-Level Security (RLS) policies, and RPC functions in the **RongWaps** Supabase instance.

---

## 📊 Entity Relationship Summary

The application operates with a user-centric database model. Core user tables reference `auth.users.id` with cascade deletion.

```
                  +-------------------+
                  |    auth.users     |
                  +---------+---------+
                            |
       +--------------------+--------------------+--------------------+
       | (1:1)              | (1:N)              | (1:N)              | (1:N)
+------v-------+    +-------v--------+   +-------v-------+    +-------v--------+
|   profiles   |    |  user_folders  |   | card_progress |    | daily_progress |
+--------------+    +-------+--------+   +---------------+    +----------------+
                            | (1:N)
                    +-------v--------+
                    | user_flashcards|
                    +----------------+
```

---

## 📁 Table Definitions

### 1. `profiles`
Stores user profile information, active streak info, and totals.
- **Columns**:
  - `id` (uuid, Primary Key) -> References `auth.users.id`
  - `email` (text)
  - `display_name` (text)
  - `avatar_url` (text)
  - `character_pref` (text, default: `'simplified'`)
  - `total_xp` (integer, default: `0`)
  - `created_at` (timestamp)
- **RLS**:
  - Select/Update: Authorized if `auth.uid() = id`.

### 2. `user_folders`
Custom folders created by users to group flashcards.
- **Columns**:
  - `id` (uuid, Primary Key, default: `uuid_generate_v4()`)
  - `user_id` (uuid) -> References `auth.users.id`
  - `name` (text)
  - `color` (text)
  - `created_at` (timestamp)
- **Indexes**:
  - `idx_user_folders_user_id` on (`user_id`)
- **RLS**:
  - Select/Insert/Update/Delete: Authorized if `auth.uid() = user_id`.

### 3. `user_flashcards`
Custom vocabulary cards added inside a user's folders.
- **Columns**:
  - `id` (uuid, Primary Key)
  - `folder_id` (uuid) -> References `user_folders.id` on delete cascade
  - `user_id` (uuid) -> References `auth.users.id`
  - `front` (text) — Chinese character/phrase
  - `back` (text) — Meaning
  - `pinyin` (text)
  - `audio` (text, nullable)
  - `created_at` (timestamp)
- **Indexes**:
  - `idx_user_flashcards_user_folder` on (`user_id`, `folder_id`)
- **RLS**:
  - Select/Insert/Update/Delete: Authorized if `auth.uid() = user_id`.

### 4. `user_card_progress`
Granular card-level progress for the Spaced Repetition System (SRS).
- **Columns**:
  - `user_id` (uuid) -> References `auth.users.id`
  - `card_id` (text) — Matches HSK/TOCFL card IDs or custom card UUIDs
  - `ease` (numeric) — E-Factor for scheduling (default: `2.5`)
  - `interval` (integer) — Days until next review (default: `0`)
  - `repetitions` (integer) — Streak of successful reviews (default: `0`)
  - `next_review_date` (timestamp)
  - `last_updated` (timestamp)
- **Primary Key**: (`user_id`, `card_id`)
- **Indexes**:
  - `idx_user_card_progress_next_review` on (`user_id`, `next_review_date`)
- **RLS**:
  - Select/Upsert: Authorized if `auth.uid() = user_id`.

### 5. `user_progress`
Legacy metadata tracking for overall stats.
- **Columns**:
  - `user_id` (uuid, Primary Key) -> References `auth.users.id`
  - `learned_cards` (text[])
  - `last_activity` (text)
  - `updated_at` (timestamp)

### 6. `mnemonics`
Cache for AI-generated and pregrenated memory hooks.
- **Columns**:
  - `id` (text, Primary Key) — Formatted as `word_{text}` or `{character}`
  - `mnemonic` (jsonb) — Contains the generated story, parts breakdown, and metadata
  - `created_at` (timestamp)
- **RLS**:
  - Select: Publicly readable.
  - Insert: Authenticated users.

### 7. `daily_progress`
Tracks daily XP gains and study history.
- **Columns**:
  - `id` (uuid, Primary Key)
  - `user_id` (uuid) -> References `auth.users.id`
  - `date` (date)
  - `xp_gained` (integer)
  - `cards_reviewed` (integer)
  - `created_at` (timestamp)
- **Primary Key / Unique Constraint**: Unique on (`user_id`, `date`)
- **RLS**:
  - Select/Upsert: Authorized if `auth.uid() = user_id`.

---

## ⚡ Stored Procedures (RPCs)

### `upsert_daily_progress`
Atomically records user XP gains for a specific date and updates streak information in a single database round-trip.
- **Arguments**:
  - `p_user_id` (uuid)
  - `p_date` (date)
  - `p_xp` (integer)
  - `p_cards_reviewed` (integer)

### `get_user_aggregate_stats`
Aggregates review activity, streak length, and historical totals server-side, preventing expensive client-side row scans.
- **Arguments**:
  - `p_user_id` (uuid)
- **Returns**: A single row containing streak, XP, reviews count, and study dates.
