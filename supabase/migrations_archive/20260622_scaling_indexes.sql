-- Migration: Performance indexes for scaling to 10K+ users
-- Adds missing indexes and optimizes hot-path queries

-- 1. user_card_progress: index for fetching all cards for a user
-- The PK is (user_id, card_id) which covers this, but add an explicit
-- index on next_review_date for efficient "cards due for review" queries
CREATE INDEX IF NOT EXISTS idx_user_card_progress_next_review
  ON public.user_card_progress (user_id, next_review_date);

-- 2. user_folders: index for fetching all folders for a user
CREATE INDEX IF NOT EXISTS idx_user_folders_user_id
  ON public.user_folders (user_id);

-- 3. user_flashcards: index for fetching all flashcards for a user
CREATE INDEX IF NOT EXISTS idx_user_flashcards_user_id
  ON public.user_flashcards (user_id);

-- 4. user_flashcards: index for folder-based queries
CREATE INDEX IF NOT EXISTS idx_user_flashcards_folder_id
  ON public.user_flashcards (folder_id);

-- 5. Add a stored procedure for atomic daily progress upsert
-- Replaces the 2-round-trip (SELECT + UPSERT) pattern with a single RPC
CREATE OR REPLACE FUNCTION upsert_daily_progress(
  p_user_id UUID,
  p_date TEXT,
  p_xp_earned INTEGER DEFAULT 0,
  p_cards_reviewed INTEGER DEFAULT 0,
  p_cards_learned INTEGER DEFAULT 0,
  p_study_time_minutes INTEGER DEFAULT 0,
  p_activity_type TEXT DEFAULT NULL,
  p_activity_count INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  existing_breakdown JSONB;
  key TEXT;
BEGIN
  -- Get existing breakdown
  SELECT activities_breakdown INTO existing_breakdown
  FROM public.user_daily_progress
  WHERE user_id = p_user_id AND date = p_date;

  IF existing_breakdown IS NULL THEN
    existing_breakdown := '{"flashcards":0,"quiz":0,"listening":0,"writing":0}'::jsonb;
  END IF;

  -- Increment activity breakdown
  IF p_activity_type IS NOT NULL AND p_activity_count > 0 THEN
    key := p_activity_type;
    existing_breakdown := jsonb_set(
      existing_breakdown,
      ARRAY[key],
      to_jsonb(COALESCE((existing_breakdown->>key)::INTEGER, 0) + p_activity_count)
    );
  END IF;

  INSERT INTO public.user_daily_progress (
    user_id, date, xp_earned, cards_reviewed, cards_learned,
    study_time_minutes, activities_breakdown, created_at, updated_at
  ) VALUES (
    p_user_id, p_date,
    p_xp_earned, p_cards_reviewed, p_cards_learned,
    p_study_time_minutes, existing_breakdown,
    NOW(), NOW()
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    xp_earned = public.user_daily_progress.xp_earned + p_xp_earned,
    cards_reviewed = public.user_daily_progress.cards_reviewed + p_cards_reviewed,
    cards_learned = public.user_daily_progress.cards_learned + p_cards_learned,
    study_time_minutes = public.user_daily_progress.study_time_minutes + p_study_time_minutes,
    activities_breakdown = existing_breakdown,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add a stored procedure for getting aggregate stats efficiently
-- Replaces client-side summing of all rows with server-side SQL aggregation
CREATE OR REPLACE FUNCTION get_user_aggregate_stats(
  p_user_id UUID
) RETURNS TABLE (
  total_xp BIGINT,
  total_cards_reviewed BIGINT,
  total_cards_learned BIGINT,
  current_streak INTEGER,
  longest_streak INTEGER,
  last_study_date TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COALESCE(SUM(xp_earned), 0) AS total_xp,
      COALESCE(SUM(cards_reviewed), 0) AS total_cards_reviewed,
      COALESCE(SUM(cards_learned), 0) AS total_cards_learned,
      MAX(date) AS last_study_date
    FROM public.user_daily_progress
    WHERE user_id = p_user_id
  ),
  streak_calc AS (
    SELECT
      COUNT(*) FILTER (
        WHERE date >= TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD')
      ) AS has_recent,
      COUNT(*) AS total_days
    FROM public.user_daily_progress
    WHERE user_id = p_user_id
  )
  SELECT
    s.total_xp,
    s.total_cards_reviewed,
    s.total_cards_learned,
    -- Simplified streak: count consecutive days ending today/yesterday
    (SELECT COUNT(*)::INTEGER FROM (
      SELECT date, ROW_NUMBER() OVER (ORDER BY date DESC) AS rn
      FROM public.user_daily_progress
      WHERE user_id = p_user_id
    ) sub WHERE date = TO_CHAR(CURRENT_DATE - (rn - 1) * INTERVAL '1 day', 'YYYY-MM-DD')
    AND date >= TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD')
    ) AS current_streak,
    0 AS longest_streak,  -- Computed client-side if needed
    s.last_study_date
  FROM stats s, streak_calc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_daily_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_aggregate_stats TO authenticated;