-- RongWaps public read policies for read-only content tables (2026-08-28)
--
-- The app reads `dictionary`, `book_vocabulary`, and `character_breakdowns_v2`
-- as the anon role (fuzzy dictionary search RPC, vocabulary DB fallback,
-- character breakdowns). RLS ended up enabled on these tables with no policies
-- (e.g. dashboard table creation enables RLS by default), so anon/authenticated
-- saw zero rows and those features silently returned empty results.
--
-- Fix: enable RLS explicitly (no-op where already enabled) and grant everyone
-- SELECT. Writes stay locked — no INSERT/UPDATE/DELETE policies are added.
-- Mirrors the existing "Anyone can view mnemonics" pattern.

BEGIN;

ALTER TABLE public.dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read dictionary" ON public.dictionary;
CREATE POLICY "Anyone can read dictionary"
  ON public.dictionary
  FOR SELECT
  USING (true);

ALTER TABLE public.book_vocabulary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read book vocabulary" ON public.book_vocabulary;
CREATE POLICY "Anyone can read book vocabulary"
  ON public.book_vocabulary
  FOR SELECT
  USING (true);

ALTER TABLE public.character_breakdowns_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read character breakdowns" ON public.character_breakdowns_v2;
CREATE POLICY "Anyone can read character breakdowns"
  ON public.character_breakdowns_v2
  FOR SELECT
  USING (true);

COMMIT;
