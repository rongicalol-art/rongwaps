-- Run after 20261119170000. All synthetic fixtures roll back.
-- supabase db query --file supabase/tests/friends_and_messages.sql   (local or staging)
begin;

do $$
begin
  assert not has_table_privilege('anon', 'public.friend_adds', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.friend_adds', 'INSERT'), 'friends are added only through add_friend';
  assert not has_table_privilege('authenticated', 'public.friend_adds', 'DELETE'), 'friends are removed only through remove_friend';
  assert not has_table_privilege('authenticated', 'public.direct_messages', 'INSERT'), 'messages go through send_direct_message';
  assert not has_table_privilege('authenticated', 'public.direct_messages', 'UPDATE');
  assert not has_table_privilege('authenticated', 'public.direct_messages', 'DELETE');
  assert not has_table_privilege('authenticated', 'public.direct_reads', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.profile_cards', 'INSERT');
  assert not has_table_privilege('anon', 'public.profile_cards', 'SELECT');
  assert not has_function_privilege('anon', 'public.send_direct_message(uuid,text)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'private.apart(uuid,uuid)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'private.friends(uuid,uuid)', 'EXECUTE');
  assert has_function_privilege('authenticated', 'public.add_friend(uuid)', 'EXECUTE');
  assert (select relrowsecurity from pg_class where oid = 'public.friend_adds'::regclass);
  assert (select relrowsecurity from pg_class where oid = 'public.direct_messages'::regclass);
  assert (select relrowsecurity from pg_class where oid = 'public.direct_reads'::regclass);
  assert (select relrowsecurity from pg_class where oid = 'public.profile_cards'::regclass);
end;
$$;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fd000000-0000-4000-8000-000000000001', 's999999999971@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('fd000000-0000-4000-8000-000000000002', 's999999999972@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('fd000000-0000-4000-8000-000000000003', 's999999999973@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data)
select u.id, 'friends-test-' || right(u.id::text, 1), 'google',
  jsonb_build_object('sub', 'friends-test-' || right(u.id::text, 1), 'email', u.email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users u where u.id::text like 'fd000000-%';

update public.user_profiles set settings = coalesce(settings, '{}') || '{"displayName":"Ana","avatarColor":"jade"}' where id = 'fd000000-0000-4000-8000-000000000001';
insert into public.user_profiles (id, settings) select 'fd000000-0000-4000-8000-000000000001', '{"displayName":"Ana","avatarColor":"jade"}'
where not exists (select 1 from public.user_profiles where id = 'fd000000-0000-4000-8000-000000000001');

-- Before the privacy update takes effect nothing can be stored (the real date may already have passed).
create or replace function private.social_update_at() returns timestamptz
language sql immutable set search_path = '' as $$ select timestamptz '2999-01-01 00:00:00+00' $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  begin
    perform public.add_friend('fd000000-0000-4000-8000-000000000002');
    raise exception 'add_friend worked before the privacy update';
  exception when object_not_in_prerequisite_state then null;
  end;
  begin
    perform public.save_profile_card('{"b":1}', true);
    raise exception 'save_profile_card worked before the privacy update';
  exception when object_not_in_prerequisite_state then null;
  end;
end;
$$;
reset role;
create or replace function private.social_update_at() returns timestamptz
language sql immutable set search_path = '' as $$ select timestamptz '2000-01-01 00:00:00+00' $$;

-- 1 adds 2: a request; 2 sees it and adds back: friends. 3 sees none of it.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  assert public.add_friend('fd000000-0000-4000-8000-000000000002') = 'requested';
  assert public.add_friend('fd000000-0000-4000-8000-000000000002') = 'requested', 'adding twice is a no-op';
  begin
    perform public.add_friend('fd000000-0000-4000-8000-000000000001');
    raise exception 'self-add unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.send_direct_message('fd000000-0000-4000-8000-000000000002', 'hi');
    raise exception 'a request alone allowed a message';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  assert (select count(*) from public.friend_adds where added = 'fd000000-0000-4000-8000-000000000002') = 1, 'the request is visible to its target';
  assert (select added_me and not i_added and name = 'Ana' from public.friend_people()), 'a request shows who sent it';
  assert public.add_friend('fd000000-0000-4000-8000-000000000001') = 'friends';
  assert (select added_me and i_added from public.friend_people());
end;
$$;

-- Messages: friends only, cleaned, one a second; the other person reads them and its count clears.
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare
  sent public.direct_messages;
begin
  sent := public.send_direct_message('fd000000-0000-4000-8000-000000000002', E'  明天\n一起考試嗎？‮ ');
  assert sent.body = '明天 一起考試嗎？', format('cleaned body was %L', sent.body);
  begin
    perform public.send_direct_message('fd000000-0000-4000-8000-000000000002', 'again');
    raise exception 'second message within a second was accepted';
  exception when program_limit_exceeded then null;
  end;
  begin
    perform public.send_direct_message('fd000000-0000-4000-8000-000000000003', 'hi');
    raise exception 'messaged a non-friend';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
declare
  inbox record;
begin
  select * into inbox from public.direct_inbox();
  assert inbox.other = 'fd000000-0000-4000-8000-000000000001' and inbox.unread = 1 and inbox.last_body = '明天 一起考試嗎？';
  perform public.mark_direct_read('fd000000-0000-4000-8000-000000000001', inbox.last_id);
  perform public.mark_direct_read('fd000000-0000-4000-8000-000000000001', 1);
  assert (select unread from public.direct_inbox()) = 0, 'the read spot only moves forward';
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$
begin
  assert (select count(*) from public.direct_messages) = 0, 'outsiders read nothing';
  assert (select count(*) from public.friend_adds) = 0;
  assert not exists (select 1 from public.direct_inbox());
end;
$$;

-- The newest 500 per pair are kept.
reset role;
insert into public.direct_messages (sender, recipient, body, created_at)
select 'fd000000-0000-4000-8000-000000000002', 'fd000000-0000-4000-8000-000000000001', 'line ' || n, now() - interval '1 hour'
from generate_series(1, 520) n;
update public.direct_messages set created_at = now() - interval '1 hour' where sender = 'fd000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  perform public.send_direct_message('fd000000-0000-4000-8000-000000000002', 'newest');
  assert (select count(*) from public.direct_messages) = 500, format('kept %s', (select count(*) from public.direct_messages));
  assert exists (select 1 from public.direct_messages where body = 'newest');
end;
$$;

-- Offline profiles: anyone signed in sees a shared card; both switches off removes it.
do $$
begin
  perform public.save_profile_card('{"n":"One","c":"jade","b":1,"w":120,"st":4,"cv":"clay"}', true);
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$
begin
  assert (select card->>'n' from public.profile_cards where user_id = 'fd000000-0000-4000-8000-000000000001') = 'One';
  assert (select last_seen from public.profile_cards where user_id = 'fd000000-0000-4000-8000-000000000001') is not null;
end;
$$;

-- A report from the conversation keeps a copy of it.
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.submit_report('fd000000-0000-4000-8000-000000000001', 'rude', 'message', 'newest');
reset role;
do $$
begin
  assert jsonb_array_length((select conversation from private.user_reports where reporter = 'fd000000-0000-4000-8000-000000000002' order by id desc limit 1)) = 50;
end;
$$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

-- Blocking ends the friendship and hides the conversation and the card both ways.
do $$
begin
  assert public.block_user('fd000000-0000-4000-8000-000000000001', 'One', 'jade');
  assert (select count(*) from public.direct_messages) = 0, 'the blocker no longer sees the messages';
  assert (select count(*) from public.profile_cards where user_id = 'fd000000-0000-4000-8000-000000000001') = 0;
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  assert (select count(*) from public.friend_adds) = 0, 'the friendship ended both ways';
  assert (select count(*) from public.direct_messages) = 0;
  begin
    perform public.add_friend('fd000000-0000-4000-8000-000000000002');
    raise exception 'added someone who blocked you';
  exception when invalid_parameter_value then null;
  end;
  assert (select (public.export_my_data()) ?& array['friend_adds', 'direct_messages', 'direct_reads', 'profile_card']);
  perform public.save_profile_card(null, false);
  assert not exists (select 1 from public.profile_cards where user_id = 'fd000000-0000-4000-8000-000000000001'), 'both switches off removes the card';
end;
$$;

-- Deleting an account removes its friends, messages, read spots and card.
reset role;
delete from auth.users where id = 'fd000000-0000-4000-8000-000000000001';
do $$
begin
  assert not exists (select 1 from public.direct_messages where sender = 'fd000000-0000-4000-8000-000000000001' or recipient = 'fd000000-0000-4000-8000-000000000001');
  assert not exists (select 1 from public.direct_reads where other = 'fd000000-0000-4000-8000-000000000001');
end;
$$;

rollback;
