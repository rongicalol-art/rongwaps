-- Migration: Add personal vocab preferences to user_profiles
-- Stores the user's selected personal vocab folder and tags for cross-device sync

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS personal_vocab_folder TEXT,
  ADD COLUMN IF NOT EXISTS personal_vocab_tags TEXT[] DEFAULT '{}';
