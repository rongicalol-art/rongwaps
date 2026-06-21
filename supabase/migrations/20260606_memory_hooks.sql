-- Migration: Memory Hooks - Pre-generate Mnemonics Infrastructure
-- Creates a queue table for batch mnemonic generation and helper functions
-- to auto-populate mnemonics for all curriculum vocabulary.

-- 1. Mnemonic Generation Queue
-- Tracks which characters/words need mnemonics generated and their status
CREATE TABLE IF NOT EXISTS public.mnemonic_generation_queue (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,            -- the character or word
    content_type TEXT NOT NULL DEFAULT 'character', -- 'character' or 'word'
    status TEXT NOT NULL DEFAULT 'pending',         -- 'pending', 'processing', 'completed', 'failed'
    attempts INT NOT NULL DEFAULT 0,
    error_message TEXT,
    priority INT NOT NULL DEFAULT 0,  -- higher = generate first (book vocab gets priority)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(content, content_type)
);

ALTER TABLE public.mnemonic_generation_queue ENABLE ROW LEVEL SECURITY;

-- Anyone can read the queue (for monitoring)
DROP POLICY IF EXISTS "Anyone can view mnemonic queue" ON public.mnemonic_generation_queue;
CREATE POLICY "Anyone can view mnemonic queue"
    ON public.mnemonic_generation_queue FOR SELECT
    USING (true);

-- Only service role / backend can modify
DROP POLICY IF EXISTS "Service can insert queue items" ON public.mnemonic_generation_queue;
CREATE POLICY "Service can insert queue items"
    ON public.mnemonic_generation_queue FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update queue items" ON public.mnemonic_generation_queue;
CREATE POLICY "Service can update queue items"
    ON public.mnemonic_generation_queue FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Index for efficient polling
CREATE INDEX IF NOT EXISTS idx_mnemonic_queue_status ON public.mnemonic_generation_queue(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_mnemonic_queue_content ON public.mnemonic_generation_queue(content, content_type);

-- 2. Function: Populate queue from book vocabulary
-- Call this to seed the queue with all unique characters and words from curriculum
CREATE OR REPLACE FUNCTION populate_mnemonic_queue()
RETURNS TABLE(inserted_count INT, skipped_count INT) AS $$
DECLARE
    v_inserted INT := 0;
    v_skipped INT := 0;
    v_char TEXT;
    v_word TEXT;
BEGIN
    -- Add all unique characters from book_vocabulary words
    FOR v_word IN SELECT DISTINCT traditional FROM public.book_vocabulary
    LOOP
        -- Add the whole word
        INSERT INTO public.mnemonic_generation_queue (content, content_type, priority)
        VALUES (v_word, 'word', 10)
        ON CONFLICT (content, content_type) DO NOTHING;

        IF FOUND THEN
            v_inserted := v_inserted + 1;
        ELSE
            v_skipped := v_skipped + 1;
        END IF;

        -- Add each character in the word
        FOR v_char IN SELECT DISTINCT unnest(string_to_array(v_word, NULL))
        LOOP
            -- Only CJK characters
            IF v_char ~ '[\u4e00-\u9fa5]' THEN
                INSERT INTO public.mnemonic_generation_queue (content, content_type, priority)
                VALUES (v_char, 'character', 5)
                ON CONFLICT (content, content_type) DO NOTHING;

                IF FOUND THEN
                    v_inserted := v_inserted + 1;
                ELSE
                    v_skipped := v_skipped + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- Also add characters from character_breakdowns that aren't in book vocab
    FOR v_char IN SELECT DISTINCT character FROM public.character_breakdowns
    LOOP
        INSERT INTO public.mnemonic_generation_queue (content, content_type, priority)
        VALUES (v_char, 'character', 1)
        ON CONFLICT (content, content_type) DO NOTHING;

        IF FOUND THEN
            v_inserted := v_inserted + 1;
        ELSE
            v_skipped := v_skipped + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_inserted, v_skipped;
END;
$$ LANGUAGE plpgsql;

-- 3. Function: Get next batch of pending items for processing
CREATE OR REPLACE FUNCTION get_pending_mnemonic_items(batch_size INT DEFAULT 10)
RETURNS TABLE(
    queue_id INT,
    content TEXT,
    content_type TEXT,
    priority INT
) AS $$
BEGIN
    RETURN QUERY
    UPDATE public.mnemonic_generation_queue
    SET status = 'processing',
        attempts = attempts + 1
    WHERE id IN (
        SELECT q.id
        FROM public.mnemonic_generation_queue q
        WHERE q.status = 'pending'
        ORDER BY q.priority DESC, q.created_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    )
    RETURNING public.mnemonic_generation_queue.id,
              public.mnemonic_generation_queue.content,
              public.mnemonic_generation_queue.content_type,
              public.mnemonic_generation_queue.priority;
END;
$$ LANGUAGE plpgsql;

-- 4. Function: Mark queue item as completed (mnemonic saved)
CREATE OR REPLACE FUNCTION mark_mnemonic_completed(p_content TEXT, p_content_type TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.mnemonic_generation_queue
    SET status = 'completed',
        processed_at = timezone('utc'::text, now()),
        error_message = NULL
    WHERE content = p_content AND content_type = p_content_type;
END;
$$ LANGUAGE plpgsql;

-- 5. Function: Mark queue item as failed
CREATE OR REPLACE FUNCTION mark_mnemonic_failed(p_content TEXT, p_content_type TEXT, p_error TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.mnemonic_generation_queue
    SET status = CASE
            WHEN attempts >= 3 THEN 'failed'
            ELSE 'pending'  -- retry up to 3 times
        END,
        error_message = p_error
    WHERE content = p_content AND content_type = p_content_type;
END;
$$ LANGUAGE plpgsql;

-- 6. View: Queue statistics
CREATE OR REPLACE VIEW mnemonic_queue_stats AS
SELECT
    status,
    content_type,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM public.mnemonic_generation_queue
GROUP BY status, content_type
ORDER BY status, content_type;

-- 7. Update mnemonics table: add content_type column to distinguish char vs word
ALTER TABLE public.mnemonics
    ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'character';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mnemonics_content_type ON public.mnemonics(content_type);
