-- Privilege hardening, abuse limits, last-write-wins card sync, durable reset
-- (2026-10-07)
--
-- ADDITIVE and idempotent: safe on a database that already holds real user
-- rows, and safe to apply while the previous client build is still deployed
-- (every RPC keeps its signature and tolerates payloads from older clients).
--
-- A. Privileges
--    - anon loses every grant on the user tables (user_learned_cards was
--      created after the baseline's default privileges and never revoked) and
--      stops inheriting grants on future tables/functions.
--    - authenticated loses TRUNCATE / REFERENCES / TRIGGER on user tables.
--    - handle_new_user() is a trigger function; nobody calls it directly.
--    - FOR ALL policies get an explicit WITH CHECK.
-- B. Abuse limits (CHECK constraints are NOT VALID: enforced for new writes,
--    existing rows are not scanned or rejected).
-- C. Last-write-wins by review time: user_card_progress.reviewed_at carries
--    the client's review time; upsert_card_progress only overwrites a row when
--    the incoming review is not older than the stored one.
-- D. Reset that sticks: user_profiles.progress_reset_at is a reset epoch that
--    every device compares against before pushing or merging progress.
-- E. Settings clock skew: user_profiles.updated_at is stamped by the server.

BEGIN;

-- ---------------------------------------------------------------------------
-- A. Privileges
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE
    public.user_profiles,
    public.user_folders,
    public.user_flashcards,
    public.user_card_progress,
    public.user_learned_cards
FROM anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
    public.user_profiles,
    public.user_folders,
    public.user_flashcards,
    public.user_card_progress,
    public.user_learned_cards
FROM authenticated;

-- Future tables / functions created by postgres in public no longer hand anon
-- everything (the baseline granted ALL on tables and functions to anon).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- Trigger function: firing a trigger does not check EXECUTE, so removing the
-- grants cannot break signup, and stops it being callable over the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can manage their own card progress" ON public.user_card_progress;
CREATE POLICY "Users can manage their own card progress"
ON public.user_card_progress FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own learned cards" ON public.user_learned_cards;
CREATE POLICY "Users can manage their own learned cards"
ON public.user_learned_cards FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- New columns (C, D)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_card_progress
    ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Rows written before this migration only know when they were saved.
UPDATE public.user_card_progress
SET reviewed_at = last_updated
WHERE reviewed_at IS NULL;

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS progress_reset_at timestamptz;

-- ---------------------------------------------------------------------------
-- B. Abuse limits (NOT VALID: new writes only)
-- ---------------------------------------------------------------------------
-- Real card ids are short (B4L01-1-01, word_<text>, custom-<uuid>); 128 is far
-- above any of them.
ALTER TABLE public.user_card_progress
    DROP CONSTRAINT IF EXISTS user_card_progress_card_id_len,
    DROP CONSTRAINT IF EXISTS user_card_progress_srs_ranges,
    ADD CONSTRAINT user_card_progress_card_id_len
        CHECK (char_length(card_id) BETWEEN 1 AND 128) NOT VALID,
    ADD CONSTRAINT user_card_progress_srs_ranges
        CHECK (
            ease BETWEEN 1 AND 10
            AND "interval" BETWEEN 0 AND 36500
            AND repetitions BETWEEN 0 AND 100000
            AND (learning_step IS NULL OR learning_step BETWEEN 0 AND 100)
        ) NOT VALID;

ALTER TABLE public.user_learned_cards
    DROP CONSTRAINT IF EXISTS user_learned_cards_card_id_len,
    ADD CONSTRAINT user_learned_cards_card_id_len
        CHECK (char_length(card_id) BETWEEN 1 AND 128) NOT VALID;

-- Synced preferences are favorites + selections; 256 KiB is orders of
-- magnitude above a real profile but bounds a hostile row.
ALTER TABLE public.user_profiles
    DROP CONSTRAINT IF EXISTS user_profiles_settings_size,
    ADD CONSTRAINT user_profiles_settings_size
        CHECK (pg_column_size(settings) < 262144) NOT VALID;

ALTER TABLE public.user_flashcards
    DROP CONSTRAINT IF EXISTS user_flashcards_text_len,
    ADD CONSTRAINT user_flashcards_text_len
        CHECK (
            char_length(simplified) <= 2000
            AND char_length(traditional) <= 2000
            AND char_length(pinyin) <= 2000
            AND char_length(translation) <= 2000
            AND char_length(notes) <= 2000
            AND cardinality(measure_words) <= 100
        ) NOT VALID;

ALTER TABLE public.user_folders
    DROP CONSTRAINT IF EXISTS user_folders_text_len,
    ADD CONSTRAINT user_folders_text_len
        CHECK (char_length(name) <= 200 AND char_length(color) <= 64) NOT VALID;

-- Per-user cap on custom cards.
CREATE OR REPLACE FUNCTION public.enforce_user_flashcard_cap() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF (SELECT count(*) FROM public.user_flashcards WHERE user_id = NEW.user_id) >= 5000 THEN
        RAISE EXCEPTION 'user_flashcards: limit of 5000 cards per user reached'
            USING ERRCODE = '54000';
    END IF;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_user_flashcard_cap() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.enforce_user_flashcard_cap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_flashcards_cap ON public.user_flashcards;
CREATE TRIGGER user_flashcards_cap
    BEFORE INSERT ON public.user_flashcards
    FOR EACH ROW EXECUTE FUNCTION public.enforce_user_flashcard_cap();

-- ---------------------------------------------------------------------------
-- C. upsert_card_progress: last write wins by review time
-- ---------------------------------------------------------------------------
-- Same signature. Per record: reviewed_at is the client's review time (older
-- clients omit it and get now(), i.e. the previous "last flush wins"
-- behaviour). A row is only overwritten when the incoming review is not older
-- than the stored one, so a stale device flushing late cannot undo newer
-- progress. last_updated stays now(): it is the incremental-pull cursor.
-- Numeric fields are clamped to the CHECK ranges so one odd client value can
-- never fail the whole batch; reviewed_at is capped a few minutes into the
-- future so a wrong clock cannot win every later conflict.
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

    INSERT INTO public.user_card_progress (
        user_id, card_id, ease, "interval", repetitions, next_review_date,
        learning_step, reviewed_at, last_updated
    )
    SELECT
        auth.uid(),
        p.card_id,
        CASE WHEN p.ease IS NULL THEN NULL ELSE LEAST(10, GREATEST(1, p.ease)) END,
        CASE WHEN p.ivl IS NULL THEN NULL ELSE LEAST(36500, GREATEST(0, p.ivl)) END,
        CASE WHEN p.reps IS NULL THEN NULL ELSE LEAST(100000, GREATEST(0, p.reps)) END,
        p.next_review_date,
        CASE WHEN p.step IS NULL THEN NULL ELSE LEAST(100, GREATEST(0, p.step)) END,
        LEAST(COALESCE(p.reviewed_at, now()), now() + interval '5 minutes'),
        now()
    FROM (
        SELECT
            (rec->>'card_id')::text AS card_id,
            (rec->>'ease')::numeric AS ease,
            (rec->>'interval')::integer AS ivl,
            (rec->>'repetitions')::integer AS reps,
            (rec->>'next_review_date')::timestamptz AS next_review_date,
            (rec->>'learning_step')::integer AS step,
            (rec->>'reviewed_at')::timestamptz AS reviewed_at
        FROM jsonb_array_elements(p_records) AS rec
    ) p
    ON CONFLICT (user_id, card_id)
    DO UPDATE SET
        ease = EXCLUDED.ease,
        "interval" = EXCLUDED."interval",
        repetitions = EXCLUDED.repetitions,
        next_review_date = EXCLUDED.next_review_date,
        learning_step = EXCLUDED.learning_step,
        reviewed_at = EXCLUDED.reviewed_at,
        last_updated = EXCLUDED.last_updated
    WHERE user_card_progress.reviewed_at IS NULL
       OR EXCLUDED.reviewed_at >= user_card_progress.reviewed_at;
