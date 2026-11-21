-- Run after 20261121140000. All synthetic fixtures roll back.
begin;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fc000000-0000-4000-8000-000000000001', 's999999999991@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('fc000000-0000-4000-8000-000000000002', 's999999999992@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data)
select u.id, 'media-test-' || right(u.id::text, 1), 'google',
  jsonb_build_object('sub', 'media-test-' || right(u.id::text, 1), 'email', u.email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users u where u.id::text like 'fc000000-%';
create or replace function private.social_update_at() returns timestamptz
language sql immutable set search_path = '' as $$ select timestamptz '2000-01-01 00:00:00+00' $$;
insert into storage.objects (bucket_id, name, owner) values
  ('profile-media', 'fc000000-0000-4000-8000-000000000001/avatar.webp', 'fc000000-0000-4000-8000-000000000001'),
  ('profile-media', 'fc000000-0000-4000-8000-000000000001/cover.webp', 'fc000000-0000-4000-8000-000000000001');

set local role authenticated;
-- No saved profile: nothing to see.
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin assert (select count(*) from storage.objects where bucket_id = 'profile-media') = 0, 'private until shared'; end; $$;

-- Show me online only (no full card): the photo, not the cover.
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin perform public.save_profile_card('{"n":"Kai","c":"jade","ia":1}', true); end; $$;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  assert (select array_agg(storage.filename(name)) from storage.objects where bucket_id = 'profile-media') = array['avatar.webp'], 'photo only';
end;
$$;

-- Show my profile on: photo and cover.
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin perform public.save_profile_card('{"n":"Kai","c":"jade","ia":1,"ca":1,"cv":"clay","b":1,"w":3,"st":1}', true); end; $$;
select set_config('request.jwt.claims', '{"sub":"fc000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin assert (select count(*) from storage.objects where bucket_id = 'profile-media') = 2, 'photo and cover'; end; $$;

-- Blocking hides both.
do $$
begin
  assert public.block_user('fc000000-0000-4000-8000-000000000001', 'Kai', 'jade');
  assert (select count(*) from storage.objects where bucket_id = 'profile-media') = 0, 'blocked';
end;
$$;

rollback;
