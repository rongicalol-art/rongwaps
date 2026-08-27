CREATE TABLE IF NOT EXISTS public.user_card_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  ease NUMERIC NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_date TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, card_id)
);

-- Enable RLS
ALTER TABLE public.user_card_progress ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Users can manage their own card progress" ON public.user_card_progress;
CREATE POLICY "Users can manage their own card progress" 
ON public.user_card_progress FOR ALL USING (auth.uid() = user_id);

-- Create a function to batch upsert progress
CREATE OR REPLACE FUNCTION upsert_card_progress(
  p_records JSONB
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
