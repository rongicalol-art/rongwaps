-- Additive FSRS state and immutable, idempotent review history.
-- Legacy scheduling stays readable; an old client cannot overwrite FSRS state.
BEGIN;
ALTER TABLE public.user_card_progress ADD COLUMN scheduler_state jsonb;
ALTER TABLE public.user_card_progress ADD CONSTRAINT scheduler_state_shape CHECK (
  scheduler_state IS NULL OR (
    jsonb_typeof(scheduler_state) = 'object'
    AND scheduler_state ?& ARRAY['version','state','stability','difficulty','reps','lapses','learningSteps','scheduledDays','elapsedDays']
    AND scheduler_state->>'version' = '1'
    AND (scheduler_state->>'state')::integer BETWEEN 0 AND 3
    AND (scheduler_state->>'stability')::numeric BETWEEN 0 AND 365000
    AND (scheduler_state->>'difficulty')::numeric BETWEEN 0 AND 10
  )
);
CREATE TABLE public.user_review_events (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  card_id text NOT NULL CHECK (length(card_id) BETWEEN 1 AND 500),
  reviewed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 32768),
  PRIMARY KEY (user_id, event_id)
);
CREATE INDEX user_review_events_sync_idx ON public.user_review_events (user_id, created_at);
ALTER TABLE public.user_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_review_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.user_review_events TO authenticated;
GRANT ALL ON public.user_review_events TO service_role;
CREATE POLICY own_review_history_read ON public.user_review_events FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY own_review_history_insert ON public.user_review_events FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY school_beta_access ON public.user_review_events AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT private.has_school_beta_access())) WITH CHECK ((SELECT private.has_school_beta_access()));

