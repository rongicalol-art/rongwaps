-- RongWaps data-layer cleanup (2026-08-27)
--
-- Removes duplicate/legacy/dead tables, migrates the last bit of user_progress
-- metadata into user_profiles, adds the missing reset RPC, and tightens RLS.
--
-- Safe on the current live DB: all user tables are empty (pre-launch), and the
-- dropped content tables (global_dictionary, character_breakdowns v1,
-- historical_dictionary) are never read by the app.
--
-- Sections:
--   1. Migrate user_progress metadata -> user_profiles
--   2. Drop legacy/duplicate/dead tables
--   3. Drop legacy search_dictionary(text) overload (keeps the scored one)
--   4. Create missing reset_user_learning_progress RPC
--   5. RLS hardening (user_profiles owner-only select, anon grants removed)

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Migrate legacy user_progress metadata into user_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS learned_cards text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_activity text;

INSERT INTO public.user_profiles (id, learned_cards, last_activity, updated_at)
SELECT user_id, learned_cards, last_activity, NOW()
FROM public.user_progress
ON CONFLICT (id) DO UPDATE SET
  learned_cards = EXCLUDED.learned_cards,
  last_activity = EXCLUDED.last_activity,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 2. Drop the legacy ILIKE search overload first: `search_dictionary(text)`
--    returns `SETOF global_dictionary`, so its row type blocks the table drop.
--    Keeps the scored overload search_dictionary(text, integer).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_dictionary(text);

-- ---------------------------------------------------------------------------
-- 3. Drop legacy/duplicate/dead tables
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.personal_vocabulary;      -- never read by the app; FK to personal_vocab_folders
DROP TABLE IF EXISTS public.personal_vocab_folders;   -- never read by the app
DROP TABLE IF EXISTS public.global_dictionary;        -- exact duplicate of dictionary (122,330 rows)
DROP TABLE IF EXISTS public.character_breakdowns;     -- superseded by character_breakdowns_v2
DROP TABLE IF EXISTS public.historical_dictionary;    -- empty since inception
DROP TABLE IF EXISTS public.user_progress;            -- metadata migrated to user_profiles in step 1

-- ---------------------------------------------------------------------------
-- 4. Create the missing reset RPC (the app calls it; it was never deployed)
--    Deletes only learning progress: SRS card rows + learned-cards metadata.
--    Saved words, custom folders, and custom cards remain intact.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_user_learning_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_card_progress
  WHERE user_id = auth.uid();

  UPDATE public.user_profiles
  SET learned_cards = '{}',
      updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

GRANT ALL ON FUNCTION public.reset_user_learning_progress() TO anon;
GRANT ALL ON FUNCTION public.reset_user_learning_progress() TO authenticated;
GRANT ALL ON FUNCTION public.reset_user_learning_progress() TO service_role;

-- ---------------------------------------------------------------------------
-- 5. RLS hardening
-- ---------------------------------------------------------------------------
-- Profiles: any authenticated user could previously read every profile.
DROP POLICY IF EXISTS "Authenticated users can view user profiles" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Remove anon grants on user tables (RLS already denied reads; drop the grants).
REVOKE ALL ON TABLE public.user_card_progress, public.user_daily_progress,
  public.user_flashcards, public.user_folders, public.user_profiles
  FROM anon;

-- Mnemonic generation queue is service-internal (worker only); stop exposing
-- pending/erroring generation tasks to browsers.
DROP POLICY IF EXISTS "Anyone can view mnemonic queue" ON public.mnemonic_generation_queue;
REVOKE ALL ON TABLE public.mnemonic_generation_queue FROM anon, authenticated;

COMMIT;
