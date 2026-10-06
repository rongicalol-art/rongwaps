-- Contract step for the user-data audit (2026-10-06)
--
-- DESTRUCTIVE for the previous client build: apply only after the client that
-- uses get_sync_state / user_profiles.settings (20261005) is deployed and old
-- tabs have had time to update. An old client reads user_profiles.learned_cards
-- and calls upsert_daily_progress, both removed here.
--
-- 1. Learned cards live only in user_learned_cards. The legacy
--    user_profiles.learned_cards array (rewritten whole on every first pass,
--    locked row and all) is dropped and the three learned RPCs stop mirroring
--    into it. replace_learned_cards now deletes only the rows that left the
--    set, so surviving rows keep their created_at (the incremental-pull key).
-- 2. user_profiles.last_activity is dropped: it was only ever written, never
--    applied to client state (the last-activity pointer is local-only).
-- 3. user_daily_progress and upsert_daily_progress are dropped: no reader
--    exists in the app (XP and streaks were removed), yet every save paid one
--    RPC for it.
-- 4. Preferences are removed from auth user_metadata (they ride in every
--    JWT) after a final backfill into user_profiles.settings.
-- 5. get_due_card_ids and its index are dropped (local SRS state is fresher).
-- 6. The user RPCs lose their anon / PUBLIC execute grants; they only make
--    sense for a signed-in user.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Learned cards: table only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_learned_cards(p_cards text[]) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    INSERT INTO public.user_learned_cards (user_id, card_id)
    SELECT auth.uid(), c
    FROM unnest(p_cards) AS c
    ON CONFLICT (user_id, card_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.replace_learned_cards(p_cards text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    DELETE FROM public.user_learned_cards
    WHERE user_id = auth.uid()
      AND card_id <> ALL (p_cards);

    INSERT INTO public.user_learned_cards (user_id, card_id)
    SELECT auth.uid(), c
    FROM unnest(p_cards) AS c
    ON CONFLICT (user_id, card_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_user_learning_progress() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    DELETE FROM public.user_card_progress WHERE user_id = auth.uid();
    DELETE FROM public.user_learned_cards WHERE user_id = auth.uid();

    UPDATE public.user_profiles
    SET updated_at = now()
    WHERE id = auth.uid();
END;
$$;

ALTER FUNCTION public.append_learned_cards(text[]) OWNER TO postgres;
ALTER FUNCTION public.replace_learned_cards(text[]) OWNER TO postgres;
ALTER FUNCTION public.reset_user_learning_progress() OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- 2. Dead profile columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
    DROP COLUMN IF EXISTS learned_cards,
    DROP COLUMN IF EXISTS last_activity;

-- ---------------------------------------------------------------------------
-- 3. Write-only daily progress
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.upsert_daily_progress(uuid, text, integer, integer, integer, integer, text, integer);
DROP TABLE IF EXISTS public.user_daily_progress;

-- ---------------------------------------------------------------------------
-- 5. Due-card ids come from local SRS state (it includes unsaved reviews, and
--     pulls already merge other devices), so the RPC and its index go.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_due_card_ids();
DROP INDEX IF EXISTS public.idx_user_card_progress_user_due;

-- ---------------------------------------------------------------------------
-- 4. Preferences off the JWT (final backfill, then strip from user_metadata)
-- ---------------------------------------------------------------------------
UPDATE public.user_profiles p
SET settings = s.prefs || p.settings
FROM (
    SELECT id,
           jsonb_strip_nulls(jsonb_build_object(
               'favorites', raw_user_meta_data -> 'favorites',
               'activeBookId', raw_user_meta_data -> 'activeBookId',
               'characterPreference', raw_user_meta_data -> 'characterPreference',
               'sessionProgressIndex', raw_user_meta_data -> 'sessionProgressIndex',
               'activeTab', raw_user_meta_data -> 'activeTab',
               'selectedLessons', raw_user_meta_data -> 'selectedLessons',
               'selectedBooks', raw_user_meta_data -> 'selectedBooks'
           )) AS prefs
    FROM auth.users
) s
WHERE s.id = p.id
  AND s.prefs <> '{}'::jsonb;

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - ARRAY[
    'favorites', 'activeBookId', 'characterPreference', 'sessionProgressIndex',
    'activeTab', 'activeActivity', 'selectedLessons', 'selectedBooks'
]
WHERE raw_user_meta_data IS NOT NULL
  AND raw_user_meta_data <> raw_user_meta_data - ARRAY[
    'favorites', 'activeBookId', 'characterPreference', 'sessionProgressIndex',
    'activeTab', 'activeActivity', 'selectedLessons', 'selectedBooks'
  ];

-- ---------------------------------------------------------------------------
-- 6. Signed-in-only RPC grants
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.upsert_card_progress(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.append_learned_cards(text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.replace_learned_cards(text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_user_learning_progress() FROM PUBLIC, anon;

COMMIT;
