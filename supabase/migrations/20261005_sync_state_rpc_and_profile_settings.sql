-- Sync state in one round trip + preferences off the JWT (2026-10-05)
--
-- EXPAND step: purely additive, safe to apply while the previous client is
-- still deployed. Apply this BEFORE shipping the client that calls
-- get_sync_state; apply 20261006 (contract) only after that client is live.
--
-- 1. user_profiles.settings (jsonb): the synced preferences (favorites,
--    active book, character preference, lesson/book selection, resume
--    points) used to live in auth user_metadata, which is embedded in every
--    access token and rewritten through the auth API. They now live on the
--    profile row. Backfilled from user_metadata here.
-- 2. get_sync_state(p_since): the whole pull (card rows, learned ids,
--    profile settings, folders) as one jsonb. It replaces four requests
--    (card progress, learned ids, profile, folders) plus an auth getUser
--    call. Cards and learned ids are incremental from p_since; 'cursor' is
--    the newest timestamp among the returned rows.

BEGIN;

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

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

-- The incremental pull filters by (user_id, last_updated); the old
-- (user_id, next_review_date) index served only the dropped due-ids RPC.
CREATE INDEX IF NOT EXISTS idx_user_card_progress_user_updated
    ON public.user_card_progress (user_id, last_updated);

CREATE OR REPLACE FUNCTION public.get_sync_state(p_since timestamptz DEFAULT NULL)
RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    WITH c AS (
        SELECT card_id, ease, "interval", repetitions, next_review_date, learning_step, last_updated
        FROM public.user_card_progress
        WHERE user_id = auth.uid()
          AND (p_since IS NULL OR last_updated >= p_since)
    ), l AS (
        SELECT card_id, created_at
        FROM public.user_learned_cards
        WHERE user_id = auth.uid()
          AND (p_since IS NULL OR created_at >= p_since)
    )
    SELECT jsonb_build_object(
        'cards', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM c), '[]'::jsonb),
        'learned', COALESCE((SELECT jsonb_agg(l.card_id) FROM l), '[]'::jsonb),
        'cursor', GREATEST((SELECT max(last_updated) FROM c), (SELECT max(created_at) FROM l)),
        'profile', (
            SELECT jsonb_build_object('updated_at', updated_at, 'settings', settings)
            FROM public.user_profiles
            WHERE id = auth.uid()
        ),
        'folders', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color) ORDER BY created_at, id)
            FROM public.user_folders
            WHERE user_id = auth.uid()
        ), '[]'::jsonb)
    );
$$;

ALTER FUNCTION public.get_sync_state(timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_sync_state(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sync_state(timestamptz) TO authenticated;

COMMIT;
