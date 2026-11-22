-- Run after 20261122130000. All synthetic fixtures roll back.
begin;
insert into auth.users (id, email, email_confirmed_at) values ('fc000000-0000-4000-8000-000000000001', 's999999999951@stu.edu.tw', now());
insert into auth.identities (user_id, provider_id, provider, identity_data)
select id, 'recent-test-1', 'google', jsonb_build_object('sub', 'recent-test-1', 'email', email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users where id = 'fc000000-0000-4000-8000-000000000001';

-- 10 old answers on 5 days (two a day, about 200 days ago) and 3 recent ones, written as the table owner.
insert into public.user_review_events (user_id, event_id, card_id, reviewed_at, payload)
select 'fc000000-0000-4000-8000-000000000001', gen_random_uuid(), 'old-' || n,
  date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - make_interval(days => 200 + (n / 2)) + make_interval(hours => 2 + 10 * (n % 2)),
  jsonb_build_object('cardId', 'old-' || n, 'quality', 4)
from generate_series(0, 9) n;
insert into public.user_review_events (user_id, event_id, card_id, reviewed_at, payload)
select 'fc000000-0000-4000-8000-000000000001', gen_random_uuid(), 'new-' || n, now() - make_interval(days => n), jsonb_build_object('cardId', 'new-' || n, 'quality', 4)
from generate_series(1, 3) n;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'fc000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare old_way jsonb; trimmed jsonb; incremental jsonb;
begin
  assert not has_function_privilege('anon', 'public.get_sync_state_recent(timestamptz,integer)', 'EXECUTE');

  -- The previous app's call: everything, and no summary.
  old_way := public.get_sync_state();
  assert jsonb_array_length(old_way->'review_events') = 13, 'the previous app still gets every answer';
  assert not old_way ? 'older_reviews';

  -- The current app's full pull: recent answers one by one, the rest summarised.
  trimmed := public.get_sync_state_recent(null, 125);
  assert jsonb_array_length(trimmed->'review_events') = 3, format('recent answers: %s', jsonb_array_length(trimmed->'review_events'));
  assert (trimmed->'older_reviews'->>'count')::int = 10;
  assert jsonb_array_length(trimmed->'older_reviews'->'times') = 10, 'the first and last time of each of the 5 days';
  assert (trimmed->'older_reviews'->>'first_at')::numeric = (select min((t)::numeric) from jsonb_array_elements_text(trimmed->'older_reviews'->'times') t);
  assert trimmed->>'cursor' = old_way->>'cursor', 'the cursor still covers every answer';

  -- An incremental pull is never trimmed or summarised.
  incremental := public.get_sync_state_recent(now() - interval '1 hour', 125);
  assert not incremental ? 'older_reviews';
end;
$$;
rollback;
