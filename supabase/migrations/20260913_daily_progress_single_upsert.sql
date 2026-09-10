-- Daily-progress RPC hardening (2026-09-13)
--
-- upsert_daily_progress previously did a pre-SELECT before its INSERT — two
-- table touches per call, on a call made every cloud save (10-45s while
-- studying). On a small table the planner seq-scans those reads, which
-- accumulated ~148k seq scans; at scale the 400-day-window aggregate reads
-- would have been the heavier problem.
--
-- 1. Rewrite as a single-statement upsert: the activity-breakdown merge is
--    computed inside DO UPDATE from the existing row (COALESCE-safe for
--    legacy rows whose breakdown is NULL), so the pre-SELECT disappears.
--    Signature unchanged — no client changes.
-- 2. Drop get_user_aggregate_stats: dead since XP/streaks were removed from
--    the product (zero callers in src/ or server/; the client writes
--    xp_earned as 0). Re-add it if streaks ever return.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. upsert_daily_progress: single-statement upsert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."upsert_daily_progress"(
    "p_user_id" "uuid",
    "p_date" "text",
    "p_xp_earned" integer DEFAULT 0,
    "p_cards_reviewed" integer DEFAULT 0,
    "p_cards_learned" integer DEFAULT 0,
    "p_study_time_minutes" integer DEFAULT 0,
    "p_activity_type" "text" DEFAULT NULL::"text",
    "p_activity_count" integer DEFAULT 0
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'upsert_daily_progress: caller may only modify their own progress';
  END IF;

  INSERT INTO public.user_daily_progress (
    user_id, date, xp_earned, cards_reviewed, cards_learned,
    study_time_minutes, activities_breakdown, created_at, updated_at
  )
  VALUES (
    p_user_id, p_date,
    p_xp_earned, p_cards_reviewed, p_cards_learned,
    p_study_time_minutes,
    -- First study day: default skeleton + this call's activity increment.
    CASE
      WHEN p_activity_type IS NOT NULL AND p_activity_count > 0
      THEN jsonb_set(
        '{"flashcards":0,"quiz":0,"listening":0,"writing":0}'::jsonb,
        ARRAY[p_activity_type],
        to_jsonb(p_activity_count)
      )
      ELSE '{"flashcards":0,"quiz":0,"listening":0,"writing":0}'::jsonb
    END,
    NOW(), NOW()
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    xp_earned = public.user_daily_progress.xp_earned + p_xp_earned,
    cards_reviewed = public.user_daily_progress.cards_reviewed + p_cards_reviewed,
    cards_learned = public.user_daily_progress.cards_learned + p_cards_learned,
    study_time_minutes = public.user_daily_progress.study_time_minutes + p_study_time_minutes,
    activities_breakdown = CASE
      WHEN p_activity_type IS NOT NULL AND p_activity_count > 0
      THEN jsonb_set(
        COALESCE(
          public.user_daily_progress.activities_breakdown,
          '{"flashcards":0,"quiz":0,"listening":0,"writing":0}'::jsonb
        ),
        ARRAY[p_activity_type],
        to_jsonb(
          COALESCE((public.user_daily_progress.activities_breakdown ->> p_activity_type)::INTEGER, 0)
          + p_activity_count
        )
      )
      ELSE COALESCE(
        public.user_daily_progress.activities_breakdown,
        '{"flashcards":0,"quiz":0,"listening":0,"writing":0}'::jsonb
      )
    END,
    updated_at = NOW();
END;
$$;

ALTER FUNCTION "public"."upsert_daily_progress"("p_user_id" "uuid", "p_date" "text", "p_xp_earned" integer, "p_cards_reviewed" integer, "p_cards_learned" integer, "p_study_time_minutes" integer, "p_activity_type" "text", "p_activity_count" integer) OWNER TO "postgres";

-- ---------------------------------------------------------------------------
-- 2. Drop the dead aggregate-stats RPC
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS "public"."get_user_aggregate_stats"("p_user_id" "uuid");

COMMIT;
