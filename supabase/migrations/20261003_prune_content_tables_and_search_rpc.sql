-- Migration: 20261003_prune_content_tables_and_search_rpc.sql
-- Description: Drop reference content tables and search RPC from Supabase.
-- All learning content (dictionary, character breakdowns, course vocabulary, mnemonics)
-- is now served pack-first via static edge CDN and local IndexedDB cache, eliminating
-- redundant cloud storage, egress costs, and dual-maintenance overhead.

-- 1. Drop reference content tables
DROP TABLE IF EXISTS public.dictionary CASCADE;
DROP TABLE IF EXISTS public.character_breakdowns_v2 CASCADE;
DROP TABLE IF EXISTS public.book_vocabulary CASCADE;
DROP TABLE IF EXISTS public.mnemonics CASCADE;

-- 2. Drop obsolete dictionary search stored procedure (replaced by client-side offline search)
DROP FUNCTION IF EXISTS public.search_dictionary(text, integer);

-- 3. The public schema now contains strictly private user data:
--    - user_profiles
--    - user_folders
--    - user_flashcards
--    - user_card_progress
--    - user_learned_cards
--    - user_daily_progress
