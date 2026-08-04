-- TTS cache write access for vocabulary-audio bucket.
-- Server synthesizes MP3s and caches them via the anon key; anon needs
-- INSERT (create) and UPDATE (upsert) on storage.objects. Read was already
-- granted by 20260622_storage_cors.sql.

-- Allow anonymous upload of TTS cache files
CREATE POLICY "Public insert for TTS cache"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'vocabulary-audio'
    AND (storage.foldername(name))[1] = 'tts'
  );

-- Allow anonymous overwrite (upsert) of TTS cache files
CREATE POLICY "Public update for TTS cache"
  ON storage.objects FOR UPDATE
  TO anon
  USING (
    bucket_id = 'vocabulary-audio'
    AND (storage.foldername(name))[1] = 'tts'
  )
  WITH CHECK (
    bucket_id = 'vocabulary-audio'
    AND (storage.foldername(name))[1] = 'tts'
  );