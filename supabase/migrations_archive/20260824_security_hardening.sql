-- Security hardening (2026-08-24 audit follow-up).
--
-- Combines the 2026-08-16 hardening (which was never applied to the live
-- project) with the mnemonics write restriction approved 2026-08-24.
-- Apply via Dashboard -> SQL Editor -> Run; verified live afterwards.
--
-- 1. mnemonic_generation_queue: policies claimed "Only service role /
--    backend can modify" but were `WITH CHECK (true)` / `USING (true)` with
--    no role restriction, i.e. world-writable by anon.
DROP POLICY IF EXISTS "Service can insert queue items" ON public.mnemonic_generation_queue;
CREATE POLICY "Service can insert queue items"
  ON public.mnemonic_generation_queue FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update queue items" ON public.mnemonic_generation_queue;
CREATE POLICY "Service can update queue items"
  ON public.mnemonic_generation_queue FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. user_profiles: SELECT was `USING (true)`, exposing email/full_name/
--    avatar_url to anonymous clients. Restrict reads to authenticated users.
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.user_profiles;
CREATE POLICY "Authenticated users can view user profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- 3. TTS storage: anon was granted UPDATE (overwrite) on the public
--    vocabulary-audio bucket under tts/. The server only performs plain
--    INSERT (see server.ts getTtsAudio), so anonymous overwrite allows
--    cache-poisoning. Drop the anon UPDATE policy; keep anon INSERT.
DROP POLICY IF EXISTS "Public update for TTS cache" ON storage.objects;

-- 4. handle_new_user() is SECURITY DEFINER without a pinned search_path.
--    Pin it to avoid search_path-based privilege escalation.
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 5. mnemonics: live project had drifted dashboard-created policies
--    ("Anyone can insert/delete mnemonics" on {public}) and RLS was not
--    enabled. The app has no runtime writer (saveMnemonicToCache has no
--    callers); the pre-generation pipeline runs under service_role. Enable
--    RLS (PG 14 - no FORCE support) and restrict writes to service_role.
ALTER TABLE public.mnemonics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Anyone can delete mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Authenticated users can insert mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Authenticated users can delete mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Service can insert mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Service can delete mnemonics" ON public.mnemonics;

CREATE POLICY "Service can insert mnemonics"
  ON public.mnemonics FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service can delete mnemonics"
  ON public.mnemonics FOR DELETE
  TO service_role
  USING (true);
