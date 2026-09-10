-- Learned-card storage: dedicated per-card table.
--
-- user_profiles.learned_cards (text[]) was a single ever-growing array cell:
-- every first pass rewrote the whole row and every pull shipped the whole
-- array. The new table stores one row per learned card with an added_at
-- timestamp, giving bounded writes, native dedupe, and a path to incremental
-- learned pulls.
--
-- Transition contract: the table is the source of truth; the legacy
-- user_profiles.learned_cards array keeps being updated (append RPC and full
-- replace) so clients running the previous build keep working until they
-- upgrade. A later migration can drop the legacy column.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Table + backfill from the legacy array
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_learned_cards (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, card_id)
);

ALTER TABLE public.user_learned_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own learned cards" ON public.user_learned_cards;
CREATE POLICY "Users can manage their own learned cards"
ON public.user_learned_cards FOR ALL
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_learned_cards_created
    ON public.user_learned_cards (user_id, created_at);

INSERT INTO public.user_learned_cards (user_id, card_id, created_at)
SELECT p.id, c.card, COALESCE(p.updated_at, now())
FROM public.user_profiles p
CROSS JOIN LATERAL unnest(p.learned_cards) AS c(card)
ON CONFLICT (user_id, card_id) DO NOTHING;

GRANT SELECT ON public.user_learned_cards TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. append_learned_cards: also insert table rows (array append kept for
--    legacy clients reading user_profiles.learned_cards)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."append_learned_cards"("p_cards" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    existing text[];
    merged text[];
BEGIN
    -- Table rows: native dedupe via the primary key.
    INSERT INTO public.user_learned_cards (user_id, card_id)
    SELECT auth.uid(), c
    FROM unnest(p_cards) AS c
    ON CONFLICT (user_id, card_id) DO NOTHING;

    -- Legacy array kept in sync for pre-upgrade clients.
    SELECT learned_cards INTO existing
    FROM public.user_profiles
    WHERE id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.user_profiles (id, learned_cards, updated_at)
        VALUES (auth.uid(), p_cards, now());
        RETURN;
    END IF;

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

-- ---------------------------------------------------------------------------
-- 3. replace_learned_cards: full replace of BOTH stores (first sync, reset
--    shrink, RPC fallback on the client).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."replace_learned_cards"("p_cards" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    DELETE FROM public.user_learned_cards
    WHERE user_id = auth.uid();

    INSERT INTO public.user_learned_cards (user_id, card_id)
    SELECT auth.uid(), c
    FROM unnest(p_cards) AS c
    ON CONFLICT (user_id, card_id) DO NOTHING;

    INSERT INTO public.user_profiles (id, learned_cards, updated_at)
    VALUES (auth.uid(), p_cards, now())
    ON CONFLICT (id) DO UPDATE SET
        learned_cards = p_cards,
        updated_at = now();
END;
$$;

ALTER FUNCTION "public"."replace_learned_cards"("p_cards" "text"[]) OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."replace_learned_cards"("p_cards" "text"[]) TO "authenticated";

-- ---------------------------------------------------------------------------
-- 4. Progress reset clears the table too
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."reset_user_learning_progress"()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_card_progress
  WHERE user_id = auth.uid();

  DELETE FROM public.user_learned_cards
  WHERE user_id = auth.uid();

  UPDATE public.user_profiles
  SET learned_cards = '{}',
      updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

ALTER FUNCTION "public"."reset_user_learning_progress"() OWNER TO "postgres";

COMMIT;
