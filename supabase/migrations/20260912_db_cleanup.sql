-- Database cleanup pass (2026-09-12)
--
-- Findings from the live-DB audit:
--   1. user_card_progress has two single-column indexes (user_id,
--      next_review_date) while the PK already covers user_id lookups and the
--      only next_review_date consumer (get_due_card_ids) always filters by
--      user_id too — both singles are dead weight; a composite (user_id,
--      next_review_date) serves every real access path.
--   2. idx_user_daily_progress_user_date (user_id, date DESC) duplicates the
--      (user_id, date) primary key.
--   3. Planner stats are stale (book_vocabulary estimates 0 rows vs 4061
--      actual, character_breakdowns_v2 0 vs live data) — table-stats was
--      misreporting every content table.
--   4. One junk progress row: 'B1L01-R01-speaker' (a dialogue-speaker id,
--      matches neither the vocabulary-id pattern, nor packs, nor an alive
--      custom card).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. user_card_progress indexes: composite replaces the two single-column
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_card_progress_user_due
    ON public.user_card_progress (user_id, next_review_date);

DROP INDEX IF EXISTS public.idx_user_card_progress_user_id;
DROP INDEX IF EXISTS public.idx_user_card_progress_next_review;

-- ---------------------------------------------------------------------------
-- 2. user_daily_progress: drop the PK-duplicating index
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_user_daily_progress_user_date;

-- ---------------------------------------------------------------------------
-- 3. Junk card-progress / learned rows
-- ---------------------------------------------------------------------------
DELETE FROM public.user_card_progress
WHERE card_id = 'B1L01-R01-speaker';

DELETE FROM public.user_learned_cards
WHERE card_id = 'B1L01-R01-speaker';

COMMIT;

-- ---------------------------------------------------------------------------
-- 4. Refresh planner statistics (ANALYZE must run outside the transaction)
-- ---------------------------------------------------------------------------
ANALYZE public.book_vocabulary;
ANALYZE public.character_breakdowns_v2;
ANALYZE public.mnemonics;
ANALYZE public.user_card_progress;
ANALYZE public.user_learned_cards;
ANALYZE public.user_flashcards;
ANALYZE public.user_daily_progress;
ANALYZE public.user_profiles;
