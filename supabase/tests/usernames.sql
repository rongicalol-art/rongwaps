-- Run after 20261121130000. All synthetic fixtures roll back.
-- supabase db query --file supabase/tests/usernames.sql   (local or staging)
begin;

do $$
begin
  assert not has_table_privilege('anon', 'public.usernames', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.usernames', 'INSERT'), 'usernames change only through the functions';
  assert not has_table_privilege('authenticated', 'public.usernames', 'UPDATE');
  assert not has_table_privilege('authenticated', 'private.username_holds', 'SELECT');
  assert not has_function_privilege('anon', 'public.find_classmates(text)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'private.username_free(text,uuid)', 'EXECUTE');
  assert (select relrowsecurity from pg_class where oid = 'public.usernames'::regclass);
end;
$$;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fe000000-0000-4000-8000-000000000001', 's999999999981@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('fe000000-0000-4000-8000-000000000002', 's999999999982@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('fe000000-0000-4000-8000-000000000003', 's999999999983@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data)
select u.id, 'usernames-test-' || right(u.id::text, 1), 'google',
  jsonb_build_object('sub', 'usernames-test-' || right(u.id::text, 1), 'email', u.email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users u where u.id::text like 'fe000000-%';
create or replace function private.social_update_at() returns timestamptz
language sql immutable set search_path = '' as $$ select timestamptz '2000-01-01 00:00:00+00' $$;

-- Automatic names: cleaned, numbered when taken, and the same on a second ask.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  assert public.claim_username('Kai..Lin!') = 'kai.lin', 'cleaned';
  assert public.claim_username('someone.else') = 'kai.lin', 'a second claim keeps the first';
  perform public.save_profile_card('{"n":"Kai Lin","c":"jade"}', true);
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  assert public.claim_username('kai.lin') = 'kai.lin2', 'taken names get a number';
  perform public.save_profile_card('{"n":"Mei","c":"plum"}', true);
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$
begin
  assert public.claim_username('陳') = 'learner', 'too short or not Latin falls back';
  -- The automatic name can change at once; after that, once a week.
  begin
    perform public.set_username('kai.lin');
    raise exception 'took a name that is in use';
  exception when unique_violation then null;
  end;
  begin
    perform public.set_username('a..b');
    raise exception 'accepted a bad format';
  exception when invalid_parameter_value then null;
  end;
  assert public.set_username('@Ana_01') = 'ana_01';
  begin
    perform public.set_username('ana_02');
    raise exception 'changed twice in a week';
  exception when program_limit_exceeded then null;
  end;
  perform public.save_profile_card('{"n":"Ana","c":"blue"}', true);
end;
$$;

-- A given-up name is held for its owner for 7 days.
reset role;
update public.usernames set chosen_at = now() - interval '8 days' where user_id = 'fe000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin assert public.set_username('ana.chen') = 'ana.chen'; end; $$;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  begin
    perform public.set_username('ana_01');
    raise exception 'took a held name';
  exception when unique_violation then null;
  end;
end;
$$;

-- Search: a name or any part of a @username, the exact one first; not yourself.
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  assert (select array_agg(username order by username) from public.find_classmates('ana')) = array['ana.chen'], 'name or username part';
  assert (select username from public.find_classmates('@KAI.LIN2') limit 1) = 'kai.lin2', 'exact @username';
  assert not exists (select 1 from public.find_classmates('kai') where username = 'kai.lin'), 'never yourself';
  assert not exists (select 1 from public.find_classmates('%')), 'LIKE characters are plain text';
  assert not exists (select 1 from public.find_classmates('')), 'nothing for an empty search';
end;
$$;

-- With both Show switches off (no saved profile) the @username is hidden too.
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin perform public.save_profile_card(null, false); end; $$;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$
begin
  assert not exists (select 1 from public.usernames where username = 'kai.lin'), 'no saved profile, no @username';
  assert not exists (select 1 from public.find_classmates('kai.lin') where username = 'kai.lin');
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin perform public.save_profile_card('{"n":"Kai Lin","c":"jade"}', true); end; $$;

-- "Let classmates find me" off hides the @username and the search result; blocking hides both ways.
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  perform public.set_findable(false);
  assert (select findable from public.usernames where user_id = 'fe000000-0000-4000-8000-000000000002') = false, 'you still see your own';
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  assert not exists (select 1 from public.find_classmates('mei'));
  assert not exists (select 1 from public.usernames where user_id = 'fe000000-0000-4000-8000-000000000002');
  assert exists (select 1 from public.usernames where user_id = 'fe000000-0000-4000-8000-000000000003'), 'findable with a saved profile';
  assert public.block_user('fe000000-0000-4000-8000-000000000003', 'Ana', 'blue');
  assert not exists (select 1 from public.find_classmates('ana'));
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fe000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$
begin
  assert not exists (select 1 from public.find_classmates('kai.lin')), 'blocked both ways';
  assert (select public.export_my_data()->'username'->>'username') = 'ana.chen';
end;
$$;

-- Deleting the account frees its @username after its hold goes with it.
reset role;
delete from auth.users where id = 'fe000000-0000-4000-8000-000000000003';
do $$
begin
  assert not exists (select 1 from public.usernames where username = 'ana.chen');
  assert not exists (select 1 from private.username_holds where username = 'ana_01');
end;
$$;

rollback;
