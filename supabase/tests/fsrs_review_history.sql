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
-- Card snapshots an older client still sends are not stored; rows stored before 20261101120100 still have them
-- and come back without them in a pull.
SELECT public.append_review_events(jsonb_build_array(jsonb_build_object(
  'id','44444444-4444-4444-8444-444444444444','cardId','test-word','sessionId','local-test',
  'quality',4,'source','daily','durationMs',15000,'scheduled',true,
  'reviewedAt',extract(epoch FROM now()) * 1000,
  'before',jsonb_build_object('interval',1),'after',jsonb_build_object('interval',3)
)));
-- A row stored before 20261101120100 (written as the table owner: learners can no longer insert directly).
RESET ROLE;
INSERT INTO public.user_review_events(user_id,event_id,card_id,reviewed_at,payload) VALUES
  ('11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555','old-word',now(),
   jsonb_build_object('id','55555555-5555-4555-8555-555555555555','cardId','old-word','sessionId','old','quality',3,'source','daily',
     'durationMs',1000,'scheduled',true,'reviewedAt',extract(epoch FROM now()) * 1000,'before',null,'after',jsonb_build_object('interval',2)));
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT payload ? 'before' OR payload ? 'after' FROM public.user_review_events WHERE event_id='44444444-4444-4444-8444-444444444444') THEN RAISE EXCEPTION 'Card snapshots stored'; END IF;
  IF (SELECT payload->>'quality' FROM public.user_review_events WHERE event_id='44444444-4444-4444-8444-444444444444') <> '4' THEN RAISE EXCEPTION 'Slim event lost its answer'; END IF;
  IF jsonb_array_length(public.get_sync_state()->'review_events') <> 3 THEN RAISE EXCEPTION 'Slim history missing from pull'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(public.get_sync_state()->'review_events') e WHERE e ? 'before' OR e ? 'after') THEN RAISE EXCEPTION 'Pull returned card snapshots'; END IF;
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
-- Only known keys are stored; an oversized or unknown field never reaches the table.
SELECT public.append_review_events(jsonb_build_array(jsonb_build_object(
  'id','66666666-6666-4666-8666-666666666666','cardId','test-word','sessionId','local-test',
  'quality',2,'source','quiz','durationMs',1000,'scheduled',false,'dailyTarget',10,'practiceOnly',true,
  'reviewedAt',extract(epoch FROM now()) * 1000, 'junk', repeat('x', 30000)
)));
DO $$ BEGIN
  IF (SELECT payload ? 'junk' FROM public.user_review_events WHERE event_id='66666666-6666-4666-8666-666666666666') THEN RAISE EXCEPTION 'Unknown key stored'; END IF;
  IF (SELECT payload->>'dailyTarget' FROM public.user_review_events WHERE event_id='66666666-6666-4666-8666-666666666666') <> '10' THEN RAISE EXCEPTION 'Daily target lost'; END IF;
  IF (SELECT payload->>'practiceOnly' FROM public.user_review_events WHERE event_id='66666666-6666-4666-8666-666666666666') <> 'true' THEN RAISE EXCEPTION 'practiceOnly lost'; END IF;
  BEGIN
    INSERT INTO public.user_review_events(user_id,event_id,card_id,reviewed_at,payload)
      VALUES ('11111111-1111-4111-8111-111111111111',gen_random_uuid(),'own-direct',now(),'{}');
    RAISE EXCEPTION 'Direct history write allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
-- At most 5,000 new events a day: a full day refuses more, but resending stored events still works.
RESET ROLE;
INSERT INTO public.user_review_events(user_id,event_id,card_id,reviewed_at,payload)
SELECT '11111111-1111-4111-8111-111111111111', gen_random_uuid(), 'bulk', now(), '{}'::jsonb FROM generate_series(1, 4996);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM public.append_review_events(jsonb_build_array(jsonb_build_object(
    'id','66666666-6666-4666-8666-666666666666','cardId','test-word','sessionId','local-test',
    'quality',2,'source','quiz','durationMs',1000,'scheduled',false,'reviewedAt',extract(epoch FROM now()) * 1000)));
  BEGIN
    PERFORM public.append_review_events(jsonb_build_array(jsonb_build_object(
      'id','77777777-7777-4777-8777-777777777777','cardId','test-word','sessionId','local-test',
      'quality',2,'source','quiz','durationMs',1000,'scheduled',false,'reviewedAt',extract(epoch FROM now()) * 1000)));
    RAISE EXCEPTION 'Daily cap not enforced';
  EXCEPTION WHEN sqlstate '54000' THEN NULL;
  END;
END $$;
RESET ROLE;
DELETE FROM public.user_review_events WHERE card_id = 'bulk';
SET LOCAL ROLE authenticated;
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
