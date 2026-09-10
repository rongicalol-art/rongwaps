-- Intraday SRS learning steps: track the current learning-step index so a
-- card's intraday schedule survives sync. The full timestamp is already stored
-- in next_review_date; this column only records which step the card is on.

ALTER TABLE "public"."user_card_progress"
    ADD COLUMN IF NOT EXISTS "learning_step" integer;

-- Update the batch upsert RPC to carry learning_step so it round-trips.
-- Matches the existing RPC shape (auth.uid() / NOW() / SECURITY DEFINER).
CREATE OR REPLACE FUNCTION "public"."upsert_card_progress"("p_records" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_card_progress (
    user_id, card_id, ease, interval, repetitions, next_review_date, learning_step, last_updated
  )
  SELECT
    auth.uid(),
    (rec->>'card_id')::TEXT,
    (rec->>'ease')::NUMERIC,
    (rec->>'interval')::INTEGER,
    (rec->>'repetitions')::INTEGER,
    (rec->>'next_review_date')::TIMESTAMP WITH TIME ZONE,
    (rec->>'learning_step')::INTEGER,
    NOW()
  FROM jsonb_array_elements(p_records) AS rec
  ON CONFLICT (user_id, card_id)
  DO UPDATE SET
    ease = EXCLUDED.ease,
    interval = EXCLUDED.interval,
    repetitions = EXCLUDED.repetitions,
    next_review_date = EXCLUDED.next_review_date,
    learning_step = EXCLUDED.learning_step,
    last_updated = EXCLUDED.last_updated;
END;
$$;

ALTER FUNCTION "public"."upsert_card_progress"("p_records" "jsonb") OWNER TO "postgres";
