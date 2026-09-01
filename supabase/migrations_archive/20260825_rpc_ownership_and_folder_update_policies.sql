-- ══════════════════════════════════════════════════════════════════════════
-- ⚠️  SUPERSEDED — DO NOT RUN THIS FILE AS-IS
--
-- Everything in it that still applies is already shipped by the live-schema
-- baseline `supabase/migrations/20260825000000_live_schema_baseline.sql`
-- (the RPC ownership guards and the user_folders / user_flashcards FOR
-- UPDATE policies are all in the baseline), and the cleanup migration
-- `supabase/migrations/20260827000000_data_cleanup.sql` DROPPED
-- `personal_vocabulary` on 2026-08-27 — so section 3 below fails with
-- `42P01: relation "public.personal_vocabulary" does not exist` and is
-- obsolete anyway (the table is gone, its policy with it).
--
-- If you need to verify a drifted live DB, run the probes in section 4 and,
-- only when they show gaps, apply sections 1–2 with section 3 removed.
-- ══════════════════════════════════════════════════════════════════════════
--
-- Original intent (kept for history):
--
-- Security & consistency hardening (2026-08-25 performance audit follow-up).
--
-- 1. upsert_daily_progress and get_user_aggregate_stats are SECURITY DEFINER
--    and accept p_user_id directly. Without an ownership check, ANY
--    authenticated user could pass another user's UUID to read their aggregate
--    stats or inject XP/reviews into their daily progress, bypassing RLS.
--    Both functions now reject callers whose JWT uid differs from p_user_id
--    (same pattern reset_user_learning_progress already used).
-- 2. user_folders and user_flashcards never had FOR UPDATE policies in any
--    migration, but userService.syncCustomFolders runs an upsert against
--    user_folders on every autosave (INSERT ... ON CONFLICT DO UPDATE needs an
--    UPDATE policy). Add the missing policies so fresh environments match the
--    intended behavior regardless of dashboard drift.
-- 3. personal_vocabulary UPDATE policy had USING but no WITH CHECK, allowing a
--    row's user_id to be reassigned to another account. Tighten it.
--    (OBSOLETE: table dropped by 20260827000000_data_cleanup.sql.)
--
-- Deployment note: the CLI migration history is drifted from the live project
-- (see docs/AUDIT_2026-08-24.md §4), so `supabase db push` is blocked. Apply
-- this file via Dashboard -> SQL Editor -> Run, then verify with the probes
-- listed at the bottom.

-- ── 1a. upsert_daily_progress: enforce ownership ─────────────────────
-- Signature unchanged (callers in progressService.ts keep working); only the
-- body gains the guard and the pinned search_path.
CREATE OR REPLACE FUNCTION public.upsert_daily_progress(
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
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'upsert_daily_progress: caller may only modify their own progress';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.upsert_daily_progress(UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, INTEGER) TO authenticated;

-- ── 1b. get_user_aggregate_stats: enforce ownership ──────────────────
-- Body matches the 20260810_perf_hardening version (rolling window +
-- gaps-and-islands streaks) plus the ownership guard.
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
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'get_user_aggregate_stats: caller may only read their own stats';
  END IF;

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

-- ── 2. Missing FOR UPDATE policies ───────────────────────────────────
DROP POLICY IF EXISTS "Users can update their own folders" ON public.user_folders;
CREATE POLICY "Users can update their own folders"
  ON public.user_folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own flashcards" ON public.user_flashcards;
CREATE POLICY "Users can update their own flashcards"
  ON public.user_flashcards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. personal_vocabulary: add WITH CHECK to UPDATE ─────────────────
-- ⚠️  OBSOLETE — DO NOT RUN. personal_vocabulary was dropped by
-- `20260827000000_data_cleanup.sql` (2026-08-27); running this section
-- fails with 42P01. Kept only as history.
DROP POLICY IF EXISTS "Users can update their own vocabulary" ON public.personal_vocabulary;
CREATE POLICY "Users can update their own vocabulary"
  ON public.personal_vocabulary FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Verification probes ──────────────────────────────────────────────
-- NOTE: the Dashboard SQL Editor runs as the postgres role with NO JWT, so
-- auth.uid() is NULL there and EVERY p_user_id is rejected — including your
-- own. That proves the guard is active, not broken. The real end-to-end check
-- is using the signed-in app, which calls through PostgREST with a JWT.
--
-- 1. Guard active (Dashboard): both must ERROR with 'may only ... their own':
--      select upsert_daily_progress('<your-uuid>', '2026-01-01', 999);
--      select * from get_user_aggregate_stats('<your-uuid>');
-- 2. Real end-to-end check (real JWT path): sign in to the app -> Profile
--      shows streak/XP -> finish a short review session -> XP updates.
-- 3. Policies present (Dashboard):
--      select tablename, policyname, cmd from pg_policies
--       where tablename in ('user_folders','user_flashcards')
--       order by tablename, policyname;
--      Expected: an UPDATE policy on each of the two tables.
--      (personal_vocabulary no longer exists — do not include it here.)
