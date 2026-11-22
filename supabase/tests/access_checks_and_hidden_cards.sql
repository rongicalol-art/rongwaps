-- Run after 20261122140000. All synthetic fixtures roll back.
begin;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fd000000-0000-4000-8000-000000000001', 's999999999951@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('fd000000-0000-4000-8000-000000000002', 's999999999952@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data)
select u.id, 'hidden-test-' || right(u.id::text, 1), 'google',
  jsonb_build_object('sub', 'hidden-test-' || right(u.id::text, 1), 'email', u.email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users u where u.id::text like 'fd000000-%';

insert into public.profile_cards (user_id, card, last_seen) values
  ('fd000000-0000-4000-8000-000000000001', '{"n":"Ana","c":"jade"}', now());
insert into public.usernames (user_id, username, findable) values
  ('fd000000-0000-4000-8000-000000000001', 'hidden.test.ana', false);

set local role authenticated;

-- The other learner cannot read a card whose owner turned "Let classmates find me" off; the owner still can.
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'fd000000-0000-4000-8000-000000000002', true);
do $$
begin
  assert (select count(*) from public.profile_cards where user_id = 'fd000000-0000-4000-8000-000000000001') = 0, 'a hidden card is not readable by others';
  -- A learned mark with no schedule is stored as a learned-only row.
  perform public.upsert_card_progress('[{"card_id":"hidden-test-card","learned_at":"2026-11-01T00:00:00Z"}]');
  assert (select learned_at is not null and next_review_date is null from public.user_card_progress
          where user_id = 'fd000000-0000-4000-8000-000000000002' and card_id = 'hidden-test-card'), 'a learned-only record is saved';
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'fd000000-0000-4000-8000-000000000001', true);
do $$ begin assert (select count(*) from public.profile_cards where user_id = 'fd000000-0000-4000-8000-000000000001') = 1, 'the owner reads their own card'; end; $$;

-- Friends (both added each other) still see it; one add alone is not enough.
reset role;
insert into public.friend_adds (adder, added) values ('fd000000-0000-4000-8000-000000000002', 'fd000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'fd000000-0000-4000-8000-000000000002', true);
do $$ begin assert (select count(*) from public.profile_cards where user_id = 'fd000000-0000-4000-8000-000000000001') = 0, 'a request alone does not show the card'; end; $$;
reset role;
insert into public.friend_adds (adder, added) values ('fd000000-0000-4000-8000-000000000001', 'fd000000-0000-4000-8000-000000000002');
set local role authenticated;
do $$ begin assert (select count(*) from public.profile_cards where user_id = 'fd000000-0000-4000-8000-000000000001') = 1, 'a friend sees the card'; end; $$;

-- Findable again: everyone with access sees it.
reset role;
delete from public.friend_adds where adder::text like 'fd000000-%';
update public.usernames set findable = true where user_id = 'fd000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin assert (select count(*) from public.profile_cards where user_id = 'fd000000-0000-4000-8000-000000000001') = 1, 'a findable card is readable'; end; $$;

-- The write functions refuse an account without access, with no help from the request check.
reset role;
insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fd000000-0000-4000-8000-000000000003', 'hidden-test-outsider@example.com', now(), '{"provider":"email"}', '{}');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'fd000000-0000-4000-8000-000000000003', true);
do $$
begin
  if private.has_school_beta_access() then raise notice 'outsider has access in this setup; refusal not exercised'; return; end if;
  begin
    perform public.upsert_card_progress('[]');
    assert false, 'upsert_card_progress must refuse';
  exception when insufficient_privilege then null; end;
  begin
    perform public.reset_user_learning_progress();
    assert false, 'reset_user_learning_progress must refuse';
  exception when insufficient_privilege then null; end;
end;
$$;

rollback;
