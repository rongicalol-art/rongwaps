-- Migration for User Auth & Progress Data

-- 1. User Progress Table
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  srs_data JSONB DEFAULT '{}'::jsonb,
  learned_cards TEXT[] DEFAULT '{}'::TEXT[],
  last_activity TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. User Folders
CREATE TABLE IF NOT EXISTS public.user_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own folders" ON public.user_folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON public.user_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON public.user_folders;
CREATE POLICY "Users can view their own folders" 
  ON public.user_folders FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" 
  ON public.user_folders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
  ON public.user_folders FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. User Flashcards
CREATE TABLE IF NOT EXISTS public.user_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  folder_id UUID REFERENCES public.user_folders(id) ON DELETE SET NULL,
  simplified TEXT NOT NULL,
  traditional TEXT,
  pinyin TEXT,
  translation TEXT NOT NULL,
  notes TEXT,
  measure_words TEXT[],
  created_at BIGINT NOT NULL
);

ALTER TABLE public.user_flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own flashcards" ON public.user_flashcards;
DROP POLICY IF EXISTS "Users can insert their own flashcards" ON public.user_flashcards;
DROP POLICY IF EXISTS "Users can delete their own flashcards" ON public.user_flashcards;
CREATE POLICY "Users can view their own flashcards" 
  ON public.user_flashcards FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards" 
  ON public.user_flashcards FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards" 
  ON public.user_flashcards FOR DELETE 
  USING (auth.uid() = user_id);

-- 4. Global Mnemonics Cache
CREATE TABLE IF NOT EXISTS public.mnemonics (
  id TEXT PRIMARY KEY,
  character TEXT NOT NULL,
  mnemonic TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mnemonics ENABLE ROW LEVEL SECURITY;

-- Anyone can read and insert into the global mnemonics cache
DROP POLICY IF EXISTS "Anyone can view mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Authenticated users can insert mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Authenticated users can delete mnemonics" ON public.mnemonics;
CREATE POLICY "Anyone can view mnemonics" 
  ON public.mnemonics FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert mnemonics" 
  ON public.mnemonics FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete mnemonics" 
  ON public.mnemonics FOR DELETE 
  USING (auth.role() = 'authenticated');
