-- Public accounts (expand; nothing changes for learners until the owner opens it).
--
-- Any verified Google account may use the app once
-- private.signup_settings.public_open is true. Until then only school accounts
-- (and the owner allowlist) get in, exactly as before. Setting it back to false
-- is the emergency stop: public accounts lose access at once, school accounts
-- keep it, nobody's data is deleted.
--
-- New public sign-ups stop at public_cap (school accounts never count and are
-- never refused). Existing accounts keep access when the cap is reached.
--
-- Owner, in the Supabase SQL editor (staging first):
--   update private.signup_settings set public_open = true, updated_at = now();
--   update private.signup_settings set public_cap = 500, updated_at = now();
--   ban:   insert into private.account_flags (user_id, banned_at, banned_reason)
--          values ('<user id>', now(), '<why>')
--          on conflict (user_id) do update set banned_at = now(), banned_reason = excluded.banned_reason;
--   unban: update private.account_flags set banned_at = null, banned_reason = null where user_id = '<user id>';
--
-- The one access rule stays in private.school_beta_user_allowed (renamed in a
-- later contract migration), so every restrictive policy, the PostgREST
-- pre-request check, the folder RPCs, the token hook and Express's fallback
-- follow it without changes. A ban takes effect on the next database request
-- and the next token refresh.
--
-- The token now also carries age_ok: school accounts are true (their Terms
-- already required 18+); public accounts after public.confirm_age().

begin;

create table private.signup_settings (
  id boolean primary key default true check (id),
  public_open boolean not null default false,
  public_cap integer not null default 300 check (public_cap >= 0),
  updated_at timestamptz not null default now()
);
insert into private.signup_settings default values;

create table private.account_flags (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age_confirmed_at timestamptz,
  banned_at timestamptz,
  banned_reason text check (char_length(banned_reason) <= 500)
);

alter table private.signup_settings enable row level security;
alter table private.account_flags enable row level security;
revoke all on private.signup_settings, private.account_flags from public, anon, authenticated;
grant select on private.signup_settings, private.account_flags to supabase_auth_admin;
create policy signup_settings_hook_read on private.signup_settings
  for select to supabase_auth_admin using (true);
create policy account_flags_hook_read on private.account_flags
  for select to supabase_auth_admin using (true);

-- Any Google identity whose email Google has verified.
create function private.public_identity_allowed(provider text, identity_data jsonb)
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce(
    provider = 'google'
    and identity_data ->> 'email_verified' = 'true'
    and nullif(identity_data ->> 'email', '') is not null,
    false
  );
$$;

create function private.user_has_school_identity(target_user uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    join auth.identities i on i.user_id = u.id
    where u.id = target_user and u.email_confirmed_at is not null
      and lower(u.email) = lower(i.identity_data ->> 'email')
      and private.school_beta_identity_allowed(i.provider, i.identity_data)
  );
$$;

create or replace function private.school_beta_user_allowed(target_user uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    join auth.identities i on i.user_id = u.id
    where u.id = target_user and u.email_confirmed_at is not null
      and lower(u.email) = lower(i.identity_data ->> 'email')
      and (
        private.school_beta_identity_allowed(i.provider, i.identity_data)
        or (
          coalesce((select s.public_open from private.signup_settings s), false)
          and private.public_identity_allowed(i.provider, i.identity_data)
        )
      )
  )
  and not exists (
    select 1 from private.account_flags f
    where f.user_id = target_user and f.banned_at is not null
  );
$$;

create function private.public_account_count()
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*) from auth.users u where not private.user_has_school_identity(u.id);
$$;

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
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'school_beta_only: Use your Shu-Te student Google account.'
    ));
  end if;
  if private.public_account_count() >= settings.public_cap then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'signups_full: Ron''s Mandarin is full for now. Try again soon.'
    ));
  end if;
  return '{}'::jsonb;
end;
$$;

create function private.age_confirmed(target_user uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.user_has_school_identity(target_user)
    or exists (
      select 1 from private.account_flags f
      where f.user_id = target_user and f.age_confirmed_at is not null
    );
$$;

create or replace function private.school_beta_access_token_hook(event jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target uuid := (event ->> 'user_id')::uuid;
begin
  -- Its own message, so a blocked learner isn't told to use a school account.
  if exists (select 1 from private.account_flags f where f.user_id = target and f.banned_at is not null) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'account_blocked: This account can''t sign in.'
    ));
  end if;
  if not private.school_beta_user_allowed(target) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'school_beta_only: Use your Shu-Te student Google account.'
    ));
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

-- The learner's own "I'm 18 or older". Recorded once; repeating it keeps the
-- first date. The caller can only confirm for themselves.
create function private.confirm_age()
returns timestamptz language plpgsql volatile security definer set search_path = '' as $$
declare
  confirmed timestamptz;
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in required.';
  end if;
  insert into private.account_flags (user_id, age_confirmed_at)
  values (auth.uid(), now())
  on conflict (user_id) do update
    set age_confirmed_at = coalesce(private.account_flags.age_confirmed_at, excluded.age_confirmed_at)
  returning age_confirmed_at into confirmed;
  return confirmed;
end;
$$;

create function public.confirm_age()
returns timestamptz language sql volatile security invoker set search_path = '' as $$
  select private.confirm_age();
$$;

revoke all on function private.public_identity_allowed(text, jsonb),
  private.user_has_school_identity(uuid), private.public_account_count(),
  private.age_confirmed(uuid), private.confirm_age(), public.confirm_age()
  from public, anon, authenticated;
grant execute on function private.public_identity_allowed(text, jsonb),
  private.user_has_school_identity(uuid), private.public_account_count(),
  private.age_confirmed(uuid) to supabase_auth_admin;
grant execute on function private.confirm_age(), public.confirm_age() to authenticated;

notify pgrst, 'reload schema';
commit;
