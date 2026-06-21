-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Dictionary Table
CREATE TABLE IF NOT EXISTS dictionary (
    id SERIAL PRIMARY KEY,
    traditional TEXT NOT NULL,
    simplified TEXT NOT NULL,
    
    -- Pinyin Variations
    pinyin_numbered TEXT,  -- e.g., "zen3 me5"
    pinyin_accented TEXT,  -- e.g., "zěn me"
    pinyin_flat TEXT,      -- e.g., "zenme" (spaces stripped, for fast prefix/exact match)
    pinyin_syllables TEXT, -- e.g., "zen me" (for accurate maximum-munch boundaries)
    
    -- Definitions
    definitions JSONB NOT NULL, -- e.g., '["how", "what", "why"]'
    
    -- NLP & Text Search Columns
    english_tsvector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', definitions::text)
    ) STORED,
    
    -- Scoring Metrics
    frequency_score FLOAT DEFAULT 0.0, -- derived from SUBTLEX-CH
    curriculum_level INT DEFAULT 99,   -- 1-6 for A1-C2/TOCFL, 99 for unranked
    is_book_vocab BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Book Vocabulary (Relational)
-- Assuming you have a separate table linking words to curriculums
CREATE TABLE IF NOT EXISTS book_vocabulary (
    id SERIAL PRIMARY KEY,
    book_id UUID NOT NULL,
    traditional TEXT NOT NULL,
    FOREIGN KEY (traditional) REFERENCES dictionary(traditional) DEFERRABLE INITIALLY DEFERRED
);
-- Note: traditional isn't unique in CC-CEDICT (heteronyms), so consider a dedicated index.
CREATE INDEX IF NOT EXISTS idx_book_vocab_trad ON book_vocabulary(traditional);

-- 4. High-Performance Indexes
-- Trigram indexes for fast LIKE/ILIKE on Hanzi
CREATE INDEX IF NOT EXISTS idx_dict_traditional_trgm ON dictionary USING GIN (traditional gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_dict_simplified_trgm ON dictionary USING GIN (simplified gin_trgm_ops);

-- Trigram and Prefix indexes for Pinyin
CREATE INDEX IF NOT EXISTS idx_dict_pinyin_flat_trgm ON dictionary USING GIN (pinyin_flat gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_dict_pinyin_flat_prefix ON dictionary (pinyin_flat text_pattern_ops);

-- GIN Index for rapid English Full-Text Search
CREATE INDEX IF NOT EXISTS idx_dict_english_fts ON dictionary USING GIN (english_tsvector);
CREATE INDEX IF NOT EXISTS idx_dict_definitions_gin ON dictionary USING GIN (definitions);

-- 5. The Advanced Search RPC
CREATE OR REPLACE FUNCTION search_dictionary(
    search_query TEXT,
    result_limit INT DEFAULT 50
)
RETURNS TABLE (
    id INT,
    traditional TEXT,
    simplified TEXT,
    pinyin_accented TEXT,
    definitions JSONB,
    match_type TEXT,
    total_score FLOAT
) LANGUAGE plpgsql AS $$
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
    -- Supports partial prefix matching for english: e.g. "how:*"
    q_tsquery := plainto_tsquery('english', search_query);

    -- 2. Execute Query & Score
    RETURN QUERY
    WITH matches AS (
        SELECT 
            d.id,
            d.traditional,
            d.simplified,
            d.pinyin_accented,
            d.definitions,
            d.frequency_score,
            d.curriculum_level,
            d.is_book_vocab,
            -- Determine Match Weight (M_weight)
            CASE 
                -- HANZI SCORING
                WHEN is_hanzi THEN
                    CASE 
                        WHEN d.traditional = search_query OR d.simplified = search_query THEN 1.0
                        WHEN d.traditional LIKE search_query || '%' OR d.simplified LIKE search_query || '%' THEN 0.8
                        ELSE 0.5
                    END
                -- ASCII (PINYIN OR ENGLISH) SCORING
                WHEN is_ascii THEN
                    GREATEST(
                        -- A: Exact Flat Pinyin (e.g. zenme = zenme)
                        CASE WHEN d.pinyin_flat = query_flat THEN 1.0 
                        -- B: Prefix Pinyin (e.g. zenm = zenme)
                             WHEN d.pinyin_flat LIKE query_flat || '%' THEN 0.8 
                             ELSE 0.0 END,
                        -- C: Exact English Entity Match inside JSON array (The "How" Problem Fix)
                        CASE WHEN d.definitions @> to_jsonb(lower(search_query)) THEN 0.9 
                             WHEN d.definitions @> ('[' || to_json(lower(search_query))::text || ']')::jsonb THEN 0.9
                             ELSE 0.0 END,
                        -- D: Substring / FTS English definition match
                        CASE WHEN q_tsquery @@ d.english_tsvector THEN 
                             (ts_rank(d.english_tsvector, q_tsquery) * 0.5) -- Cap TS Rank weight
                        ELSE 0.0 END
                    )
                ELSE 0.1
            END as m_weight
        FROM dictionary d
        WHERE 
            -- Pre-filter to utilize indexes before scoring
            (is_hanzi AND (d.traditional LIKE '%' || search_query || '%' OR d.simplified LIKE '%' || search_query || '%'))
            OR
            (is_ascii AND (
                d.pinyin_flat LIKE query_flat || '%' 
                OR q_tsquery @@ d.english_tsvector
                OR d.definitions @> to_jsonb(lower(search_query))
            ))
    )
    SELECT 
        m.id,
        m.traditional,
        m.simplified,
        m.pinyin_accented,
        m.definitions,
        CASE 
            WHEN m.m_weight >= 1.0 THEN 'exact'
            WHEN m.m_weight >= 0.8 THEN 'prefix'
            ELSE 'partial'
        END AS match_type,
        -- Final Dynamic Scoring Formula
        (m.m_weight * 100.0) + 
        COALESCE(m.frequency_score, 0.0) -       -- Boost by speaking frequency
        (m.curriculum_level * 10.0) +            -- Penalize high difficulty / rare words
        (CASE WHEN m.is_book_vocab THEN 50.0 ELSE 0.0 END) -- Massive boost for internal curriculum
        AS total_score
    FROM matches m
    WHERE m.m_weight > 0
    ORDER BY total_score DESC, char_length(m.traditional) ASC
    LIMIT result_limit;
END;
$$;
