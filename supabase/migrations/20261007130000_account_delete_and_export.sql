-- Account deletion + data export (2026-10-07)
--
-- ADDITIVE: two new RPCs, no table or existing function changes.
--
-- delete_my_account(): removes the caller's auth user. Every user table
-- (user_profiles, user_folders, user_flashcards, user_card_progress,
-- user_learned_cards) references auth.users ON DELETE CASCADE (baseline +
-- 20261004 + 20260911), so one delete clears all of them; user_flashcards
-- also references user_folders ON DELETE SET NULL, which the cascade handles.
-- The client signs out afterwards (the JWT stays valid until it expires, but
-- the user it names no longer exists).
--
-- export_my_data(): everything the app stores about the caller, as one jsonb,
-- for the in-app "Download my data" (Data Privacy Act portability/access).

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_my_account() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
    AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'delete_my_account: not authenticated'
            USING ERRCODE = '28000';
    END IF;

    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

ALTER FUNCTION public.delete_my_account() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.export_my_data() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = ''
    AS $$
DECLARE
    uid uuid := auth.uid();
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'export_my_data: not authenticated'
            USING ERRCODE = '28000';
    END IF;

    RETURN jsonb_build_object(
        'exported_at', now(),
        'profile', (
            SELECT to_jsonb(p) FROM public.user_profiles p WHERE p.id = uid
        ),
        'folders', COALESCE((
            SELECT jsonb_agg(to_jsonb(f) ORDER BY f.created_at)
            FROM public.user_folders f WHERE f.user_id = uid
        ), '[]'::jsonb),
        'flashcards', COALESCE((
            SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at)
            FROM public.user_flashcards c WHERE c.user_id = uid
        ), '[]'::jsonb),
        'card_progress', COALESCE((
            SELECT jsonb_agg(to_jsonb(g) ORDER BY g.card_id)
            FROM public.user_card_progress g WHERE g.user_id = uid
        ), '[]'::jsonb),
        'learned_cards', COALESCE((
            SELECT jsonb_agg(to_jsonb(l) ORDER BY l.card_id)
            FROM public.user_learned_cards l WHERE l.user_id = uid
        ), '[]'::jsonb)
    );
END;
$$;

ALTER FUNCTION public.export_my_data() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

COMMIT;
