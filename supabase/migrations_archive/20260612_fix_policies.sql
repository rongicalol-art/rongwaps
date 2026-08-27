-- Fix: Drop existing policies that conflict with migration re-runs
-- This migration makes all previous migrations idempotent

-- user_progress policies
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;

-- user_folders policies
DROP POLICY IF EXISTS "Users can view their own folders" ON public.user_folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON public.user_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON public.user_folders;

-- user_flashcards policies
DROP POLICY IF EXISTS "Users can view their own flashcards" ON public.user_flashcards;
DROP POLICY IF EXISTS "Users can insert their own flashcards" ON public.user_flashcards;
DROP POLICY IF EXISTS "Users can delete their own flashcards" ON public.user_flashcards;

-- mnemonics policies
DROP POLICY IF EXISTS "Anyone can view mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Authenticated users can insert mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Authenticated users can delete mnemonics" ON public.mnemonics;

-- Now recreate them all
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own folders" ON public.user_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own folders" ON public.user_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.user_folders FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.user_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own flashcards" ON public.user_flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own flashcards" ON public.user_flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own flashcards" ON public.user_flashcards FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.mnemonics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view mnemonics" ON public.mnemonics FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert mnemonics" ON public.mnemonics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete mnemonics" ON public.mnemonics FOR DELETE USING (auth.role() = 'authenticated');

-- Add content_type column to mnemonics if missing
ALTER TABLE public.mnemonics ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'character';
CREATE INDEX IF NOT EXISTS idx_mnemonics_content_type ON public.mnemonics(content_type);
