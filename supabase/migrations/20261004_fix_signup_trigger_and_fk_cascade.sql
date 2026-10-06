-- Signup + account-deletion fixes (2026-10-04)
--
-- Findings from the user-data audit (1 and 2 confirmed against the live DB):
--   1. handle_new_user still inserted into public.user_progress, which the
--      20260827 cleanup dropped. Every new signup raised inside the auth.users
--      trigger and rolled back, so nobody could register.
--   2. user_flashcards.user_id and user_folders.user_id referenced auth.users
--      with no ON DELETE action, so deleting an auth user that owned folders
--      or custom cards failed. Every other user table already cascades.
--   3. The trigger that calls handle_new_user lives on auth.users, which the
--      schema baseline does not dump, so no migration created it: a fresh
--      environment (local reset, new project) never made profile rows. It is
--      now created here when no trigger already calls the function.
--
-- Idempotent: safe to run if the same SQL was already applied by hand.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND tgfoid = 'public.handle_new_user'::regproc
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

ALTER TABLE public.user_flashcards
    DROP CONSTRAINT IF EXISTS user_flashcards_user_id_fkey,
    ADD CONSTRAINT user_flashcards_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_folders
    DROP CONSTRAINT IF EXISTS user_folders_user_id_fkey,
    ADD CONSTRAINT user_folders_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMIT;
