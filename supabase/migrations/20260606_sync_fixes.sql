-- Migration: Ensure user_card_progress has proper indexes and RLS for direct upsert
-- (The table and RLS policies already exist from 20260531, this adds missing pieces)

-- 1. Add index on user_id for faster lookups during sync
CREATE INDEX IF NOT EXISTS idx_user_card_progress_user_id
  ON public.user_card_progress (user_id);

-- 2. Add index on next_review_date for efficient "due cards" queries
CREATE INDEX IF NOT EXISTS idx_user_card_progress_next_review
  ON public.user_card_progress (next_review_date);

-- 3. Ensure the upsert RPC function accepts the records directly
-- (Already exists from 20260531, but let's make sure it handles conflicts properly)
CREATE OR REPLACE FUNCTION upsert_card_progress(
  p_records JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_card_progress (
    user_id, card_id, ease, interval, repetitions, next_review_date, last_updated
  )
  SELECT
    auth.uid(),
    (rec->>'card_id')::TEXT,
    (rec->>'ease')::NUMERIC,
    (rec->>'interval')::INTEGER,
    (rec->>'repetitions')::INTEGER,
    (rec->>'next_review_date')::TIMESTAMP WITH TIME ZONE,
    NOW()
  FROM jsonb_array_elements(p_records) AS rec
  ON CONFLICT (user_id, card_id)
  DO UPDATE SET
    ease = EXCLUDED.ease,
    interval = EXCLUDED.interval,
    repetitions = EXCLUDED.repetitions,
    next_review_date = EXCLUDED.next_review_date,
    last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION upsert_card_progress(JSONB) TO authenticated;
