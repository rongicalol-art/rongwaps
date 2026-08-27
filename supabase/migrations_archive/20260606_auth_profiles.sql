-- Migration: User Profiles & Auth Helpers
-- Creates a user_profiles table and a trigger to auto-create profile on signup

-- 1. User Profiles Table (public-facing profile data)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles (needed for community features)
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.user_profiles;
CREATE POLICY "Anyone can view user profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Auto-create user profile and progress rows on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile from Google metadata
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );

  -- Create initial progress row
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure existing users without progress rows get one
-- (for users who signed up before this migration)
INSERT INTO public.user_progress (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_progress)
ON CONFLICT DO NOTHING;

-- 4. Backfill user_profiles from existing auth.users
INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT DO NOTHING;
