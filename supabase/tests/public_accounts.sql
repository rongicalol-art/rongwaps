-- Run after 20261104120000. All synthetic fixtures roll back.
-- supabase db query --file supabase/tests/public_accounts.sql   (local or staging)
begin;

do $$
begin
  assert not has_table_privilege('anon', 'private.signup_settings', 'SELECT');
  assert not has_table_privilege('authenticated', 'private.signup_settings', 'SELECT');
  assert not has_table_privilege('authenticated', 'private.account_flags', 'SELECT');
  assert not has_table_privilege('authenticated', 'private.account_flags', 'INSERT');
  assert not has_function_privilege('anon', 'public.confirm_age()', 'EXECUTE');
  assert has_function_privilege('authenticated', 'public.confirm_age()', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'private.public_account_count()', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'private.user_has_school_identity(uuid)', 'EXECUTE');
  assert (select relrowsecurity from pg_class where oid = 'private.account_flags'::regclass);
  assert (select relrowsecurity from pg_class where oid = 'private.signup_settings'::regclass);
end;
$$;

-- Works on staging or production after sign-up opens: start from the shipped settings (rolled back).
update private.signup_settings set public_open = false, public_cap = 300;

-- s = school, g = verified Gmail, u = unverified Google email, p = password only (no Google identity).
insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('ac000000-0000-4000-8000-000000000001', 's999999999991@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('ac000000-0000-4000-8000-000000000002', 'public-test-g@example.invalid', now(), '{"provider":"google"}', '{}'),
  ('ac000000-0000-4000-8000-000000000003', 'public-test-u@example.invalid', now(), '{"provider":"google"}', '{}'),
  ('ac000000-0000-4000-8000-000000000004', 'public-test-p@example.invalid', now(), '{"provider":"email"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data) values
  ('ac000000-0000-4000-8000-000000000001', 'public-test-s', 'google',
   '{"sub":"public-test-s","email":"s999999999991@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}'),
  ('ac000000-0000-4000-8000-000000000002', 'public-test-g', 'google',
   '{"sub":"public-test-g","email":"public-test-g@example.invalid","email_verified":true}'),
  ('ac000000-0000-4000-8000-000000000003', 'public-test-u', 'google',
   '{"sub":"public-test-u","email":"public-test-u@example.invalid","email_verified":false}');

create temporary table signup_event (kind text primary key, event jsonb) on commit drop;
insert into signup_event values
  ('school', '{"user":{"email":"s999999999992@stu.edu.tw","app_metadata":{"provider":"google"},"user_metadata":{"email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}}}'),
  ('gmail', '{"user":{"email":"public-test-new@example.invalid","app_metadata":{"provider":"google"},"user_metadata":{"email_verified":true}}}'),
  ('unverified', '{"user":{"email":"public-test-new2@example.invalid","app_metadata":{"provider":"google"},"user_metadata":{"email_verified":false}}}'),
  ('password', '{"user":{"email":"public-test-new3@example.invalid","app_metadata":{"provider":"email"},"user_metadata":{}}}');

-- The auth hooks run as supabase_auth_admin: it must reach every new piece they read.
do $$
begin
  assert has_table_privilege('supabase_auth_admin', 'private.signup_settings', 'SELECT');
  assert has_table_privilege('supabase_auth_admin', 'private.account_flags', 'SELECT');
  assert (select count(*) from pg_policies where schemaname = 'private'
    and tablename in ('signup_settings', 'account_flags') and 'supabase_auth_admin' = any (roles)) = 2;
  assert has_function_privilege('supabase_auth_admin', 'private.public_account_count()', 'EXECUTE');
  assert has_function_privilege('supabase_auth_admin', 'private.age_confirmed(uuid)', 'EXECUTE');
  assert has_function_privilege('supabase_auth_admin', 'private.full_course_user_allowed(uuid)', 'EXECUTE');
end;
$$;
do $$
declare
  s uuid := 'ac000000-0000-4000-8000-000000000001';
  g uuid := 'ac000000-0000-4000-8000-000000000002';
  token jsonb;
begin
  -- Closed: exactly the school beta.
  assert private.school_beta_user_allowed(s);
  assert not private.school_beta_user_allowed(g), 'closed: Gmail refused';
  assert private.before_school_beta_signup((select event from signup_event where kind = 'school')) = '{}'::jsonb;
  assert private.before_school_beta_signup((select event from signup_event where kind = 'gmail')) #>> '{error,message}' like 'school_beta_only:%';
  token := private.school_beta_access_token_hook(jsonb_build_object('user_id', s, 'claims', '{}'::jsonb));
  assert token #> '{claims,school_beta}' = 'true' and token #> '{claims,age_ok}' = 'true', 'school token';
  assert private.school_beta_access_token_hook(jsonb_build_object('user_id', g, 'claims', '{}'::jsonb)) ? 'error';
end;
$$;
reset role;

update private.signup_settings set public_open = true;

do $$
declare
  s uuid := 'ac000000-0000-4000-8000-000000000001';
  g uuid := 'ac000000-0000-4000-8000-000000000002';
  u uuid := 'ac000000-0000-4000-8000-000000000003';
  p uuid := 'ac000000-0000-4000-8000-000000000004';
  token jsonb;
begin
  -- Open: verified Google accounts only.
  assert private.school_beta_user_allowed(s);
  assert private.school_beta_user_allowed(g), 'open: verified Gmail allowed';
  assert not private.school_beta_user_allowed(u), 'unverified Google email refused';
  assert not private.school_beta_user_allowed(p), 'password-only account refused';
  assert private.before_school_beta_signup((select event from signup_event where kind = 'gmail')) = '{}'::jsonb;
  assert private.before_school_beta_signup((select event from signup_event where kind = 'unverified')) #>> '{error,message}' like 'google_only:%', 'open: the refusal no longer mentions Shu-Te';
  assert private.before_school_beta_signup((select event from signup_event where kind = 'password')) ? 'error';
  token := private.school_beta_access_token_hook(jsonb_build_object('user_id', g, 'claims', '{}'::jsonb));
  assert token #> '{claims,school_beta}' = 'true', 'public token issued';
  assert token #> '{claims,full_course}' = 'false', 'public accounts never get the full-course grant';
  assert token #> '{claims,age_ok}' = 'false', 'age not confirmed yet';
end;
$$;
reset role;

-- Cap: the next public sign-up is refused, school sign-ups never are.
update private.signup_settings set public_cap = private.public_account_count();
do $$
begin
  assert private.before_school_beta_signup((select event from signup_event where kind = 'gmail')) #>> '{error,message}' like 'signups_full:%';
  assert private.before_school_beta_signup((select event from signup_event where kind = 'school')) = '{}'::jsonb;
  assert private.school_beta_user_allowed('ac000000-0000-4000-8000-000000000002'), 'existing accounts keep access at the cap';
end;
$$;
reset role;

-- The learner confirms their own age; repeating it keeps the first date.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ac000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
declare
  first timestamptz;
begin
  first := public.confirm_age();
  assert first is not null;
  assert public.confirm_age() = first, 'first confirmation kept';
  begin
    perform * from private.account_flags;
    raise exception 'flags unexpectedly readable';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

do $$
begin
  assert private.school_beta_access_token_hook(
    jsonb_build_object('user_id', 'ac000000-0000-4000-8000-000000000002', 'claims', '{}'::jsonb)
  ) #> '{claims,age_ok}' = 'true', 'age_ok after confirming';
end;
$$;
reset role;

-- Bans: refused everywhere, school accounts too.
insert into private.account_flags (user_id, banned_at, banned_reason)
values ('ac000000-0000-4000-8000-000000000001', now(), 'test')
on conflict (user_id) do update set banned_at = excluded.banned_at, banned_reason = excluded.banned_reason;
update private.account_flags set banned_at = now(), banned_reason = 'test'
where user_id = 'ac000000-0000-4000-8000-000000000002';
do $$
begin
  assert not private.school_beta_user_allowed('ac000000-0000-4000-8000-000000000001'), 'banned school account refused';
  assert not private.school_beta_user_allowed('ac000000-0000-4000-8000-000000000002'), 'banned public account refused';
  assert private.school_beta_access_token_hook(
    jsonb_build_object('user_id', 'ac000000-0000-4000-8000-000000000002', 'claims', '{}'::jsonb)
  ) #>> '{error,message}' like 'account_blocked:%', 'banned account gets no token, with its own message';
end;
$$;
reset role;

-- A banned learner's data requests stop at the PostgREST pre-request check.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ac000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  perform public.require_school_beta_access();
  raise exception 'banned account passed the pre-request check';
exception when sqlstate 'PT403' then null;
end;
$$;
reset role;

-- Emergency stop: closing again refuses public accounts and keeps school ones.
update private.account_flags set banned_at = null, banned_reason = null;
update private.signup_settings set public_open = false;
do $$
begin
  assert private.school_beta_user_allowed('ac000000-0000-4000-8000-000000000001'), 'unbanned school account back';
  assert not private.school_beta_user_allowed('ac000000-0000-4000-8000-000000000002'), 'closed again: public refused';
end;
$$;
reset role;

rollback;
