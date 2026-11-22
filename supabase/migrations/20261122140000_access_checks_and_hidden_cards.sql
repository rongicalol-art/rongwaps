-- Two tightenings (nothing dropped; the previous app version keeps working).
--
-- 1. upsert_card_progress and reset_user_learning_progress check access themselves. Until now they relied on the
--    request check that runs before every API call (a role setting); the other write functions already check inside.
--    Bodies are otherwise unchanged from 20261031120000. Reading, exporting and deleting your own data stay open
--    to an account that lost access, on purpose.
-- 2. "Let classmates find me" off also hides the saved profile card (owner decision, 2026-11-22): only the learner
--    and their friends (both added each other) can read it. Uploaded photos follow, since their storage rule reads
--    the card as the reader. Friends keep it so friend lists and private chats still show a name and face.
begin;

CREATE OR REPLACE FUNCTION public.upsert_card_progress(p_records jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
    IF NOT private.has_school_beta_access() THEN RAISE EXCEPTION 'School beta access required' USING ERRCODE = '42501'; END IF;
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

CREATE OR REPLACE FUNCTION public.reset_user_learning_progress() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
    IF NOT private.has_school_beta_access() THEN RAISE EXCEPTION 'School beta access required' USING ERRCODE = '42501'; END IF;
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
REVOKE EXECUTE ON FUNCTION public.reset_user_learning_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_user_learning_progress() TO authenticated;

-- Only ever about the caller and one other account, and it says nothing a friend doesn't already know.
create function private.card_hidden_from_me(p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_owner <> (select auth.uid())
    and exists (select 1 from public.usernames n where n.user_id = p_owner and not n.findable)
    and not (exists (select 1 from public.friend_adds f where f.adder = (select auth.uid()) and f.added = p_owner)
         and exists (select 1 from public.friend_adds f where f.adder = p_owner and f.added = (select auth.uid())));
$$;
revoke all on function private.card_hidden_from_me(uuid) from public, anon;
grant execute on function private.card_hidden_from_me(uuid) to authenticated;

create policy profile_cards_findable on public.profile_cards as restrictive for select to authenticated
  using (not private.card_hidden_from_me(user_id));

notify pgrst, 'reload schema';
commit;
