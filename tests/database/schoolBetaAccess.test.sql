-- Run only in a disposable Postgres database, never against owner progress.
-- psql -v migration=/absolute/path/to/20261016015445_school_beta_access.sql \
--   -v course_migration=/absolute/path/to/20261018154836_full_course_access_grants.sql -f this-file
\set ON_ERROR_STOP on
do $$ begin
  if current_database() <> 'school_beta_test' then
    raise exception 'This fixture may run only in the disposable school_beta_test database.';
  end if;
end $$;
drop table if exists auth.identities, public.user_profiles, public.user_folders, public.user_flashcards, public.user_card_progress;
alter table auth.users add column if not exists email_confirmed_at timestamptz;
alter table auth.users add column if not exists raw_user_meta_data jsonb;
create table auth.identities (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),
  provider text not null, identity_data jsonb not null
);
grant select on auth.users, auth.identities to supabase_auth_admin;
create table public.user_profiles (id uuid primary key);
create table public.user_folders (user_id uuid);
create table public.user_flashcards (user_id uuid);
create table public.user_card_progress (user_id uuid);
alter table public.user_profiles enable row level security;
create policy owner_only on public.user_profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
grant select, insert on public.user_profiles to authenticated;
\i :migration
\i :course_migration

begin;
create function pg_temp.check_beta(ok boolean, label text) returns void
language plpgsql as $$ begin if ok is distinct from true then raise exception '%', label; end if; end $$;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
('00000000-0000-0000-0000-000000000001', 's25113312@stu.edu.tw', now(), '{}'),
('00000000-0000-0000-0000-000000000002', 'personal@example.test', now(), '{"email":"s25113312@stu.edu.tw","custom_claims":{"hd":"stu.edu.tw"}}'),
('00000000-0000-0000-0000-000000000003', 's25113313@stu.edu.tw', now(), '{}'),
('00000000-0000-0000-0000-000000000004', 'owner@example.test', now(), '{}');
insert into auth.identities (user_id, provider, identity_data) values
('00000000-0000-0000-0000-000000000001', 'google', '{"email":"s25113312@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}'),
('00000000-0000-0000-0000-000000000002', 'google', '{"email":"personal@example.test","email_verified":true}'),
('00000000-0000-0000-0000-000000000003', 'google', '{"email":"s25113313@stu.edu.tw","email_verified":true}'),
('00000000-0000-0000-0000-000000000004', 'google', '{"email":"owner@example.test","email_verified":true}');
insert into public.user_profiles values
('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');

select pg_temp.check_beta(private.school_beta_user_allowed('00000000-0000-0000-0000-000000000001'), 'school identity accepted');
select pg_temp.check_beta(not private.school_beta_user_allowed('00000000-0000-0000-0000-000000000002'), 'editable metadata cannot grant access');
select pg_temp.check_beta(not private.school_beta_user_allowed('00000000-0000-0000-0000-000000000003'), 'school email without Workspace claim denied');
select pg_temp.check_beta(not private.school_beta_user_allowed('00000000-0000-0000-0000-000000000004'), 'owner requires explicit approval');
select pg_temp.check_beta(private.full_course_user_allowed('00000000-0000-0000-0000-000000000001'), 'granted student gets full-course access');
select pg_temp.check_beta(not private.full_course_user_allowed('00000000-0000-0000-0000-000000000003'), 'ungranted student has no full-course access');
select pg_temp.check_beta(not private.full_course_user_allowed('00000000-0000-0000-0000-000000000002'), 'editable metadata cannot grant full-course access');
select pg_temp.check_beta(not private.school_beta_identity_allowed('google', '{"email":"staff@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}'), 'staff denied');
select pg_temp.check_beta(not private.school_beta_identity_allowed('email', '{"email":"s25113312@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}'), 'forged email-provider metadata denied');
select pg_temp.check_beta(not private.school_beta_identity_allowed('google', '{"email":"s25113312@stu.edu.tw.attacker.test","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}'), 'suffix spoof denied');
select pg_temp.check_beta(not private.school_beta_identity_allowed('google', '{"email":"s25113312@stu.edu.tw","email_verified":false,"custom_claims":{"hd":"stu.edu.tw"}}'), 'unverified identity denied');
select pg_temp.check_beta(not private.school_beta_identity_allowed('google', '{"email":"s25113312@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"other.edu.tw"}}'), 'other organization denied');

