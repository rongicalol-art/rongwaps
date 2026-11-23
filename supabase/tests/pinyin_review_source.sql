-- 20261123120000: Pinyin practice answers are accepted with source 'pinyin'; unknown sources are still refused.
-- Run against a disposable/local database only. Every fixture is rolled back.
BEGIN;
INSERT INTO auth.users(id, email, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 's100000001@stu.edu.tw', now());
INSERT INTO auth.identities(user_id, provider_id, provider, identity_data)
SELECT id, id::text, 'google', jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd','stu.edu.tw'))
FROM auth.users WHERE id = '11111111-1111-4111-8111-111111111111';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT public.append_review_events(jsonb_build_array(jsonb_build_object(
  'id','66666666-6666-4666-8666-666666666666','cardId','test-word','sessionId','pinyin-test',
  'quality',4,'source','pinyin','durationMs',3000,'scheduled',false,'practiceOnly',true,
  'reviewedAt',extract(epoch FROM now()) * 1000
)));
DO $$ BEGIN
  IF (SELECT count(*) FROM public.user_review_events WHERE payload->>'source' = 'pinyin') <> 1 THEN
    RAISE EXCEPTION 'Pinyin answer not stored';
  END IF;
  BEGIN
    PERFORM public.append_review_events(jsonb_build_array(jsonb_build_object(
      'id','77777777-7777-4777-8777-777777777777','cardId','test-word','sessionId','pinyin-test',
      'quality',4,'source','sentences','durationMs',3000,'scheduled',false,
      'reviewedAt',extract(epoch FROM now()) * 1000)));
    RAISE EXCEPTION 'Unknown source accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END $$;
ROLLBACK;
