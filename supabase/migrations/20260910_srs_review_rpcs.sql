-- Review-session RPCs.
--
-- 1. get_due_card_ids: due-card ids straight from user_card_progress, so a
--    review session reflects reviews made on other devices without waiting
--    for the client's incremental pull. Ordered most-overdue first for
--    stable prioritization; the client applies its own smart cap/ordering
--    (src/utils/reviewSession.ts) on top of this set.
--
-- 2. append_learned_cards: append-only learned-card sync. The client used to
--    rewrite the whole learned_cards array on every first pass, which grew
--    with the learner's lifetime vocabulary. This RPC appends only the new
--    ids server-side (order-preserving, deduplicated); full-array replaces
--    stay on the existing metadata write path.

CREATE OR REPLACE FUNCTION "public"."get_due_card_ids"() RETURNS TABLE ("card_id" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT card_id
    FROM public.user_card_progress
    WHERE user_id = auth.uid()
      AND next_review_date <= now()
    ORDER BY next_review_date ASC, card_id ASC;
$$;

ALTER FUNCTION "public"."get_due_card_ids"() OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_due_card_ids"() TO "authenticated";


CREATE OR REPLACE FUNCTION "public"."append_learned_cards"("p_cards" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    existing text[];
    merged text[];
BEGIN
    SELECT learned_cards INTO existing
    FROM public.user_profiles
    WHERE id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.user_profiles (id, learned_cards, updated_at)
        VALUES (auth.uid(), p_cards, now());
        RETURN;
    END IF;

    -- Order-preserving union: first occurrence wins, so ids already stored
    -- (from this or another device) keep their position and new ids append.
    SELECT array_agg(c ORDER BY first_ord) INTO merged
    FROM (
        SELECT c, min(ord) AS first_ord
        FROM unnest(COALESCE(existing, '{}'::text[]) || p_cards) WITH ORDINALITY AS t(c, ord)
        GROUP BY c
    ) deduped;

    UPDATE public.user_profiles
    SET learned_cards = merged, updated_at = now()
    WHERE id = auth.uid();
END;
$$;

ALTER FUNCTION "public"."append_learned_cards"("p_cards" "text"[]) OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."append_learned_cards"("p_cards" "text"[]) TO "authenticated";
