-- Indexes for the shared-content query patterns used by the web client.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_dictionary_traditional
  ON public.dictionary (traditional);

CREATE INDEX IF NOT EXISTS idx_dictionary_simplified
  ON public.dictionary (simplified);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'book_vocabulary'
      AND column_name = 'id'
      AND data_type IN ('text', 'character varying')
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_book_vocabulary_id_trgm
      ON public.book_vocabulary USING gin (id gin_trgm_ops)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'book_vocabulary'
      AND column_name = 'examples'
      AND data_type IN ('text', 'character varying')
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_book_vocabulary_examples_trgm
      ON public.book_vocabulary USING gin (examples gin_trgm_ops)';
  END IF;

  IF to_regclass('public.character_breakdowns_v2') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_character_breakdowns_v2_character
      ON public.character_breakdowns_v2 (character)';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'character_breakdowns_v2'
        AND column_name = 'decomposition'
        AND data_type IN ('text', 'character varying')
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_character_breakdowns_v2_decomposition_trgm
        ON public.character_breakdowns_v2 USING gin (decomposition gin_trgm_ops)';
    END IF;
  END IF;
END
$$;
