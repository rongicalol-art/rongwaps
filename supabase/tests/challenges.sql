-- Run after 20261123120000. All synthetic fixtures roll back.
-- supabase db query --file supabase/tests/challenges.sql   (local or staging)
begin;

do $$
begin
  assert not has_table_privilege('anon', 'public.challenges', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.challenges', 'SELECT'), 'challenges are read only through challenge_card';
  assert not has_table_privilege('authenticated', 'public.challenges', 'INSERT'), 'challenges are made only through create_challenge';
  assert not has_table_privilege('authenticated', 'public.challenges', 'UPDATE');
  assert not has_table_privilege('authenticated', 'public.challenges', 'DELETE');
  assert not has_function_privilege('anon', 'public.challenge_card(text)', 'EXECUTE'), 'signed out, nobody learns who sent a link';
  assert not has_function_privilege('anon', 'public.create_challenge(text,jsonb,integer,integer,integer[])', 'EXECUTE');
  assert not has_function_privilege('anon', 'public.accept_challenge_friend(text)', 'EXECUTE');
  assert has_function_privilege('authenticated', 'public.accept_challenge_friend(text)', 'EXECUTE');
  assert (select relrowsecurity from pg_class where oid = 'public.challenges'::regclass);
  assert exists (select 1 from cron.job where jobname = 'delete-expired-challenges');
end;
$$;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fc000000-0000-4000-8000-000000000001', 's999999999961@stu.edu.tw', now(), '{"provider":"google"}', '{"full_name":"Mia Lin"}'),
  ('fc000000-0000-4000-8000-000000000002', 's999999999962@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('fc000000-0000-4000-8000-000000000003', 's999999999963@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data)
select u.id, 'challenge-test-' || right(u.id::text, 1), 'google',
  jsonb_build_object('sub', 'challenge-test-' || right(u.id::text, 1), 'email', u.email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users u where u.id::text like 'fc000000-%';
insert into public.user_profiles (id, settings) values ('fc000000-0000-4000-8000-000000000003', '{"displayName":"Leo","avatarColor":"plum"}')
on conflict (id) do update set settings = coalesce(public.user_profiles.settings, '{}') || excluded.settings;
create or replace function private.social_update_at() returns timestamptz
language sql immutable set search_path = '' as $$ select timestamptz '2000-01-01 00:00:00+00' $$;

-- 1 shares a run; bad runs are refused; the name comes from the account, not the request.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  perform public.create_challenge('MXAAAAA2', '{"book":1,"lessons":{"5":[1,2,3]},"types":[]}', 2, 3, array[1200, 2500, 4100]);
  begin
    perform public.create_challenge('MXAAAAA3', '{"book":1}', 2, 3, array[1200, 900, 4100]);
    raise exception 'a run that goes back in time was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.create_challenge('MXAAAAA4', '{"book":1}', 2, 3, array[1200, 2500]);
    raise exception 'a run without one mark per word was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.create_challenge('mxaaaaa5', '{"book":1}', 1, 1, array[100]);
    raise exception 'a lowercase code was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.create_challenge('MXAAAAA6', '{"book":1}', 4, 3, array[1, 2, 3]);
    raise exception 'more right answers than words was accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;
do $$
begin
  assert (select sender_name = 'Mia' and sender_color = 'blue' from public.challenges where code = 'MXAAAAA2'),
    'without a profile name the first word of the Google name is shown';
end;
$$;

-- A classmate sees the card, never the account; a wrong or expired code shows nothing.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
declare
  card jsonb := public.challenge_card('MXAAAAA2');
begin
  assert card ->> 'name' = 'Mia' and (card ->> 'total')::int = 3 and card -> 'run' = '[1200, 2500, 4100]'::jsonb;
  assert not (card ->> 'mine')::boolean and not (card ->> 'friends')::boolean;
  assert not card ? 'sender', 'the sender''s account id is never shown';
  assert public.challenge_card('NAPENAPE') is null;
end;
$$;
reset role;

-- The sender sees it as theirs and can't befriend themselves.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  assert (public.challenge_card('MXAAAAA2') ->> 'mine')::boolean;
  begin
    perform public.accept_challenge_friend('MXAAAAA2');
    raise exception 'befriended yourself';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- 2 taps Add friend once: both are friends at once.
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  assert public.accept_challenge_friend('MXAAAAA2') = 'friends';
  assert public.accept_challenge_friend('MXAAAAA2') = 'friends', 'a second tap changes nothing';
  assert (public.challenge_card('MXAAAAA2') ->> 'friends')::boolean;
end;
$$;
reset role;
do $$
begin
  assert (select friend_adds from public.challenges where code = 'MXAAAAA2') = 1, 'the second tap made no new friend';
  assert (select count(*) from public.friend_adds where adder in ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-000000000002')) = 2;
end;
$$;

-- A blocked pair sees nothing of each other's challenge.
insert into public.user_blocks (blocker, blocked) values ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$
begin
  assert public.challenge_card('MXAAAAA2') is null, 'blocked people don''t see the challenge';
  begin
    perform public.accept_challenge_friend('MXAAAAA2');
    raise exception 'a blocked person became a friend';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;
delete from public.user_blocks where blocker = 'fc000000-0000-4000-8000-000000000001';

-- A link forwarded widely: after 30 friends from it, Add friend is an ordinary request.
update public.challenges set friend_adds = 30 where code = 'MXAAAAA2';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$
begin
  assert public.accept_challenge_friend('MXAAAAA2') = 'requested';
  assert not (public.challenge_card('MXAAAAA2') ->> 'friends')::boolean;
end;
$$;
reset role;

-- Expired: gone for everyone; Download my data lists the sender's challenges without the account id.
update public.challenges set expires_at = now() - interval '1 minute' where code = 'MXAAAAA2';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  assert public.challenge_card('MXAAAAA2') is null;
  begin
    perform public.accept_challenge_friend('MXAAAAA2');
    raise exception 'an expired challenge added a friend';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare
  exported jsonb := public.export_my_data();
begin
  assert jsonb_array_length(exported -> 'challenges') = 1 and exported -> 'challenges' -> 0 ->> 'code' = 'MXAAAAA2';
  assert not (exported -> 'challenges' -> 0) ? 'sender';
end;
$$;
reset role;

-- The sender's account goes: so do their challenges.
delete from auth.users where id = 'fc000000-0000-4000-8000-000000000001';
do $$ begin assert not exists (select 1 from public.challenges where code = 'MXAAAAA2'); end; $$;

rollback;
