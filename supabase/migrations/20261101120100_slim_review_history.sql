-- Review history without card snapshots (expand; backward compatible).
--
-- Each review event carried `before` and `after`: full copies of the card's
-- scheduling state, about four fifths of every row. Nothing reads them (the
-- app uses id, card, quality, time, duration, source and the daily-session
-- fields; the card's current state lives in user_card_progress), and they made
-- every new device download every snapshot ever taken. On the free plan's
-- 500 MB database this was the fastest-growing data.
--
-- - append_review_events stores events without them, whatever the client sends
--   (older clients keep sending them; nothing breaks).
-- - get_sync_state returns events without them, which also shrinks pulls of
--   rows stored before this migration. Stored rows are not rewritten, and the
--   account export still returns them in full.

begin;

CREATE OR REPLACE FUNCTION public.append_review_events(p_events jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE e jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  IF jsonb_typeof(p_events) IS DISTINCT FROM 'array' OR jsonb_array_length(p_events) > 500 THEN
    RAISE EXCEPTION 'Expected at most 500 review events' USING ERRCODE = '22023';
  END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(p_events) LOOP
    IF NOT (e ?& ARRAY['id','cardId','sessionId','quality','source','durationMs','reviewedAt','scheduled'])
      OR jsonb_typeof(e->'id') <> 'string' OR jsonb_typeof(e->'cardId') <> 'string'
      OR jsonb_typeof(e->'sessionId') <> 'string'
      OR jsonb_typeof(e->'quality') <> 'number' OR jsonb_typeof(e->'durationMs') <> 'number'
      OR jsonb_typeof(e->'reviewedAt') <> 'number'
      OR (e->>'quality')::integer NOT BETWEEN 0 AND 5
      OR e->>'source' NOT IN ('flashcards','quiz','listening','writing','tones','daily','practice')
      OR jsonb_typeof(e->'scheduled') <> 'boolean'
      OR (e->>'durationMs')::numeric NOT BETWEEN 0 AND 300000
      OR (e->>'reviewedAt')::numeric <= 0 OR length(e->>'sessionId') > 200 THEN
      RAISE EXCEPTION 'Invalid review event' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.user_review_events(user_id, event_id, card_id, reviewed_at, payload)
    SELECT auth.uid(), (e->>'id')::uuid, e->>'cardId', to_timestamp((e->>'reviewedAt')::double precision / 1000),
      e - 'before' - 'after'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid()
      AND progress_reset_at >= to_timestamp((e->>'reviewedAt')::double precision / 1000)
    )
    ON CONFLICT (user_id, event_id) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sync_state(p_since timestamptz DEFAULT NULL)
RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
    AS $$
    WITH c AS (
        SELECT card_id, ease, "interval", repetitions, next_review_date, learning_step,
               last_updated, reviewed_at, learned_at, scheduler_state
        FROM public.user_card_progress
        WHERE user_id = auth.uid()
          AND (p_since IS NULL OR last_updated >= p_since)
    ), e AS (
        SELECT payload, created_at FROM public.user_review_events
        WHERE user_id = auth.uid() AND (p_since IS NULL OR created_at >= p_since)
    )
    SELECT jsonb_build_object(
        'cards', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM c), '[]'::jsonb),
        'review_events', COALESCE((SELECT jsonb_agg(payload - 'before' - 'after' ORDER BY created_at) FROM e), '[]'::jsonb),
        'cursor', GREATEST((SELECT max(last_updated) FROM c), (SELECT max(created_at) FROM e)),
        'profile', (
            SELECT jsonb_build_object(
                'updated_at', updated_at,
                'settings', settings,
                'progress_reset_at', progress_reset_at
            )
            FROM public.user_profiles
            WHERE id = auth.uid()
        ),
        'folders', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'color', f.color,
              'role', (select m.role from public.folder_members m where m.folder_id = f.id and m.user_id = auth.uid()),
              'ownerId', f.user_id, 'inviteCode', f.invite_code,
              'memberCount', (select count(*) from public.folder_members m where m.folder_id = f.id)) ORDER BY f.created_at, f.id)
            FROM public.user_folders f
            WHERE f.user_id = auth.uid() or f.id = any(private.my_folder_ids())
        ), '[]'::jsonb)
    );
$$;

commit;
