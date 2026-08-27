-- RongWaps performance + dead-weight pass (2026-08-27, part 2)
--
-- 1. btree indexes on dictionary text columns: exact/batch lookups currently
--    seq-scan 122k rows (~270-310 ms); with these they hit the latency floor.
-- 2. trgm GIN on character_breakdowns_v2.decomposition: the breakdown "used
--    in" query is LIKE '%component%' over 9.5k rows (~230-260 ms).
-- 3. Rewritten search_dictionary: single-character hanzi searches previously
--    scanned every row containing the char (2 s cold spike); now tiered
--    exact -> prefix -> capped substring.
-- 4. Drop mnemonic_generation_queue: no writers or workers exist anywhere in
--    the codebase; mnemonics are a read-only cache now.
-- 5. Drop dead user_profiles columns from the removed personal-vocabulary
--    feature (personal_vocabulary/personal_vocab_folders were dropped in the
--    previous cleanup migration).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Dictionary exact/prefix lookup indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dict_simplified
  ON public.dictionary USING btree (simplified);

CREATE INDEX IF NOT EXISTS idx_dict_traditional
  ON public.dictionary USING btree (traditional);

-- ---------------------------------------------------------------------------
-- 2. Breakdown "used in" (component) search index
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_breakdowns_decomposition_trgm
  ON public.character_breakdowns_v2 USING gin (decomposition public.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 3. search_dictionary rewrite: tiered matching for hanzi queries
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_dictionary(search_query text, result_limit integer DEFAULT 50)
RETURNS TABLE(id integer, traditional text, simplified text, pinyin_accented text, definitions jsonb, match_type text, total_score double precision)
LANGUAGE plpgsql
AS $fn$
DECLARE
    is_hanzi BOOLEAN;
    is_ascii BOOLEAN;
    q_tsquery tsquery;
    query_flat TEXT;
BEGIN
    -- 1. Input Detection
    is_hanzi := search_query ~ '[\u4e00-\u9fa5]';
    is_ascii := search_query ~ '^[A-Za-z0-9\s''''-]+$';

    -- Normalize Pinyin search (lowercase, strip spaces and apostrophes for flat match)
    query_flat := replace(replace(lower(search_query), ' ', ''), '''', '');

    -- Build Full-Text query for English
    q_tsquery := plainto_tsquery('english', search_query);

    IF is_hanzi THEN
        -- 2a. HANZI: tiered matching so single-character queries never scan
        --     the whole table. Each tier is bounded before scoring:
        --     exact (1.0) -> prefix (0.8) -> substring (0.5, capped at 800).
        RETURN QUERY
        WITH matches AS (
            SELECT * FROM (
                SELECT d.id, d.traditional, d.simplified, d.pinyin_accented,
                       d.definitions, d.frequency_score, d.curriculum_level,
                       d.is_book_vocab, 1.0::double precision AS m_weight
                FROM dictionary d
                WHERE d.traditional = search_query OR d.simplified = search_query
                LIMIT result_limit
            ) tier_exact
            UNION ALL
            SELECT * FROM (
                SELECT d.id, d.traditional, d.simplified, d.pinyin_accented,
                       d.definitions, d.frequency_score, d.curriculum_level,
                       d.is_book_vocab, 0.8::double precision AS m_weight
                FROM dictionary d
                WHERE (d.traditional LIKE search_query || '%' OR d.simplified LIKE search_query || '%')
                  AND d.traditional <> search_query AND d.simplified <> search_query
                LIMIT 200
            ) tier_prefix
            UNION ALL
            SELECT * FROM (
                SELECT d.id, d.traditional, d.simplified, d.pinyin_accented,
                       d.definitions, d.frequency_score, d.curriculum_level,
                       d.is_book_vocab, 0.5::double precision AS m_weight
                FROM dictionary d
                WHERE (d.traditional LIKE '%' || search_query || '%' OR d.simplified LIKE '%' || search_query || '%')
                  AND d.traditional NOT LIKE search_query || '%'
                  AND d.simplified NOT LIKE search_query || '%'
                LIMIT 800
            ) tier_substring
        )
        SELECT
            m.id, m.traditional, m.simplified, m.pinyin_accented, m.definitions,
            CASE
                WHEN m.m_weight >= 1.0 THEN 'exact'
                WHEN m.m_weight >= 0.8 THEN 'prefix'
                ELSE 'partial'
            END AS match_type,
            (m.m_weight * 100.0) +
            COALESCE(m.frequency_score, 0.0) -
            (m.curriculum_level * 10.0) +
            (CASE WHEN m.is_book_vocab THEN 50.0 ELSE 0.0 END) AS total_score
        FROM matches m
        ORDER BY total_score DESC, char_length(m.traditional) ASC
        LIMIT result_limit;
    ELSE
        -- 2b. ASCII (PINYIN OR ENGLISH): unchanged scored matching
        RETURN QUERY
        WITH matches AS (
            SELECT
                d.id, d.traditional, d.simplified, d.pinyin_accented,
                d.definitions, d.frequency_score, d.curriculum_level,
                d.is_book_vocab,
                GREATEST(
                    CASE WHEN d.pinyin_flat = query_flat THEN 1.0
                         WHEN d.pinyin_flat LIKE query_flat || '%' THEN 0.8
                         ELSE 0.0 END,
                    CASE WHEN d.definitions @> to_jsonb(lower(search_query)) THEN 0.9
                         WHEN d.definitions @> ('[' || to_json(lower(search_query))::text || ']')::jsonb THEN 0.9
                         ELSE 0.0 END,
                    CASE WHEN q_tsquery @@ d.english_tsvector THEN
                         (ts_rank(d.english_tsvector, q_tsquery) * 0.5)
                    ELSE 0.0 END
                ) as m_weight
            FROM dictionary d
            WHERE
                d.pinyin_flat LIKE query_flat || '%'
                OR q_tsquery @@ d.english_tsvector
                OR d.definitions @> to_jsonb(lower(search_query))
        )
        SELECT
            m.id, m.traditional, m.simplified, m.pinyin_accented, m.definitions,
            CASE
                WHEN m.m_weight >= 1.0 THEN 'exact'
                WHEN m.m_weight >= 0.8 THEN 'prefix'
                ELSE 'partial'
            END AS match_type,
            (m.m_weight * 100.0) +
            COALESCE(m.frequency_score, 0.0) -
            (m.curriculum_level * 10.0) +
            (CASE WHEN m.is_book_vocab THEN 50.0 ELSE 0.0 END) AS total_score
        FROM matches m
        WHERE m.m_weight > 0
        ORDER BY total_score DESC, char_length(m.traditional) ASC
        LIMIT result_limit;
    END IF;
END;
$fn$;

GRANT ALL ON FUNCTION public.search_dictionary(text, integer) TO anon;
GRANT ALL ON FUNCTION public.search_dictionary(text, integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_dictionary(text, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Drop the dead mnemonic generation queue (no writers, no workers)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.mnemonic_generation_queue;

-- ---------------------------------------------------------------------------
-- 5. Drop dead profile columns from the removed personal-vocabulary feature
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS personal_vocab_folder,
  DROP COLUMN IF EXISTS personal_vocab_tags;

COMMIT;
