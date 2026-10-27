begin;

-- Authorship must not retain access to live shared content after membership ends.
drop policy user_flashcards_select_member on public.user_flashcards;
create policy user_flashcards_select_member on public.user_flashcards for select to authenticated
  using ((folder_id is null and user_id = (select auth.uid())) or folder_id in (select unnest(private.my_folder_ids())));

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
              AND (c.folder_id IS NULL OR c.folder_id = ANY(private.my_folder_ids()))
        ), '[]'::jsonb),
        'review_events', COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM public.user_review_events WHERE user_id = uid), '[]'::jsonb),
        'card_progress', COALESCE((
            SELECT jsonb_agg(to_jsonb(g) ORDER BY g.card_id)
            FROM public.user_card_progress g WHERE g.user_id = uid
        ), '[]'::jsonb)
    );
END;
$$;

notify pgrst, 'reload schema';
commit;