END;
$$;

ALTER FUNCTION public.upsert_card_progress(jsonb) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.upsert_card_progress(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_card_progress(jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- B (cont.). Learned-card RPCs: bounded input
-- ---------------------------------------------------------------------------
-- append is chunked at 500 by the client. replace carries the whole learned
-- set (it cannot be chunked without changing its meaning), so its bound is the
-- abuse ceiling, not the client batch size.
CREATE OR REPLACE FUNCTION public.append_learned_cards(p_cards text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF cardinality(p_cards) > 500 THEN
        RAISE EXCEPTION 'append_learned_cards: at most 500 cards per call'
            USING ERRCODE = '54000';
    END IF;

    INSERT INTO public.user_learned_cards (user_id, card_id)
    SELECT auth.uid(), c
    FROM unnest(p_cards) AS c
    ON CONFLICT (user_id, card_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_learned_cards(p_cards text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF cardinality(p_cards) > 20000 THEN
        RAISE EXCEPTION 'replace_learned_cards: at most 20000 cards per call'
            USING ERRCODE = '54000';
    END IF;

    DELETE FROM public.user_learned_cards
    WHERE user_id = auth.uid()
      AND card_id <> ALL (p_cards);

    INSERT INTO public.user_learned_cards (user_id, card_id)
    SELECT auth.uid(), c
    FROM unnest(p_cards) AS c
    ON CONFLICT (user_id, card_id) DO NOTHING;
END;
$$;

ALTER FUNCTION public.append_learned_cards(text[]) OWNER TO postgres;
ALTER FUNCTION public.replace_learned_cards(text[]) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.append_learned_cards(text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.replace_learned_cards(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_learned_cards(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_learned_cards(text[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- D. Reset epoch
-- ---------------------------------------------------------------------------
-- Deletions do not propagate through the incremental pull, so another device
-- would otherwise re-upload its local progress after a reset. The reset stamps
-- user_profiles.progress_reset_at; devices compare it with the last epoch they
-- applied and wipe local progress before merging. get_sync_state returns it.
-- Same signature (void): the resetting device reads the epoch back through
-- get_sync_state.
CREATE OR REPLACE FUNCTION public.reset_user_learning_progress() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    DELETE FROM public.user_card_progress WHERE user_id = auth.uid();
    DELETE FROM public.user_learned_cards WHERE user_id = auth.uid();

    INSERT INTO public.user_profiles (id, progress_reset_at, updated_at)
    VALUES (auth.uid(), now(), now())
    ON CONFLICT (id) DO UPDATE
        SET progress_reset_at = EXCLUDED.progress_reset_at,
            updated_at = EXCLUDED.updated_at;
END;
$$;

ALTER FUNCTION public.reset_user_learning_progress() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.reset_user_learning_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_user_learning_progress() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- get_sync_state: + reviewed_at per card, + progress_reset_at on the profile
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sync_state(p_since timestamptz DEFAULT NULL)
RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    WITH c AS (
        SELECT card_id, ease, "interval", repetitions, next_review_date, learning_step,
               last_updated, reviewed_at
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

ALTER FUNCTION public.get_sync_state(timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_sync_state(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sync_state(timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- E. Server-stamped profile updated_at
-- ---------------------------------------------------------------------------
-- The pull compares updated_at with the device's last sync to decide whether
-- cloud settings are newer; a client-supplied timestamp made that depend on
-- every device's clock.
CREATE OR REPLACE FUNCTION public.touch_user_profile_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.touch_user_profile_updated_at() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.touch_user_profile_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_profiles_touch_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_touch_updated_at
    BEFORE INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.touch_user_profile_updated_at();

COMMIT;
