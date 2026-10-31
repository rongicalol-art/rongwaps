-- Run against a disposable/local database only. Every fixture is rolled back.
BEGIN;
INSERT INTO auth.users(id, email, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 's100000001@stu.edu.tw', now()),
  ('22222222-2222-4222-8222-222222222222', 's100000002@stu.edu.tw', now());
INSERT INTO auth.identities(user_id, provider_id, provider, identity_data)
SELECT id, id::text, 'google', jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd','stu.edu.tw'))
FROM auth.users WHERE id IN ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT public.append_review_events(jsonb_build_array(jsonb_build_object(
  'id','33333333-3333-4333-8333-333333333333','cardId','test-word','sessionId','local-test',
  'quality',3,'source','daily','durationMs',20000,'scheduled',true,
  'reviewedAt',extract(epoch FROM now()) * 1000
)));
SELECT public.append_review_events(jsonb_build_array(jsonb_build_object(
  'id','33333333-3333-4333-8333-333333333333','cardId','test-word','sessionId','local-test',
  'quality',3,'source','daily','durationMs',20000,'scheduled',true,
  'reviewedAt',extract(epoch FROM now()) * 1000
)));
DO $$ BEGIN
  IF (SELECT count(*) FROM public.user_review_events) <> 1 THEN RAISE EXCEPTION 'Duplicate review events'; END IF;
  IF jsonb_array_length(public.get_sync_state()->'review_events') <> 1 THEN RAISE EXCEPTION 'History missing from pull'; END IF;
END $$;
SELECT public.upsert_card_progress(jsonb_build_array(jsonb_build_object(
 'card_id','test-word','ease',2.5,'interval',3,'repetitions',1,'next_review_date',now()+interval '3 days','reviewed_at',now(),
 'scheduler_state',jsonb_build_object('version',1,'state',2,'stability',3,'difficulty',5,'reps',1,'lapses',0,'learningSteps',0,'scheduledDays',3,'elapsedDays',1)
)));
SELECT public.upsert_card_progress(jsonb_build_array(jsonb_build_object(
 'card_id','test-word','interval',999,'next_review_date',now()+interval '999 days','reviewed_at',now()+interval '1 second'
)));
DO $$ BEGIN
 IF (SELECT "interval" FROM public.user_card_progress WHERE card_id='test-word') <> 3 THEN RAISE EXCEPTION 'Old client overwrote FSRS'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.user_review_events) <> 0 THEN RAISE EXCEPTION 'Cross-user history leak'; END IF;
  BEGIN
    INSERT INTO public.user_review_events(user_id,event_id,card_id,reviewed_at,payload)
      VALUES ('11111111-1111-4111-8111-111111111111',gen_random_uuid(),'forbidden',now(),'{}');
    RAISE EXCEPTION 'Cross-user insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
INSERT INTO public.user_profiles(id, settings) VALUES ('11111111-1111-4111-8111-111111111111', '{"favorites":["keep"],"grammarProgress":{"completedPageIds":["old-page"]}}')
  ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings;
SELECT public.reset_user_learning_progress();
DO $$ BEGIN
 IF (SELECT settings ? 'grammarProgress' FROM public.user_profiles WHERE id = auth.uid()) THEN RAISE EXCEPTION 'Reset kept grammar completion'; END IF;
 IF (SELECT settings->'favorites' FROM public.user_profiles WHERE id = auth.uid()) <> '["keep"]'::jsonb THEN RAISE EXCEPTION 'Reset dropped other settings'; END IF;
END $$;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.user_review_events) <> 0 THEN RAISE EXCEPTION 'Reset retained history'; END IF;
END $$;
-- A save still in flight from before the reset must not restore the card;
-- work done after the reset still saves.
SELECT public.upsert_card_progress(jsonb_build_array(jsonb_build_object(
 'card_id','stale-word','interval',3,'next_review_date',now()+interval '3 days','reviewed_at',now()-interval '1 minute'
)));
SELECT public.upsert_card_progress(jsonb_build_array(jsonb_build_object(
 'card_id','fresh-word','interval',1,'next_review_date',now()+interval '1 day','reviewed_at',now()+interval '1 second'
)));
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.user_card_progress WHERE card_id='stale-word') THEN RAISE EXCEPTION 'Stale save survived reset'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_card_progress WHERE card_id='fresh-word') THEN RAISE EXCEPTION 'Post-reset save lost'; END IF;
 BEGIN
   INSERT INTO public.user_card_progress(user_id,card_id,"interval")
     VALUES ('11111111-1111-4111-8111-111111111111','direct-word',36500);
   RAISE EXCEPTION 'Direct progress write allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
ROLLBACK;
