-- Run after 20261122120000. All synthetic fixtures roll back.
begin;

do $$
begin
  assert not has_function_privilege('authenticated', 'private.limit_card_progress_rows()', 'EXECUTE');
  assert not has_function_privilege('anon', 'public.save_profile_card(jsonb,boolean)', 'EXECUTE');
end;
$$;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fe000000-0000-4000-8000-000000000001', 's999999999961@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data)
select u.id, 'limits-test-1', 'google',
  jsonb_build_object('sub', 'limits-test-1', 'email', u.email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users u where u.id = 'fe000000-0000-4000-8000-000000000001';

-- The privacy update is in effect for this test, whatever today's date is.
create or replace function private.social_update_at() returns timestamptz
language sql immutable set search_path = '' as $$ select '2000-01-01'::timestamptz $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'fe000000-0000-4000-8000-000000000001', true);

-- Profile cards: a Google photo stays, any other address is dropped, a long name is cut, the rest is kept.
do $$
declare stored jsonb;
begin
  perform public.save_profile_card('{"n":"Ana","c":"jade","i":"https://lh3.googleusercontent.com/a/abc-DEF_123=s96-c","b":1}', true);
  select card into stored from public.profile_cards where user_id = 'fe000000-0000-4000-8000-000000000001';
  assert stored->>'i' = 'https://lh3.googleusercontent.com/a/abc-DEF_123=s96-c', 'a Google photo is kept';

  perform public.save_profile_card('{"n":"Ana","c":"jade","i":"https://example.com/x.png","b":1,"ia":1}', true);
  select card into stored from public.profile_cards where user_id = 'fe000000-0000-4000-8000-000000000001';
  assert not stored ? 'i', 'any other photo address is dropped';
  assert stored->>'b' = '1' and stored->>'ia' = '1' and stored->>'c' = 'jade', 'the rest of the card is kept';

  perform public.save_profile_card('{"i":"https://lh3.googleusercontent.com/a\" onerror=\"x","n":7}', true);
  select card into stored from public.profile_cards where user_id = 'fe000000-0000-4000-8000-000000000001';
  assert not stored ? 'i' and not stored ? 'n', 'a malformed address or name is dropped';

  perform public.save_profile_card(jsonb_build_object('n', '  ' || repeat('x', 80)), true);
  select card into stored from public.profile_cards where user_id = 'fe000000-0000-4000-8000-000000000001';
  assert char_length(stored->>'n') = 30, 'a name is kept to 30 characters';
end;
$$;

-- Card progress: an oversized scheduler_state is refused; a normal save still works.
do $$
begin
  perform public.upsert_card_progress(jsonb_build_array(jsonb_build_object(
    'card_id', 'limits-ok', 'ease', 2.5, 'interval', 1, 'repetitions', 1, 'next_review_date', now() + interval '1 day', 'reviewed_at', now(),
    'scheduler_state', jsonb_build_object('version', 1, 'state', 2, 'stability', 3, 'difficulty', 5, 'reps', 1, 'lapses', 0, 'learningSteps', 0, 'scheduledDays', 1, 'elapsedDays', 0))));
  assert (select count(*) from public.user_card_progress where card_id = 'limits-ok') = 1;
  begin
    perform public.upsert_card_progress(jsonb_build_array(jsonb_build_object(
      'card_id', 'limits-big', 'ease', 2.5, 'interval', 1, 'repetitions', 1, 'next_review_date', now() + interval '1 day', 'reviewed_at', now(),
      'scheduler_state', jsonb_build_object('version', 1, 'state', 2, 'stability', 3, 'difficulty', 5, 'reps', 1, 'lapses', 0, 'learningSteps', 0, 'scheduledDays', 1, 'elapsedDays', 0,
        'junk', (select string_agg(md5(n::text), '') from generate_series(1, 400) n)))));
    raise exception 'an oversized scheduler_state was stored';
  exception when check_violation then null;
  end;
end;
$$;

-- At most 20,000 cards an account (rows written as the table owner; the learner's next save is refused).
reset role;
insert into public.user_card_progress (user_id, card_id, last_updated)
select 'fe000000-0000-4000-8000-000000000001', 'fill-' || n, now() from generate_series(1, 19999) n;
set local role authenticated;
do $$
begin
  begin
    perform public.upsert_card_progress(jsonb_build_array(jsonb_build_object(
      'card_id', 'limits-over', 'ease', 2.5, 'interval', 1, 'repetitions', 1, 'next_review_date', now() + interval '1 day', 'reviewed_at', now())));
    raise exception 'a card past the account limit was stored';
  exception when sqlstate '54000' then null;
  end;
end;
$$;

-- At most 200 folders an account.
reset role;
insert into public.user_folders (user_id, name, color)
select 'fe000000-0000-4000-8000-000000000001', 'Folder ' || n, 'blue' from generate_series(1, 200) n;
set local role authenticated;
do $$
begin
  begin
    insert into public.user_folders (user_id, name, color) values ('fe000000-0000-4000-8000-000000000001', 'Over', 'blue');
    raise exception 'a folder past the account limit was stored';
  exception when sqlstate '54000' then null;
  end;
end;
$$;

rollback;
