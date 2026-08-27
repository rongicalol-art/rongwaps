-- Live-schema baseline captured 2026-08-25 via `supabase db dump` after the
-- migration-history re-baseline. Replaces the original per-change migrations
-- (archived in supabase/migrations_archive/) whose history had drifted from the
-- live project. Includes the 2026-08-24/25 security hardening.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."get_user_aggregate_stats"("p_user_id" "uuid") RETURNS TABLE("total_xp" bigint, "total_cards_reviewed" bigint, "total_cards_learned" bigint, "current_streak" integer, "longest_streak" integer, "last_study_date" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_start_date TEXT := TO_CHAR(CURRENT_DATE - INTERVAL '400 days', 'YYYY-MM-DD');
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'get_user_aggregate_stats: caller may only read their own stats';
  END IF;

  RETURN QUERY
  WITH daily AS (
    -- Rolling window bounds every scan below; streaks longer than ~400 days
    -- are not physically meaningful for a streak UI.
    SELECT date
    FROM public.user_daily_progress
    WHERE user_id = p_user_id
      AND date >= v_start_date
  ),
  stats AS (
    SELECT
      COALESCE(SUM(xp_earned), 0)::BIGINT AS total_xp,
      COALESCE(SUM(cards_reviewed), 0)::BIGINT AS total_cards_reviewed,
      COALESCE(SUM(cards_learned), 0)::BIGINT AS total_cards_learned,
      MAX(date) AS last_study_date
    FROM public.user_daily_progress
    WHERE user_id = p_user_id
      AND date >= v_start_date
  ),
  -- Group consecutive dates into runs (standard gaps-and-islands).
  runs AS (
    SELECT
      date::date - (ROW_NUMBER() OVER (ORDER BY date))::INTEGER * INTERVAL '1 day' AS grp
    FROM daily
  ),
  run_lengths AS (
    SELECT COUNT(*)::INTEGER AS run_length
    FROM runs
    GROUP BY grp
  ),
  streak_calc AS (
    SELECT
      COALESCE(MAX(run_length), 0) AS longest_streak
    FROM run_lengths
  ),
  current_run AS (
    SELECT COUNT(*)::INTEGER AS current_streak
    FROM (
      SELECT
        date::date AS d,
        ROW_NUMBER() OVER (ORDER BY date DESC) AS rn
      FROM daily
    ) sub
    WHERE d = CURRENT_DATE - (rn - 1) * INTERVAL '1 day'
      AND d >= CURRENT_DATE - INTERVAL '1 day'
  )
  SELECT
    s.total_xp,
    s.total_cards_reviewed,
    s.total_cards_learned,
    COALESCE(cr.current_streak, 0),
    sc.longest_streak,
    s.last_study_date
  FROM stats s, streak_calc sc, current_run cr;
END;
$$;


ALTER FUNCTION "public"."get_user_aggregate_stats"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  INSERT INTO public.user_progress (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."global_dictionary" (
    "traditional" "text" NOT NULL,
    "simplified" "text",
    "pinyin" "jsonb",
    "definitions" "jsonb"
);


ALTER TABLE "public"."global_dictionary" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_dictionary"("query_text" "text") RETURNS SETOF "public"."global_dictionary"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  -- This strips out everything except standard letters so "qilai", "qi lai", or "qi3lai2" all become "qilai"
  normalized_query text := regexp_replace(query_text, '[^a-zA-Z]', '', 'g');
BEGIN
  RETURN QUERY
  SELECT *
  FROM global_dictionary
  WHERE 
    -- Match Chinese Characters
    simplified ILIKE '%' || query_text || '%'
    OR traditional ILIKE '%' || query_text || '%'
    -- Match English Definitions
    OR definitions::text ILIKE '%' || query_text || '%'
    -- Match Pinyin: strips brackets, quotes, commas, numbers, and spaces from the DB array
    OR regexp_replace(pinyin::text, '[^a-zA-Z]', '', 'g') ILIKE '%' || normalized_query || '%'
  LIMIT 50;
END;
$$;


ALTER FUNCTION "public"."search_dictionary"("query_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_dictionary"("search_query" "text", "result_limit" integer DEFAULT 50) RETURNS TABLE("id" integer, "traditional" "text", "simplified" "text", "pinyin_accented" "text", "definitions" "jsonb", "match_type" "text", "total_score" double precision)
    LANGUAGE "plpgsql"
    AS $_$
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
$_$;


ALTER FUNCTION "public"."search_dictionary"("search_query" "text", "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_card_progress"("p_records" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_card_progress (
    user_id, card_id, ease, interval, repetitions, next_review_date, last_updated
  )
  SELECT 
    auth.uid(),
    (rec->>'card_id')::TEXT,
    (rec->>'ease')::NUMERIC,
    (rec->>'interval')::INTEGER,
    (rec->>'repetitions')::INTEGER,
    (rec->>'next_review_date')::TIMESTAMP WITH TIME ZONE,
    NOW()
  FROM jsonb_array_elements(p_records) AS rec
  ON CONFLICT (user_id, card_id) 
  DO UPDATE SET 
    ease = EXCLUDED.ease,
    interval = EXCLUDED.interval,
    repetitions = EXCLUDED.repetitions,
    next_review_date = EXCLUDED.next_review_date,
    last_updated = EXCLUDED.last_updated;
END;
$$;


ALTER FUNCTION "public"."upsert_card_progress"("p_records" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_daily_progress"("p_user_id" "uuid", "p_date" "text", "p_xp_earned" integer DEFAULT 0, "p_cards_reviewed" integer DEFAULT 0, "p_cards_learned" integer DEFAULT 0, "p_study_time_minutes" integer DEFAULT 0, "p_activity_type" "text" DEFAULT NULL::"text", "p_activity_count" integer DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  existing_breakdown JSONB;
  key TEXT;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'upsert_daily_progress: caller may only modify their own progress';
  END IF;

  -- Get existing breakdown
  SELECT activities_breakdown INTO existing_breakdown
  FROM public.user_daily_progress
  WHERE user_id = p_user_id AND date = p_date;

  IF existing_breakdown IS NULL THEN
    existing_breakdown := '{"flashcards":0,"quiz":0,"listening":0,"writing":0}'::jsonb;
  END IF;

  -- Increment activity breakdown
  IF p_activity_type IS NOT NULL AND p_activity_count > 0 THEN
    key := p_activity_type;
    existing_breakdown := jsonb_set(
      existing_breakdown,
      ARRAY[key],
      to_jsonb(COALESCE((existing_breakdown->>key)::INTEGER, 0) + p_activity_count)
    );
  END IF;

  INSERT INTO public.user_daily_progress (
    user_id, date, xp_earned, cards_reviewed, cards_learned,
    study_time_minutes, activities_breakdown, created_at, updated_at
  ) VALUES (
    p_user_id, p_date,
    p_xp_earned, p_cards_reviewed, p_cards_learned,
    p_study_time_minutes, existing_breakdown,
    NOW(), NOW()
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    xp_earned = public.user_daily_progress.xp_earned + p_xp_earned,
    cards_reviewed = public.user_daily_progress.cards_reviewed + p_cards_reviewed,
    cards_learned = public.user_daily_progress.cards_learned + p_cards_learned,
    study_time_minutes = public.user_daily_progress.study_time_minutes + p_study_time_minutes,
    activities_breakdown = existing_breakdown,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."upsert_daily_progress"("p_user_id" "uuid", "p_date" "text", "p_xp_earned" integer, "p_cards_reviewed" integer, "p_cards_learned" integer, "p_study_time_minutes" integer, "p_activity_type" "text", "p_activity_count" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."book_vocabulary" (
    "id" "text" NOT NULL,
    "traditional" "text",
    "simplified" "text",
    "pinyin" "text",
    "pos" "text",
    "meaning" "text",
    "examples" "text",
    "variants" "text",
    "audio" "text",
    "tags" "text"
);


ALTER TABLE "public"."book_vocabulary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_breakdowns" (
    "character" "text" NOT NULL,
    "radical" "text",
    "pinyin" "jsonb",
    "definition" "text",
    "decomposition" "text"
);


ALTER TABLE "public"."character_breakdowns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_breakdowns_v2" (
    "character" "text" NOT NULL,
    "radical" "text",
    "pinyin" "text"[],
    "definition" "text",
    "decomposition" "text",
    "components_historical" "text"[]
);


ALTER TABLE "public"."character_breakdowns_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dictionary" (
    "id" integer NOT NULL,
    "traditional" "text" NOT NULL,
    "simplified" "text" NOT NULL,
    "pinyin_numbered" "text",
    "pinyin_accented" "text",
    "pinyin_flat" "text",
    "pinyin_syllables" "text",
    "definitions" "jsonb" NOT NULL,
    "english_tsvector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ("definitions")::"text")) STORED,
    "frequency_score" double precision DEFAULT 0.0,
    "curriculum_level" integer DEFAULT 99,
    "is_book_vocab" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."dictionary" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dictionary_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dictionary_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dictionary_id_seq" OWNED BY "public"."dictionary"."id";



CREATE TABLE IF NOT EXISTS "public"."historical_dictionary" (
    "idx" integer NOT NULL,
    "character" "text" NOT NULL,
    "radical" "text",
    "pinyin" "text",
    "definition" "text",
    "decomposition" "text",
    "components_historical" "text"[]
);


ALTER TABLE "public"."historical_dictionary" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."historical_dictionary_idx_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."historical_dictionary_idx_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."historical_dictionary_idx_seq" OWNED BY "public"."historical_dictionary"."idx";



CREATE TABLE IF NOT EXISTS "public"."mnemonic_generation_queue" (
    "id" integer NOT NULL,
    "content" "text" NOT NULL,
    "content_type" "text" DEFAULT 'character'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "priority" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."mnemonic_generation_queue" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mnemonic_generation_queue_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mnemonic_generation_queue_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mnemonic_generation_queue_id_seq" OWNED BY "public"."mnemonic_generation_queue"."id";



CREATE TABLE IF NOT EXISTS "public"."mnemonics" (
    "id" "text" NOT NULL,
    "character" "text" NOT NULL,
    "mnemonic" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "content_type" "text" DEFAULT 'character'::"text" NOT NULL
);

ALTER TABLE ONLY "public"."mnemonics" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."mnemonics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_vocab_folders" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '{}'::"text" NOT NULL,
    "created_at" bigint NOT NULL
);


ALTER TABLE "public"."personal_vocab_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_vocabulary" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "traditional" "text" NOT NULL,
    "simplified" "text" NOT NULL,
    "pinyin" "text",
    "definition" "text",
    "notes" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "folder_id" "uuid",
    "source_book_id" integer,
    "source_lesson_id" integer,
    "created_at" bigint NOT NULL,
    "last_reviewed_at" bigint,
    "review_count" integer DEFAULT 0,
    "mastery_level" integer DEFAULT 0
);


ALTER TABLE "public"."personal_vocabulary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_card_progress" (
    "user_id" "uuid" NOT NULL,
    "card_id" "text" NOT NULL,
    "ease" numeric DEFAULT 2.5 NOT NULL,
    "interval" integer DEFAULT 0 NOT NULL,
    "repetitions" integer DEFAULT 0 NOT NULL,
    "next_review_date" timestamp with time zone,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_card_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_daily_progress" (
    "user_id" "uuid" NOT NULL,
    "date" "text" NOT NULL,
    "xp_earned" integer DEFAULT 0 NOT NULL,
    "cards_reviewed" integer DEFAULT 0 NOT NULL,
    "cards_learned" integer DEFAULT 0 NOT NULL,
    "study_time_minutes" integer DEFAULT 0 NOT NULL,
    "activities_breakdown" "jsonb" DEFAULT '{"quiz": 0, "writing": 0, "listening": 0, "flashcards": 0}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_daily_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_flashcards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "folder_id" "uuid",
    "simplified" "text" NOT NULL,
    "traditional" "text",
    "pinyin" "text",
    "translation" "text" NOT NULL,
    "notes" "text",
    "measure_words" "text"[],
    "created_at" bigint NOT NULL
);


ALTER TABLE "public"."user_flashcards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "personal_vocab_folder" "text",
    "personal_vocab_tags" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "user_id" "uuid" NOT NULL,
    "srs_data" "jsonb" DEFAULT '{}'::"jsonb",
    "learned_cards" "text"[] DEFAULT '{}'::"text"[],
    "last_activity" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


ALTER TABLE ONLY "public"."dictionary" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dictionary_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."historical_dictionary" ALTER COLUMN "idx" SET DEFAULT "nextval"('"public"."historical_dictionary_idx_seq"'::"regclass");



ALTER TABLE ONLY "public"."mnemonic_generation_queue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mnemonic_generation_queue_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."book_vocabulary"
    ADD CONSTRAINT "book_vocabulary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_breakdowns"
    ADD CONSTRAINT "character_breakdowns_pkey" PRIMARY KEY ("character");



ALTER TABLE ONLY "public"."character_breakdowns_v2"
    ADD CONSTRAINT "character_breakdowns_v2_pkey" PRIMARY KEY ("character");



ALTER TABLE ONLY "public"."dictionary"
    ADD CONSTRAINT "dictionary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_dictionary"
    ADD CONSTRAINT "global_dictionary_pkey" PRIMARY KEY ("traditional");



ALTER TABLE ONLY "public"."historical_dictionary"
    ADD CONSTRAINT "historical_dictionary_character_key" UNIQUE ("character");



ALTER TABLE ONLY "public"."historical_dictionary"
    ADD CONSTRAINT "historical_dictionary_pkey" PRIMARY KEY ("idx");



ALTER TABLE ONLY "public"."mnemonic_generation_queue"
    ADD CONSTRAINT "mnemonic_generation_queue_content_content_type_key" UNIQUE ("content", "content_type");



ALTER TABLE ONLY "public"."mnemonic_generation_queue"
    ADD CONSTRAINT "mnemonic_generation_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mnemonics"
    ADD CONSTRAINT "mnemonics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_vocab_folders"
    ADD CONSTRAINT "personal_vocab_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_vocabulary"
    ADD CONSTRAINT "personal_vocabulary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_card_progress"
    ADD CONSTRAINT "user_card_progress_pkey" PRIMARY KEY ("user_id", "card_id");



ALTER TABLE ONLY "public"."user_daily_progress"
    ADD CONSTRAINT "user_daily_progress_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_flashcards"
    ADD CONSTRAINT "user_flashcards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_folders"
    ADD CONSTRAINT "user_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_book_vocab_trad" ON "public"."book_vocabulary" USING "btree" ("traditional");



CREATE INDEX "idx_dict_definitions_gin" ON "public"."dictionary" USING "gin" ("definitions");



CREATE INDEX "idx_dict_english_fts" ON "public"."dictionary" USING "gin" ("english_tsvector");



CREATE INDEX "idx_dict_pinyin_flat_prefix" ON "public"."dictionary" USING "btree" ("pinyin_flat" "text_pattern_ops");



CREATE INDEX "idx_dict_pinyin_flat_trgm" ON "public"."dictionary" USING "gin" ("pinyin_flat" "public"."gin_trgm_ops");



CREATE INDEX "idx_dict_simplified_trgm" ON "public"."dictionary" USING "gin" ("simplified" "public"."gin_trgm_ops");



CREATE INDEX "idx_dict_traditional_trgm" ON "public"."dictionary" USING "gin" ("traditional" "public"."gin_trgm_ops");



CREATE INDEX "idx_mnemonic_queue_content" ON "public"."mnemonic_generation_queue" USING "btree" ("content", "content_type");



CREATE INDEX "idx_mnemonic_queue_status" ON "public"."mnemonic_generation_queue" USING "btree" ("status", "priority" DESC, "created_at");



CREATE INDEX "idx_mnemonics_character" ON "public"."mnemonics" USING "btree" ("character");



CREATE INDEX "idx_mnemonics_content_type" ON "public"."mnemonics" USING "btree" ("content_type");



CREATE INDEX "idx_personal_vocab_folders_user_id" ON "public"."personal_vocab_folders" USING "btree" ("user_id");



CREATE INDEX "idx_personal_vocabulary_folder_id" ON "public"."personal_vocabulary" USING "btree" ("folder_id");



CREATE INDEX "idx_personal_vocabulary_tags_gin" ON "public"."personal_vocabulary" USING "gin" ("tags");



CREATE INDEX "idx_personal_vocabulary_traditional" ON "public"."personal_vocabulary" USING "btree" ("traditional");



CREATE INDEX "idx_personal_vocabulary_user_created" ON "public"."personal_vocabulary" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_personal_vocabulary_user_id" ON "public"."personal_vocabulary" USING "btree" ("user_id");



CREATE INDEX "idx_user_card_progress_next_review" ON "public"."user_card_progress" USING "btree" ("next_review_date");



CREATE INDEX "idx_user_card_progress_user_id" ON "public"."user_card_progress" USING "btree" ("user_id");



CREATE INDEX "idx_user_daily_progress_user_date" ON "public"."user_daily_progress" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "idx_user_flashcards_folder_id" ON "public"."user_flashcards" USING "btree" ("folder_id");



CREATE INDEX "idx_user_flashcards_user_id" ON "public"."user_flashcards" USING "btree" ("user_id");



CREATE INDEX "idx_user_folders_user_id" ON "public"."user_folders" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."personal_vocabulary"
    ADD CONSTRAINT "fk_personal_vocabulary_folder" FOREIGN KEY ("folder_id") REFERENCES "public"."personal_vocab_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."personal_vocab_folders"
    ADD CONSTRAINT "personal_vocab_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_vocabulary"
    ADD CONSTRAINT "personal_vocabulary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_progress"
    ADD CONSTRAINT "user_card_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_daily_progress"
    ADD CONSTRAINT "user_daily_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_flashcards"
    ADD CONSTRAINT "user_flashcards_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."user_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_flashcards"
    ADD CONSTRAINT "user_flashcards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_folders"
    ADD CONSTRAINT "user_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Anyone can view mnemonic queue" ON "public"."mnemonic_generation_queue" FOR SELECT USING (true);



CREATE POLICY "Anyone can view mnemonics" ON "public"."mnemonics" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can view user profiles" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Service can delete mnemonics" ON "public"."mnemonics" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Service can insert mnemonics" ON "public"."mnemonics" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service can insert queue items" ON "public"."mnemonic_generation_queue" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service can update queue items" ON "public"."mnemonic_generation_queue" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete their own flashcards" ON "public"."user_flashcards" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own folders" ON "public"."user_folders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own vocab folders" ON "public"."personal_vocab_folders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own vocabulary" ON "public"."personal_vocabulary" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own daily progress" ON "public"."user_daily_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own flashcards" ON "public"."user_flashcards" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own folders" ON "public"."user_folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own progress" ON "public"."user_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own vocab folders" ON "public"."personal_vocab_folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own vocabulary" ON "public"."personal_vocabulary" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own card progress" ON "public"."user_card_progress" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own daily progress" ON "public"."user_daily_progress" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own flashcards" ON "public"."user_flashcards" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own folders" ON "public"."user_folders" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own progress" ON "public"."user_progress" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own vocab folders" ON "public"."personal_vocab_folders" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own vocabulary" ON "public"."personal_vocabulary" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own daily progress" ON "public"."user_daily_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own flashcards" ON "public"."user_flashcards" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own folders" ON "public"."user_folders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own progress" ON "public"."user_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own vocab folders" ON "public"."personal_vocab_folders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own vocabulary" ON "public"."personal_vocabulary" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."mnemonic_generation_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mnemonics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_vocab_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_vocabulary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_card_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_daily_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_flashcards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_aggregate_stats"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_aggregate_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_aggregate_stats"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON TABLE "public"."global_dictionary" TO "anon";
GRANT ALL ON TABLE "public"."global_dictionary" TO "authenticated";
GRANT ALL ON TABLE "public"."global_dictionary" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_dictionary"("query_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_dictionary"("query_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_dictionary"("query_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_dictionary"("search_query" "text", "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_dictionary"("search_query" "text", "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_dictionary"("search_query" "text", "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_card_progress"("p_records" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_card_progress"("p_records" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_card_progress"("p_records" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_daily_progress"("p_user_id" "uuid", "p_date" "text", "p_xp_earned" integer, "p_cards_reviewed" integer, "p_cards_learned" integer, "p_study_time_minutes" integer, "p_activity_type" "text", "p_activity_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_daily_progress"("p_user_id" "uuid", "p_date" "text", "p_xp_earned" integer, "p_cards_reviewed" integer, "p_cards_learned" integer, "p_study_time_minutes" integer, "p_activity_type" "text", "p_activity_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_daily_progress"("p_user_id" "uuid", "p_date" "text", "p_xp_earned" integer, "p_cards_reviewed" integer, "p_cards_learned" integer, "p_study_time_minutes" integer, "p_activity_type" "text", "p_activity_count" integer) TO "service_role";



GRANT ALL ON TABLE "public"."book_vocabulary" TO "anon";
GRANT ALL ON TABLE "public"."book_vocabulary" TO "authenticated";
GRANT ALL ON TABLE "public"."book_vocabulary" TO "service_role";



GRANT ALL ON TABLE "public"."character_breakdowns" TO "anon";
GRANT ALL ON TABLE "public"."character_breakdowns" TO "authenticated";
GRANT ALL ON TABLE "public"."character_breakdowns" TO "service_role";



GRANT ALL ON TABLE "public"."character_breakdowns_v2" TO "anon";
GRANT ALL ON TABLE "public"."character_breakdowns_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."character_breakdowns_v2" TO "service_role";



GRANT ALL ON TABLE "public"."dictionary" TO "anon";
GRANT ALL ON TABLE "public"."dictionary" TO "authenticated";
GRANT ALL ON TABLE "public"."dictionary" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dictionary_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dictionary_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dictionary_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."historical_dictionary" TO "anon";
GRANT ALL ON TABLE "public"."historical_dictionary" TO "authenticated";
GRANT ALL ON TABLE "public"."historical_dictionary" TO "service_role";



GRANT ALL ON SEQUENCE "public"."historical_dictionary_idx_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."historical_dictionary_idx_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."historical_dictionary_idx_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mnemonic_generation_queue" TO "anon";
GRANT ALL ON TABLE "public"."mnemonic_generation_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."mnemonic_generation_queue" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mnemonic_generation_queue_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mnemonic_generation_queue_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mnemonic_generation_queue_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mnemonics" TO "anon";
GRANT ALL ON TABLE "public"."mnemonics" TO "authenticated";
GRANT ALL ON TABLE "public"."mnemonics" TO "service_role";



GRANT ALL ON TABLE "public"."personal_vocab_folders" TO "anon";
GRANT ALL ON TABLE "public"."personal_vocab_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_vocab_folders" TO "service_role";



GRANT ALL ON TABLE "public"."personal_vocabulary" TO "anon";
GRANT ALL ON TABLE "public"."personal_vocabulary" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_vocabulary" TO "service_role";



GRANT ALL ON TABLE "public"."user_card_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_card_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_card_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_daily_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_daily_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_daily_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_flashcards" TO "anon";
GRANT ALL ON TABLE "public"."user_flashcards" TO "authenticated";
GRANT ALL ON TABLE "public"."user_flashcards" TO "service_role";



GRANT ALL ON TABLE "public"."user_folders" TO "anon";
GRANT ALL ON TABLE "public"."user_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."user_folders" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







