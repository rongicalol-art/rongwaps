-- Migration: User Daily Progress Table
-- Tracks per-day aggregated study stats for streak calculation and history

CREATE TABLE IF NOT EXISTS public.user_daily_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,  -- YYYY-MM-DD format
  xp_earned INTEGER NOT NULL DEFAULT 0,
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  cards_learned INTEGER NOT NULL DEFAULT 0,
  study_time_minutes INTEGER NOT NULL DEFAULT 0,
  activities_breakdown JSONB NOT NULL DEFAULT '{"flashcards":0,"quiz":0,"listening":0,"writing":0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE public.user_daily_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own daily progress" ON public.user_daily_progress;
CREATE POLICY "Users can view their own daily progress"
  ON public.user_daily_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily progress" ON public.user_daily_progress;
CREATE POLICY "Users can insert their own daily progress"
  ON public.user_daily_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily progress" ON public.user_daily_progress;
CREATE POLICY "Users can update their own daily progress"
  ON public.user_daily_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for efficient streak queries
CREATE INDEX IF NOT EXISTS idx_user_daily_progress_user_date
  ON public.user_daily_progress (user_id, date DESC);
