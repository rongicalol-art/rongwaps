-- Production safety (audit P0-3, P0-7). Additive and backward compatible.

-- 1. Anonymous uploads to the public audio bucket. The policy was created in
--    the dashboard, never in a migration; the app only reads this bucket and
--    publishing uses a server credential.
DROP POLICY IF EXISTS "Public insert for TTS cache" ON storage.objects;

-- 2. Card progress is written through upsert_card_progress only (SECURITY
--    DEFINER). Direct writes skipped its clamps and the reset epoch. Reads stay
--    RLS-scoped. user_review_events keeps INSERT: append_review_events runs as
--    the caller, and its RLS policy already pins rows to the owner.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_card_progress FROM anon, authenticated;

-- 3. A save that was in flight during a reset must not bring old cards back:
--    same reset boundary append_review_events already enforces.
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
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_profiles pr
        WHERE pr.id = auth.uid()
          AND pr.progress_reset_at >= COALESCE(p.reviewed_at, p.learned_at)
    )
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
REVOKE EXECUTE ON FUNCTION public.upsert_card_progress(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_card_progress(jsonb) TO authenticated;

-- 4. A reset also clears grammar completion, which syncs inside
--    user_profiles.settings, so no device can merge it back after the reset.
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
            settings = public.user_profiles.settings - 'grammarProgress',
            updated_at = EXCLUDED.updated_at;
END;
$$;
