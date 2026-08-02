-- Reset only learning progress for the current authenticated learner.
-- Saved dictionary words, custom folders, and custom flashcards are preserved.
CREATE OR REPLACE FUNCTION public.reset_user_learning_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.user_card_progress
  WHERE user_id = current_user_id;

  DELETE FROM public.user_daily_progress
  WHERE user_id = current_user_id;

  UPDATE public.user_progress
  SET
    srs_data = '{}'::jsonb,
    learned_cards = '{}'::text[],
    last_activity = NULL,
    updated_at = timezone('utc'::text, now())
  WHERE user_id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_user_learning_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_user_learning_progress() TO authenticated;
