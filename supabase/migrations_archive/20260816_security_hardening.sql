-- Security hardening (2026-08-16 audit follow-up).
--
-- Addresses the highest-severity RLS findings from the audit. This migration is
-- intentionally conservative: it only tightens policies whose current form
-- contradicts their own stated intent, plus one clear PII leak. It does NOT
-- change the `mnemonics` table policies (see note at bottom).
--
-- Apply manually; not run automatically. Review against the live project
-- before deploying.

-- 1. mnemonic_generation_queue: the original comment says "Only service role /
--    backend can modify", but the policies were `WITH CHECK (true)` /
--    `USING (true)` with no role restriction, i.e. world-writable by anon.
--    Restrict writes to service_role.
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

-- 2. user_profiles: SELECT was `USING (true)`, exposing email/full_name/avatar
--    to anonymous clients. Restrict reads to authenticated users. (No community
--    feature exists yet; revisit if public profiles become a real requirement.)
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.user_profiles;
CREATE POLICY "Authenticated users can view user profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- 3. TTS storage: anon was granted UPDATE (overwrite) on the public
--    vocabulary-audio bucket under tts/. The server only performs plain INSERT
--    (see server.ts getTtsAudio), so anonymous overwrite is unnecessary and
--    allows cache-poisoning. Drop the anon UPDATE policy; keep anon INSERT.
DROP POLICY IF EXISTS "Public update for TTS cache" ON storage.objects;

-- 4. handle_new_user() is SECURITY DEFINER without a pinned search_path.
--    Pin it to avoid search_path-based privilege escalation.
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- NOTE (not changed): public.mnemonics still allows any authenticated user to
-- INSERT (`auth.role() = 'authenticated'`) and DELETE (`auth.role() =
-- 'authenticated'`). The mnemonic cache flow (src/services/mnemonicCache.ts)
-- writes through the anon-key client, so tightening this requires a product
-- decision on whether guests may save mnemonics. Left as-is for review.