insert into private.beta_owner_emails values ('owner@example.test');
select pg_temp.check_beta(private.school_beta_user_allowed('00000000-0000-0000-0000-000000000004'), 'explicit owner accepted');
delete from private.beta_owner_emails;
select pg_temp.check_beta(not private.school_beta_user_allowed('00000000-0000-0000-0000-000000000004'), 'owner removal effective immediately');

set role supabase_auth_admin;
select pg_temp.check_beta(private.before_school_beta_signup('{"user":{"email":"s25113312@stu.edu.tw","app_metadata":{"provider":"google"},"user_metadata":{"email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}}}') = '{}', 'school signup accepted');
select pg_temp.check_beta(private.before_school_beta_signup('{"user":{"email":"personal@example.test","app_metadata":{"provider":"google"},"user_metadata":{"email_verified":true}}}') ? 'error', 'personal signup denied');
select pg_temp.check_beta(private.school_beta_access_token_hook('{"user_id":"00000000-0000-0000-0000-000000000001","claims":{"sub":"fixture"}}') -> 'claims' = '{"sub":"fixture"}', 'allowed token claims unchanged');
select pg_temp.check_beta(private.school_beta_access_token_hook('{"user_id":"00000000-0000-0000-0000-000000000002","claims":{}}') ? 'error', 'existing personal account token denied');
reset role;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';
set role authenticated;
select pg_temp.check_beta(public.has_beta_access(), 'student RPC allowed');
select pg_temp.check_beta(public.has_full_course_access(), 'explicitly granted student gets full-course access');
select public.require_school_beta_access();
select pg_temp.check_beta((select count(*) from public.user_profiles) = 1, 'student still sees only own progress');
do $$ begin
  begin perform private.school_beta_user_allowed('00000000-0000-0000-0000-000000000002'); raise exception 'arbitrary user lookup exposed'; exception when insufficient_privilege then null; end;
  begin perform private.full_course_user_allowed('00000000-0000-0000-0000-000000000002'); raise exception 'full-course user lookup exposed'; exception when insufficient_privilege then null; end;
  begin perform * from private.beta_owner_emails; raise exception 'owner list exposed'; exception when insufficient_privilege then null; end;
  begin perform * from private.full_course_access_emails; raise exception 'full-course grant list exposed'; exception when insufficient_privilege then null; end;
  begin perform private.before_school_beta_signup('{}'); raise exception 'auth hook exposed'; exception when insufficient_privilege then null; end;
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select pg_temp.check_beta(not public.has_beta_access(), 'old personal token denied');
select pg_temp.check_beta(not public.has_full_course_access(), 'personal account has no full-course access');
select pg_temp.check_beta((select count(*) from public.user_profiles) = 0, 'old personal token sees no data');
do $$ begin
  begin perform public.require_school_beta_access(); raise exception 'direct RPC bypass'; exception when sqlstate 'PT403' then null; end;
  begin insert into public.user_profiles values (auth.uid()); raise exception 'direct write bypass'; exception when insufficient_privilege then null; end;
end $$;
reset role;

update auth.identities set identity_data = identity_data - 'custom_claims'
where user_id = '00000000-0000-0000-0000-000000000001';
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set role authenticated;
select pg_temp.check_beta(not public.has_beta_access(), 'revoked school identity blocks existing token');
reset role;
set request.jwt.claim.sub = '';
set request.jwt.claim.role = 'anon';
set role anon;
do $$ begin
  begin perform public.require_school_beta_access(); raise exception 'anonymous API access'; exception when sqlstate 'PT401' then null; end;
  begin perform public.has_beta_access(); raise exception 'anonymous access RPC exposed'; exception when insufficient_privilege then null; end;
  begin perform public.has_full_course_access(); raise exception 'anonymous full-course RPC exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
\echo 'School beta identity, hooks, RLS, old-token, spoofing, owner and ACL checks passed.'
