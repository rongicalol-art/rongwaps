-- Public launch: the right refusal message for each phase, and reports that expire.
--
-- While sign-up is closed, refused accounts still read "use your Shu-Te student
-- Google account" (school_beta_only:). Once private.signup_settings.public_open is
-- true, the only accounts refused are non-Google or unverified ones, so they read
-- google_only: instead; the app shows "Sign in with a Google account whose email is
-- verified". Blocked accounts keep account_blocked:.
--
-- Reports are kept 12 months (Privacy Policy §6), deleted daily at 03:10 Taiwan time.

begin;

create function private.refusal_message()
returns text language sql stable security invoker set search_path = '' as $$
  select case when coalesce((select s.public_open from private.signup_settings s), false)
    then 'google_only: Sign in with a Google account whose email is verified.'
    else 'school_beta_only: Use your Shu-Te student Google account.' end;
$$;
revoke all on function private.refusal_message() from public, anon, authenticated;
grant execute on function private.refusal_message() to supabase_auth_admin;

create or replace function private.before_school_beta_signup(event jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  provider text := event #>> '{user,app_metadata,provider}';
  identity jsonb := coalesce(event #> '{user,user_metadata}', '{}'::jsonb)
    || jsonb_build_object('email', event #>> '{user,email}');
  settings private.signup_settings;
begin
  if private.school_beta_identity_allowed(provider, identity) then
    return '{}'::jsonb;
  end if;
  select * into settings from private.signup_settings;
  if not coalesce(settings.public_open, false) or not private.public_identity_allowed(provider, identity) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', private.refusal_message()));
  end if;
  if private.public_account_count() >= settings.public_cap then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'signups_full: Ron''s Mandarin is full for now. Try again soon.'
    ));
  end if;
  return '{}'::jsonb;
end;
$$;

create or replace function private.school_beta_access_token_hook(event jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target uuid := (event ->> 'user_id')::uuid;
begin
  if exists (select 1 from private.account_flags f where f.user_id = target and f.banned_at is not null) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'account_blocked: This account can''t sign in.'
    ));
  end if;
  if not private.school_beta_user_allowed(target) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', private.refusal_message()));
  end if;
  return jsonb_set(
    jsonb_set(
      jsonb_set(event, '{claims,school_beta}', 'true'::jsonb),
      '{claims,full_course}', to_jsonb(private.full_course_user_allowed(target))
    ),
    '{claims,age_ok}', to_jsonb(private.age_confirmed(target))
  );
end;
$$;

create index user_reports_created on private.user_reports (created_at);

create function private.delete_old_reports()
returns integer language sql volatile security definer set search_path = '' as $$
  with gone as (delete from private.user_reports where created_at < now() - interval '12 months' returning 1)
  select count(*)::integer from gone;
$$;
revoke all on function private.delete_old_reports() from public, anon, authenticated;

select cron.schedule('delete-old-reports', '10 19 * * *', $$select private.delete_old_reports()$$);

commit;
