-- Simplify user-data sync (2026-10-07)
--
-- 1. Learned cards become a column: user_card_progress.learned_at replaces the
--    user_learned_cards table and its append/replace RPCs. The flag rides in
--    upsert_card_progress records and is monotonic (only a reset deletes it).
-- 2. user_profiles stops copying email / full_name / avatar_url from auth.
--
-- NOT compatible with the previous client (it calls the dropped RPCs and reads
-- get_sync_state().learned): ship this migration and the matching client
-- together. Every learned card is folded into learned_at; the migration aborts
-- (rolling back) if any would be left without it.

BEGIN;

-- 1. learned_at
ALTER TABLE public.user_card_progress
    ADD COLUMN IF NOT EXISTS learned_at timestamptz;

-- The SRS CHECK from 20261007120000 is NOT VALID, but Postgres re-checks it on
-- every UPDATE of a row; production holds a row that predates it (interval
-- far above 36500), so the touched rows are clamped to the same ranges.
UPDATE public.user_card_progress p
SET learned_at = l.created_at,
    ease = LEAST(10, GREATEST(1, p.ease)),
    "interval" = LEAST(36500, GREATEST(0, p."interval")),
    repetitions = LEAST(100000, GREATEST(0, p.repetitions)),
    learning_step = LEAST(100, GREATEST(0, p.learning_step))
FROM public.user_learned_cards l
WHERE p.user_id = l.user_id
  AND p.card_id = l.card_id
  AND p.learned_at IS NULL;

-- Learned cards without progress become placeholder rows (no next_review_date,
-- no reviewed_at): the client reads them as learned, never due; any real
-- review overwrites them.
INSERT INTO public.user_card_progress (user_id, card_id, learned_at, last_updated)
SELECT l.user_id, l.card_id, l.created_at, now()
FROM public.user_learned_cards l
ON CONFLICT (user_id, card_id) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.user_learned_cards l
        LEFT JOIN public.user_card_progress p
          ON p.user_id = l.user_id AND p.card_id = l.card_id
        WHERE p.learned_at IS NULL
    ) THEN
        RAISE EXCEPTION 'simplify_user_sync: learned cards left without learned_at; aborting';
    END IF;
END $$;

-- upsert_card_progress: SRS fields are last-write-wins by reviewed_at (rule
-- from 20261007120000); learned_at merges separately (earliest wins, never
-- cleared), so a learned flag persists with an unchanged or older review.
-- Same signature, so owner and grants carry over (as for every function below).
CREATE OR REPLACE FUNCTION public.upsert_card_progress(p_records jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
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
        learning_step, reviewed_at, learned_at, last_updated
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
        now()
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
            (rec->>'learned_at')::timestamptz AS learned_at
        FROM jsonb_array_elements(p_records) AS rec
    ) p
    ON CONFLICT (user_id, card_id)
    DO UPDATE SET
        ease = CASE WHEN t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at
                    THEN EXCLUDED.ease ELSE t.ease END,
        "interval" = CASE WHEN t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at
                    THEN EXCLUDED."interval" ELSE t."interval" END,
        repetitions = CASE WHEN t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at
                    THEN EXCLUDED.repetitions ELSE t.repetitions END,
        next_review_date = CASE WHEN t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at
                    THEN EXCLUDED.next_review_date ELSE t.next_review_date END,
        learning_step = CASE WHEN t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at
                    THEN EXCLUDED.learning_step ELSE t.learning_step END,
        reviewed_at = CASE WHEN t.reviewed_at IS NULL OR EXCLUDED.reviewed_at >= t.reviewed_at
                    THEN EXCLUDED.reviewed_at ELSE t.reviewed_at END,
        learned_at = COALESCE(t.learned_at, EXCLUDED.learned_at),
        last_updated = EXCLUDED.last_updated
    WHERE t.reviewed_at IS NULL
       OR EXCLUDED.reviewed_at >= t.reviewed_at
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
               last_updated, reviewed_at, learned_at
        FROM public.user_card_progress
        WHERE user_id = auth.uid()
          AND (p_since IS NULL OR last_updated >= p_since)
    )
    SELECT jsonb_build_object(
        'cards', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM c), '[]'::jsonb),
        'cursor', (SELECT max(last_updated) FROM c),
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
        'card_progress', COALESCE((
            SELECT jsonb_agg(to_jsonb(g) ORDER BY g.card_id)
            FROM public.user_card_progress g WHERE g.user_id = uid
        ), '[]'::jsonb)
    );
END;
$$;


-- Drop the learned-cards table and its RPCs
DROP FUNCTION IF EXISTS public.append_learned_cards(text[]);
DROP FUNCTION IF EXISTS public.replace_learned_cards(text[]);
DROP TABLE IF EXISTS public.user_learned_cards;

-- 2. user_profiles stops duplicating auth PII
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER TABLE public.user_profiles
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS full_name,
    DROP COLUMN IF EXISTS avatar_url;

COMMIT;
