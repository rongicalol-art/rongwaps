-- Fix CORS policy on vocabulary-audio bucket
-- This allows the browser to fetch audio files directly from Supabase Storage

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vocabulary-audio',
  'vocabulary-audio',
  true,
  52428800, -- 50MB
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Set CORS policy for the bucket
-- Note: Supabase manages CORS at the project level, not per-bucket
-- We need to update the storage.buckets configuration
UPDATE storage.buckets SET public = true WHERE id = 'vocabulary-audio';

-- Alternative approach: Create a storage policy that allows public read
CREATE POLICY "Public read access for vocabulary-audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vocabulary-audio');