begin;

-- Beta authorization belongs here, not in editable user_metadata or the UI.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, supabase_auth_admin;

create table private.beta_owner_emails (
  email text primary key check (email = lower(trim(email)))
);
alter table private.beta_owner_emails enable row level security;
revoke all on private.beta_owner_emails from public, anon, authenticated;
grant select on private.beta_owner_emails to supabase_auth_admin;
create policy beta_owner_hook_read on private.beta_owner_emails
  for select to supabase_auth_admin using (true);

-- Only provider-owned identity data is authoritative after registration.
-- A school email alone does not prove Google Workspace membership.
create function private.school_beta_identity_allowed(provider text, identity_data jsonb)
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce(
    provider = 'google'
    and identity_data ->> 'email_verified' = 'true'
    and (
      (
        lower(identity_data ->> 'email') ~ '^s[0-9]+@stu\.edu\.tw$'
        and lower(identity_data #>> '{custom_claims,hd}') = 'stu.edu.tw'
      )
      or exists (
        select 1 from private.beta_owner_emails o
        where o.email = lower(identity_data ->> 'email')
      )
    ), false
  );
$$;

create function private.school_beta_user_allowed(target_user uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    join auth.identities i on i.user_id = u.id
    where u.id = target_user and u.email_confirmed_at is not null
      and lower(u.email) = lower(i.identity_data ->> 'email')
      and private.school_beta_identity_allowed(i.provider, i.identity_data)
  );
$$;

-- The only authenticated SECURITY DEFINER entry point takes no user ID:
-- callers can check only themselves. Privileged functions remain private.
create function private.has_school_beta_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and private.school_beta_user_allowed(auth.uid());
$$;

create function public.has_beta_access()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.has_school_beta_access();
$$;

-- Preliminary signup filter. The token hook subsequently rechecks saved,
-- provider-owned identities, so client-supplied signup metadata cannot grant access.
create function private.before_school_beta_signup(event jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if not private.school_beta_identity_allowed(
    event #>> '{user,app_metadata,provider}',
    coalesce(event #> '{user,user_metadata}', '{}'::jsonb)
      || jsonb_build_object('email', event #>> '{user,email}')
  ) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'school_beta_only: Use your Shu-Te student Google account.'
    ));
  end if;
  return '{}'::jsonb;
end;
$$;

-- Runs on sign-in and token refresh, including accounts created before the beta gate.
create function private.school_beta_access_token_hook(event jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if not private.school_beta_user_allowed((event ->> 'user_id')::uuid) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'school_beta_only: Use your Shu-Te student Google account.'
    ));
  end if;
  return event;
end;
$$;

-- PostgREST invokes this before tables AND existing SECURITY DEFINER RPCs.
-- This also denies already-issued tokens without deleting accounts/progress.
create function public.require_school_beta_access()
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.role() = 'service_role' then return; end if;
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in required.';
  end if;
  if not private.has_school_beta_access() then
    raise sqlstate 'PT403' using message = 'school_beta_only: Use your Shu-Te student Google account.';
  end if;
end;
$$;

revoke all on function private.school_beta_identity_allowed(text, jsonb),
  private.school_beta_user_allowed(uuid), private.has_school_beta_access(),
  private.before_school_beta_signup(jsonb), private.school_beta_access_token_hook(jsonb)
  from public, anon, authenticated;
grant execute on function private.school_beta_identity_allowed(text, jsonb),
  private.school_beta_user_allowed(uuid), private.before_school_beta_signup(jsonb),
  private.school_beta_access_token_hook(jsonb) to supabase_auth_admin;
grant execute on function private.has_school_beta_access() to authenticated;
revoke all on function public.has_beta_access() from public, anon;
grant execute on function public.has_beta_access() to authenticated;
revoke all on function public.require_school_beta_access() from public;
grant execute on function public.require_school_beta_access() to anon, authenticated, service_role;

-- Restrictive policies supplement the existing ownership policies, never replace them.
do $$
declare table_name text;
begin
  foreach table_name in array array['user_profiles', 'user_folders', 'user_flashcards', 'user_card_progress'] loop
    execute format(
      'create policy school_beta_access on public.%I as restrictive for all to authenticated using ((select private.has_school_beta_access())) with check ((select private.has_school_beta_access()))',
      table_name
    );
  end loop;
  if exists (
    select 1 from pg_catalog.pg_db_role_setting s
    join pg_catalog.pg_roles r on r.oid = s.setrole,
      unnest(s.setconfig) setting
    where r.rolname = 'authenticator' and setting like 'pgrst.db_pre_request=%'
      and setting not in ('pgrst.db_pre_request=', 'pgrst.db_pre_request=public.require_school_beta_access')
  ) then
    raise exception 'Existing PostgREST pre-request hook must be composed before applying the beta gate.';
  end if;
end;
$$;
alter role authenticator set pgrst.db_pre_request = 'public.require_school_beta_access';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
commit;
