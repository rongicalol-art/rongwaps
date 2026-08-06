-- Migration: Performance & database hardening
-- 1. Missing hot-path indexes
-- 2. SET search_path on SECURITY DEFINER functions (functions without it are
--    vulnerable to search_path hijacking and make role-based behavior implicit)
-- 3. Bounds get_user_aggregate_stats to a rolling 366-day window and computes
--    longest_streak server-side (previously hardcoded 0 + unbounded full scan)

-- ── 1. Missing indexes ────────────────────────────────────────────────
-- mnemonicCache.ts:52-58 queries .eq('character', lookupText) — only id PK
-- and content_type were indexed.
CREATE INDEX IF NOT EXISTS idx_mnemonics_character
  ON public.mnemonics (character);

-- personal_vocabulary: hot sort by created_at within a user (library sort),
-- plus GIN on tags for tag-filter lookups.
CREATE INDEX IF NOT EXISTS idx_personal_vocabulary_user_created
  ON public.personal_vocabulary (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personal_vocabulary_tags_gin
  ON public.personal_vocabulary USING gin (tags);

-- ── 2. SECURITY DEFINER functions: pin search_path ────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'upsert_daily_progress'
      AND pg_function_is_visible(oid)
  ) THEN
    EXECUTE 'ALTER FUNCTION public.upsert_daily_progress(UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, INTEGER)
      SET search_path = public';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'upsert_card_progress'
      AND pg_function_is_visible(oid)
  ) THEN
    EXECUTE 'ALTER FUNCTION public.upsert_card_progress(JSONB)
      SET search_path = public';
  END IF;
END
$$;

-- ── 3. get_user_aggregate_stats: rolling window + real longest streak ─
CREATE OR REPLACE FUNCTION public.get_user_aggregate_stats(
  p_user_id UUID
) RETURNS TABLE (
  total_xp BIGINT,
  total_cards_reviewed BIGINT,
  total_cards_learned BIGINT,
  current_streak INTEGER,
  longest_streak INTEGER,
  last_study_date TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start_date TEXT := TO_CHAR(CURRENT_DATE - INTERVAL '400 days', 'YYYY-MM-DD');
BEGIN
  RETURN QUERY
  WITH daily AS (
    -- Rolling window bounds every scan below; streaks longer than ~400 days
    -- are not physically meaningful for a streak UI.
    SELECT date
    FROM public.user_daily_progress
    WHERE user_id = p_user_id
      AND date >= v_start_date
  ),
  stats AS (
    SELECT
      COALESCE(SUM(xp_earned), 0)::BIGINT AS total_xp,
      COALESCE(SUM(cards_reviewed), 0)::BIGINT AS total_cards_reviewed,
      COALESCE(SUM(cards_learned), 0)::BIGINT AS total_cards_learned,
      MAX(date) AS last_study_date
    FROM public.user_daily_progress
    WHERE user_id = p_user_id
      AND date >= v_start_date
  ),
  -- Group consecutive dates into runs (standard gaps-and-islands).
  runs AS (
    SELECT
      date::date - (ROW_NUMBER() OVER (ORDER BY date))::INTEGER * INTERVAL '1 day' AS grp
    FROM daily
  ),
  run_lengths AS (
    SELECT COUNT(*)::INTEGER AS run_length
    FROM runs
    GROUP BY grp
  ),
  streak_calc AS (
    SELECT
      COALESCE(MAX(run_length), 0) AS longest_streak
    FROM run_lengths
  ),
  current_run AS (
    SELECT COUNT(*)::INTEGER AS current_streak
    FROM (
      SELECT
        date::date AS d,
        ROW_NUMBER() OVER (ORDER BY date DESC) AS rn
      FROM daily
    ) sub
    WHERE d = CURRENT_DATE - (rn - 1) * INTERVAL '1 day'
      AND d >= CURRENT_DATE - INTERVAL '1 day'
  )
  SELECT
    s.total_xp,
    s.total_cards_reviewed,
    s.total_cards_learned,
    COALESCE(cr.current_streak, 0),
    sc.longest_streak,
    s.last_study_date
  FROM stats s, streak_calc sc, current_run cr;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_aggregate_stats(UUID) TO authenticated;