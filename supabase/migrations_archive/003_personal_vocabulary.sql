-- Personal Vocabulary Library Migration
-- Run this in your Supabase SQL Editor to create the required tables

-- 1. Personal Vocabulary Entries table
CREATE TABLE IF NOT EXISTS public.personal_vocabulary (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  traditional TEXT NOT NULL,
  simplified TEXT NOT NULL,
  pinyin TEXT,
  definition TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  folder_id UUID,
  source_book_id INTEGER,
  source_lesson_id INTEGER,
  created_at BIGINT NOT NULL,
  last_reviewed_at BIGINT,
  review_count INTEGER DEFAULT 0,
  mastery_level INTEGER DEFAULT 0
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_personal_vocabulary_user_id ON public.personal_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_vocabulary_folder_id ON public.personal_vocabulary(folder_id);
CREATE INDEX IF NOT EXISTS idx_personal_vocabulary_traditional ON public.personal_vocabulary(traditional);

-- 2. Personal Vocabulary Folders table
CREATE TABLE IF NOT EXISTS public.personal_vocab_folders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '{}',
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_vocab_folders_user_id ON public.personal_vocab_folders(user_id);

-- 3. Add foreign key from personal_vocabulary to personal_vocab_folders
ALTER TABLE public.personal_vocabulary
  ADD CONSTRAINT fk_personal_vocabulary_folder
  FOREIGN KEY (folder_id) REFERENCES public.personal_vocab_folders(id) ON DELETE SET NULL;

-- 4. Row Level Security (RLS)
ALTER TABLE public.personal_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_vocab_folders ENABLE ROW LEVEL SECURITY;

-- Policies for personal_vocabulary
DROP POLICY IF EXISTS "Users can view their own vocabulary" ON public.personal_vocabulary;
DROP POLICY IF EXISTS "Users can insert their own vocabulary" ON public.personal_vocabulary;
DROP POLICY IF EXISTS "Users can update their own vocabulary" ON public.personal_vocabulary;
DROP POLICY IF EXISTS "Users can delete their own vocabulary" ON public.personal_vocabulary;
CREATE POLICY "Users can view their own vocabulary"
  ON public.personal_vocabulary FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabulary"
  ON public.personal_vocabulary FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary"
  ON public.personal_vocabulary FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary"
  ON public.personal_vocabulary FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for personal_vocab_folders
DROP POLICY IF EXISTS "Users can view their own vocab folders" ON public.personal_vocab_folders;
DROP POLICY IF EXISTS "Users can insert their own vocab folders" ON public.personal_vocab_folders;
DROP POLICY IF EXISTS "Users can update their own vocab folders" ON public.personal_vocab_folders;
DROP POLICY IF EXISTS "Users can delete their own vocab folders" ON public.personal_vocab_folders;
CREATE POLICY "Users can view their own vocab folders"
  ON public.personal_vocab_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocab folders"
  ON public.personal_vocab_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocab folders"
  ON public.personal_vocab_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocab folders"
  ON public.personal_vocab_folders FOR DELETE
  USING (auth.uid() = user_id);