CREATE FUNCTION public.append_review_events(p_events jsonb) RETURNS void
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
    SELECT auth.uid(), (e->>'id')::uuid, e->>'cardId', to_timestamp((e->>'reviewedAt')::double precision / 1000), e
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid()
      AND progress_reset_at >= to_timestamp((e->>'reviewedAt')::double precision / 1000)
    )
    ON CONFLICT (user_id, event_id) DO NOTHING;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.append_review_events(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_review_events(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_card_progress(p_records jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
    IF p_records IS NULL THEN
        RETURN;
    END IF;
    IF jsonb_typeof(p_records) <> 'array' THEN
        RAISE EXCEPTION 'upsert_card_progress: p_records must be a JSON array'
            USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_records) > 500 THEN
        RAISE EXCEPTION 'upsert_card_progress: at most 500 records per call'
            USING ERRCODE = '54000';
    END IF;

    INSERT INTO public.user_card_progress AS t (
        user_id, card_id, ease, "interval", repetitions, next_review_date,
        learning_step, reviewed_at, learned_at, last_updated, scheduler_state
    )
    SELECT
        auth.uid(),
        p.card_id,
        LEAST(10, GREATEST(1, COALESCE(p.ease, 2.5))),
        LEAST(36500, GREATEST(0, COALESCE(p.ivl, 0))),
        LEAST(100000, GREATEST(0, COALESCE(p.reps, 0))),
        p.next_review_date,
        CASE WHEN p.step IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, p.step)) END,
        -- Capped a few minutes ahead so a wrong clock cannot win every later
        -- conflict (LEAST ignores NULLs, hence the CASEs: an absent time stays
        -- absent).
        CASE WHEN p.reviewed_at IS NULL THEN NULL
             ELSE LEAST(p.reviewed_at, now() + interval '5 minutes') END,
        CASE WHEN p.learned_at IS NULL THEN NULL
             ELSE LEAST(p.learned_at, now() + interval '5 minutes') END,
        now(),
        p.scheduler_state
    FROM (
        SELECT
            (rec->>'card_id')::text AS card_id,
            (rec->>'ease')::numeric AS ease,
            (rec->>'interval')::integer AS ivl,
            (rec->>'repetitions')::integer AS reps,
            (rec->>'next_review_date')::timestamptz AS next_review_date,
            (rec->>'learning_step')::integer AS step,
            -- Records with SRS state but no review time (older clients) count
            -- as reviewed now; a record without SRS state stays unreviewed.
            COALESCE(
                (rec->>'reviewed_at')::timestamptz,
                CASE WHEN rec->>'next_review_date' IS NOT NULL THEN now() END
            ) AS reviewed_at,
            (rec->>'learned_at')::timestamptz AS learned_at,
            NULLIF(rec->'scheduler_state', 'null'::jsonb) AS scheduler_state
        FROM jsonb_array_elements(p_records) AS rec
    ) p
    ON CONFLICT (user_id, card_id)
    DO UPDATE SET
        ease = CASE WHEN (t.scheduler_state IS NULL OR EXCLUDED.scheduler_state IS NOT NULL) AND (t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at)
                    THEN EXCLUDED.ease ELSE t.ease END,
        "interval" = CASE WHEN (t.scheduler_state IS NULL OR EXCLUDED.scheduler_state IS NOT NULL) AND (t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at)
                    THEN EXCLUDED."interval" ELSE t."interval" END,
        repetitions = CASE WHEN (t.scheduler_state IS NULL OR EXCLUDED.scheduler_state IS NOT NULL) AND (t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at)
                    THEN EXCLUDED.repetitions ELSE t.repetitions END,
        next_review_date = CASE WHEN (t.scheduler_state IS NULL OR EXCLUDED.scheduler_state IS NOT NULL) AND (t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at)
                    THEN EXCLUDED.next_review_date ELSE t.next_review_date END,
        learning_step = CASE WHEN (t.scheduler_state IS NULL OR EXCLUDED.scheduler_state IS NOT NULL) AND (t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at)
                    THEN EXCLUDED.learning_step ELSE t.learning_step END,
        reviewed_at = CASE WHEN (t.scheduler_state IS NULL OR EXCLUDED.scheduler_state IS NOT NULL) AND (t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at)
                    THEN EXCLUDED.reviewed_at ELSE t.reviewed_at END,
        scheduler_state = CASE WHEN (t.scheduler_state IS NULL OR EXCLUDED.scheduler_state IS NOT NULL)
                    AND (t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at)
                    THEN EXCLUDED.scheduler_state ELSE t.scheduler_state END,
        learned_at = COALESCE(t.learned_at, EXCLUDED.learned_at),
        last_updated = EXCLUDED.last_updated
    WHERE ((t.scheduler_state IS NULL OR EXCLUDED.scheduler_state IS NOT NULL)
           AND (t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at))
       OR (EXCLUDED.learned_at IS NOT NULL AND t.learned_at IS NULL);
END;
$$;


-- get_sync_state: learned_at rides on each card; no separate learned list
CREATE OR REPLACE FUNCTION public.get_sync_state(p_since timestamptz DEFAULT NULL)
RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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
        'review_events', COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM e), '[]'::jsonb),
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
            SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color) ORDER BY created_at, id)
            FROM public.user_folders
            WHERE user_id = auth.uid()
        ), '[]'::jsonb)
    );
$$;


-- reset_user_learning_progress: learned flags die with the rows
CREATE OR REPLACE FUNCTION public.reset_user_learning_progress() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
    DELETE FROM public.user_review_events WHERE user_id = auth.uid();
    DELETE FROM public.user_card_progress WHERE user_id = auth.uid();

    INSERT INTO public.user_profiles (id, progress_reset_at, updated_at)
    VALUES (auth.uid(), now(), now())
    ON CONFLICT (id) DO UPDATE
        SET progress_reset_at = EXCLUDED.progress_reset_at,
            updated_at = EXCLUDED.updated_at;
END;
$$;


-- export_my_data: card_progress rows carry learned_at
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
        'review_events', COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM public.user_review_events WHERE user_id = uid), '[]'::jsonb),
        'card_progress', COALESCE((
            SELECT jsonb_agg(to_jsonb(g) ORDER BY g.card_id)
            FROM public.user_card_progress g WHERE g.user_id = uid
        ), '[]'::jsonb)
    );
END;
$$;



COMMIT;
