-- Run after 20261122150000. All synthetic fixtures roll back.
begin;

do $$
begin
  assert not has_function_privilege('authenticated', 'private.roll_up_old_reviews(integer,integer)', 'EXECUTE');
  assert not has_table_privilege('authenticated', 'public.user_review_days', 'INSERT');
end;
$$;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fc000000-0000-4000-8000-000000000001', 's999999999941@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data)
select u.id, 'days-test-1', 'google',
  jsonb_build_object('sub', 'days-test-1', 'email', u.email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users u where u.id = 'fc000000-0000-4000-8000-000000000001';

-- Three old answers on one day, one old answer that only just arrived, one recent answer.
insert into public.user_review_events (user_id, event_id, card_id, reviewed_at, created_at, payload) values
  ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-0000000000a1', 'c1', '2025-01-10 01:00+00', '2025-01-10 01:00+00', '{}'),
  ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-0000000000a2', 'c2', '2025-01-10 09:00+00', '2025-01-10 09:00+00', '{}'),
  ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-0000000000a3', 'c3', '2025-01-10 23:00+00', '2025-01-10 23:00+00', '{}'),
  ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-0000000000a4', 'c4', '2025-01-11 05:00+00', now(), '{}'),
  ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-0000000000a5', 'c5', now() - interval '1 day', now() - interval '1 day', '{}');

do $$
declare day record;
begin
  perform private.roll_up_old_reviews();
  assert (select count(*) from public.user_review_events where user_id = 'fc000000-0000-4000-8000-000000000001') = 2,
    'only answers old in both review time and arrival are removed';
  select * into day from public.user_review_days where user_id = 'fc000000-0000-4000-8000-000000000001';
  assert day.day = date '2025-01-10' and day.count = 3, 'one row for the day, counting its answers';
  assert day.first_at = '2025-01-10 01:00+00' and day.last_at = '2025-01-10 23:00+00', 'first and last time are kept';

  -- A later answer for the same day adds to the row instead of replacing it.
  insert into public.user_review_events (user_id, event_id, card_id, reviewed_at, created_at, payload) values
    ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-0000000000a6', 'c6', '2025-01-10 00:30+00', '2025-01-10 00:30+00', '{}');
  perform private.roll_up_old_reviews();
  select * into day from public.user_review_days where user_id = 'fc000000-0000-4000-8000-000000000001';
  assert day.count = 4 and day.first_at = '2025-01-10 00:30+00', 'the day row grows';

  -- A short limit cannot cut into the days the app still pulls as single answers.
  perform private.roll_up_old_reviews(1);
  assert exists (select 1 from public.user_review_events where event_id = 'fc000000-0000-4000-8000-0000000000a5'), 'recent answers stay';
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'fc000000-0000-4000-8000-000000000001', true);

do $$
declare state jsonb; older jsonb;
begin
  state := public.get_sync_state_recent(null, 125);
  older := state->'older_reviews';
  -- Four rolled up, plus the old answer that arrived late and is still a single row.
  assert (older->>'count')::int = 5, 'the summary counts rolled-up days and old single answers: ' || older::text;
  assert (older->>'first_at')::bigint = floor(extract(epoch from timestamptz '2025-01-10 00:30+00') * 1000), 'first answer time survives';
  assert jsonb_array_length(older->'times') = 3, 'first and last time of the rolled day, and the late answer';
  assert jsonb_array_length(state->'review_events') = 1, 'recent answers still come one by one';
  assert (public.export_my_data()->'review_days'->0->>'count')::int = 4, 'the export includes the day rows';

  perform public.reset_user_learning_progress();
  assert (select count(*) from public.user_review_days) = 0, 'a reset clears the day rows';
end;
$$;

rollback;
