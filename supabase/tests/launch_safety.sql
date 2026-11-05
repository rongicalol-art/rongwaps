-- Run after 20261106120000. All synthetic fixtures roll back.
-- supabase db query --file supabase/tests/launch_safety.sql   (local or staging)
begin;

do $$
begin
  assert not has_table_privilege('authenticated', 'public.user_review_events', 'INSERT'), 'history is written only by append_review_events';
  assert not has_table_privilege('authenticated', 'private.banned_identities', 'SELECT');
  assert has_table_privilege('supabase_auth_admin', 'private.banned_identities', 'SELECT');
  assert has_function_privilege('supabase_auth_admin', 'private.identity_banned(text,text)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'private.delete_unconfirmed_accounts()', 'EXECUTE');
  assert has_function_privilege('authenticated', 'public.submit_report(uuid,text,text,text,bigint,text,text)', 'EXECUTE');
  assert not has_function_privilege('anon', 'public.submit_report(uuid,text,text,text,bigint,text,text)', 'EXECUTE');
  assert (select file_size_limit from storage.buckets where id = 'profile-media') = 2097152;
  assert (select count(*) from cron.job where jobname in ('delete-unconfirmed-accounts', 'delete-expired-ban-codes')) = 2;
end;
$$;

-- s = school, g = public Gmail (age answered), n = public Gmail that never answered, r = a recent one.
insert into auth.users (id, email, email_confirmed_at, created_at, raw_app_meta_data, raw_user_meta_data) values
  ('5a000000-0000-4000-8000-000000000001', 's999999999981@stu.edu.tw', now(), now() - interval '30 days', '{"provider":"google"}', '{}'),
  ('5a000000-0000-4000-8000-000000000002', 'safety-test-g@example.invalid', now(), now() - interval '30 days', '{"provider":"google"}', '{}'),
  ('5a000000-0000-4000-8000-000000000003', 'safety-test-n@example.invalid', now(), now() - interval '8 days', '{"provider":"google"}', '{}'),
  ('5a000000-0000-4000-8000-000000000004', 'safety-test-r@example.invalid', now(), now() - interval '2 days', '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data) values
  ('5a000000-0000-4000-8000-000000000001', 'safety-sub-s', 'google',
   '{"sub":"safety-sub-s","email":"s999999999981@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}'),
  ('5a000000-0000-4000-8000-000000000002', 'safety-sub-g', 'google', '{"sub":"safety-sub-g","email":"safety-test-g@example.invalid","email_verified":true}'),
  ('5a000000-0000-4000-8000-000000000003', 'safety-sub-n', 'google', '{"sub":"safety-sub-n","email":"safety-test-n@example.invalid","email_verified":true}'),
  ('5a000000-0000-4000-8000-000000000004', 'safety-sub-r', 'google', '{"sub":"safety-sub-r","email":"safety-test-r@example.invalid","email_verified":true}');
insert into private.account_flags (user_id, age_confirmed_at) values ('5a000000-0000-4000-8000-000000000002', now() - interval '29 days');
update private.signup_settings set public_open = true;

-- 4. Only public accounts older than 7 days that never answered the age step go.
do $$
declare gone integer;
begin
  gone := private.delete_unconfirmed_accounts();
  assert not exists (select 1 from auth.users where id = '5a000000-0000-4000-8000-000000000003'), 'unanswered after 8 days deleted';
  assert exists (select 1 from auth.users where id = '5a000000-0000-4000-8000-000000000001'), 'school account kept';
  assert exists (select 1 from auth.users where id = '5a000000-0000-4000-8000-000000000002'), 'answered account kept';
  assert exists (select 1 from auth.users where id = '5a000000-0000-4000-8000-000000000004'), 'recent account kept';
end;
$$;

-- 3. A ban keeps a one-way code; deleting the account doesn't free the Google account; unban frees it.
insert into private.account_flags (user_id, banned_at, banned_reason) values ('5a000000-0000-4000-8000-000000000004', now(), 'test')
  on conflict (user_id) do update set banned_at = now();
do $$
declare
  again jsonb := '{"user":{"email":"safety-test-r@example.invalid","app_metadata":{"provider":"google"},"user_metadata":{"email_verified":true,"sub":"safety-sub-r","provider_id":"safety-sub-r"}}}';
  other jsonb := '{"user":{"email":"safety-test-x@example.invalid","app_metadata":{"provider":"google"},"user_metadata":{"email_verified":true,"sub":"safety-sub-x"}}}';
begin
  assert private.identity_banned('google', 'safety-sub-r');
  assert (select code from private.banned_identities) !~ 'safety', 'only a hash is stored';
  assert private.school_beta_access_token_hook(jsonb_build_object('user_id', '5a000000-0000-4000-8000-000000000004', 'claims', '{}'::jsonb))
    #>> '{error,message}' like 'account_blocked:%';
  delete from auth.users where id = '5a000000-0000-4000-8000-000000000004';
  assert private.identity_banned('google', 'safety-sub-r'), 'code outlives the account';
  assert private.before_school_beta_signup(again) #>> '{error,message}' like 'account_blocked:%', 'same Google account cannot sign up again';
  assert private.before_school_beta_signup(other) = '{}'::jsonb, 'other Gmail accounts can';
end;
$$;
insert into private.account_flags (user_id, banned_at, banned_reason) values ('5a000000-0000-4000-8000-000000000002', now(), 'test')
  on conflict (user_id) do update set banned_at = now();
update private.account_flags set banned_at = null where user_id = '5a000000-0000-4000-8000-000000000002';
do $$
begin
  assert not private.identity_banned('google', 'safety-sub-g'), 'unban frees the Google account';
  update private.banned_identities set keep_until = now() - interval '1 second';
  assert private.delete_expired_ban_codes() >= 1;
  assert not private.identity_banned('google', 'safety-sub-r'), 'codes expire after 2 years';
end;
$$;

-- 5. Reports keep the line's ID, the name and the photo without its signed query string.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"5a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '5a000000-0000-4000-8000-000000000001', true);
do $$
declare id bigint;
begin
  id := public.submit_report('5a000000-0000-4000-8000-000000000002', 'unsafe', 'chat', 'bad line', 42, 'Gee',
    'https://x.supabase.co/storage/v1/object/sign/profile-media/u/avatar.webp?token=secret');
  assert id > 0;
end;
$$;
reset role;
do $$
begin
  assert (select message_id from private.user_reports order by id desc limit 1) = 42;
  assert (select target_name from private.user_reports order by id desc limit 1) = 'Gee';
  assert (select target_photo from private.user_reports order by id desc limit 1) = 'https://x.supabase.co/storage/v1/object/sign/profile-media/u/avatar.webp';
end;
$$;

-- 2. Photos: only the two fixed names, only with access and an answered age step.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"5a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '5a000000-0000-4000-8000-000000000001', true);
insert into storage.objects (bucket_id, name, owner) values ('profile-media', '5a000000-0000-4000-8000-000000000001/avatar.webp', '5a000000-0000-4000-8000-000000000001');
do $$
begin
  insert into storage.objects (bucket_id, name, owner) values ('profile-media', '5a000000-0000-4000-8000-000000000001/extra-1.webp', '5a000000-0000-4000-8000-000000000001');
  raise exception 'any file name accepted';
exception when insufficient_privilege then null;
end;
$$;
reset role;

rollback;
