-- Launch safety (expand: the previous app keeps working). Pre-launch review, 2026-11-05.
--
-- 1. Review history is written only through append_review_events, now SECURITY
--    DEFINER and pinned to the caller: known keys only, at most 2 KB per event,
--    at most 5,000 new events per account in any 24 hours (events past that are
--    dropped quietly, so card progress and settings still save). Direct INSERT
--    is revoked. Before this, one scripted account could fill the free 500 MB
--    database in minutes, and Supabase then restricts the whole project.
-- 2. Profile photos: only <uid>/avatar.webp and <uid>/cover.webp, only for
--    accounts that may use the app (bans included) and have answered the age
--    step, at most 2 MB each (was any name, 10 MB, unlimited count).
-- 3. A ban outlasts the account (Privacy §2, §6): a one-way code (SHA-256 of
--    provider and Google account ID, never the email) is kept for 2 years and
--    sign-up refuses it. Unbanning removes it. The token now also carries
--    google_photo, copied from Google's own identity record: the games Worker
--    shows only that Google photo (user_metadata is editable by the learner);
--    and public_account (not a school or owner account): Study together waits
--    for those until 2026-11-14.
-- 4. A new public account that has not answered the age question after 7 days
--    is deleted (Privacy §6, §11), daily at 03:20 Taiwan. Only accounts made
--    from 2026-11-06 with no saved progress: older accounts kept from before
--    the school gate are never touched.
-- 5. Reports also keep the reported line's ID and the reported learner's name
--    and photo (public.submit_report, used by the server, which emails "Not
--    safe" reports to the owner). public.report_user stays for older apps.

begin;

-- 1. Review history -----------------------------------------------------------

create or replace function public.append_review_events(p_events jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  e jsonb;
  clean jsonb;
  events jsonb := '[]'::jsonb;
  allowance integer;
begin
  if me is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if not private.has_school_beta_access() then raise exception 'School beta access required' using errcode = '42501'; end if;
  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) > 500 then
    raise exception 'Expected at most 500 review events' using errcode = '22023';
  end if;
  for e in select value from jsonb_array_elements(p_events) loop
    if jsonb_typeof(e) <> 'object'
      or not (e ?& array['id','cardId','sessionId','quality','source','durationMs','reviewedAt','scheduled'])
      or jsonb_typeof(e->'id') <> 'string' or jsonb_typeof(e->'cardId') <> 'string'
      or jsonb_typeof(e->'sessionId') <> 'string'
      or jsonb_typeof(e->'quality') <> 'number' or jsonb_typeof(e->'durationMs') <> 'number'
      or jsonb_typeof(e->'reviewedAt') <> 'number'
      or (e->>'quality')::integer not between 0 and 5
      or e->>'source' not in ('flashcards','quiz','listening','writing','tones','daily','practice')
      or jsonb_typeof(e->'scheduled') <> 'boolean'
      or (e->>'durationMs')::numeric not between 0 and 300000
      or (e->>'reviewedAt')::numeric <= 0 or length(e->>'sessionId') > 200
      or length(e->>'cardId') not between 1 and 500
      or e->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid review event' using errcode = '22023';
    end if;
    -- Only what the app reads (src/utils/srs/reviewEvents.ts); anything else a client sends is dropped.
    clean := jsonb_strip_nulls(jsonb_build_object(
      'id', e->'id', 'cardId', e->'cardId', 'sessionId', e->'sessionId', 'quality', e->'quality',
      'source', e->'source', 'durationMs', e->'durationMs', 'reviewedAt', e->'reviewedAt', 'scheduled', e->'scheduled',
      'practiceOnly', case when jsonb_typeof(e->'practiceOnly') = 'boolean' then e->'practiceOnly' end,
      'dailyTarget', case when jsonb_typeof(e->'dailyTarget') = 'number' and (e->>'dailyTarget')::numeric between 1 and 20 then e->'dailyTarget' end
    ));
    if octet_length(clean::text) > 2048 then raise exception 'Invalid review event' using errcode = '22023'; end if;
    events := events || jsonb_build_array(clean);
  end loop;

  perform pg_advisory_xact_lock(hashtextextended('review_events:' || me::text, 0));
  -- Room left in this account's daily allowance; new events past it are dropped without an error, so the same
  -- save still stores card progress and settings (the card's state lives in user_card_progress anyway).
  allowance := greatest(0, 5000 - (select count(*) from public.user_review_events r
    where r.user_id = me and r.created_at > now() - interval '1 day'));

  insert into public.user_review_events(user_id, event_id, card_id, reviewed_at, payload)
  select me, x.id, x.value->>'cardId', to_timestamp((x.value->>'reviewedAt')::double precision / 1000), x.value
  from (
    select e.value, (e.value->>'id')::uuid as id from jsonb_array_elements(events) e
    where not exists (select 1 from public.user_review_events r where r.user_id = me and r.event_id = (e.value->>'id')::uuid)
    order by (e.value->>'reviewedAt')::double precision
    limit allowance
  ) x
  where not exists (
    select 1 from public.user_profiles p where p.id = me
    and p.progress_reset_at >= to_timestamp((x.value->>'reviewedAt')::double precision / 1000)
  )
  on conflict (user_id, event_id) do nothing;
end;
$$;

revoke insert on public.user_review_events from authenticated;

-- 2. Profile photos -----------------------------------------------------------

create function private.can_upload_profile_media()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_school_beta_access() and private.age_confirmed(auth.uid());
$$;
revoke all on function private.can_upload_profile_media() from public, anon, authenticated;
grant execute on function private.can_upload_profile_media() to authenticated;

alter policy "profile_media_insert" on storage.objects to authenticated
with check (
  bucket_id = 'profile-media'
  and name in ((select auth.uid())::text || '/avatar.webp', (select auth.uid())::text || '/cover.webp')
  and (select private.can_upload_profile_media())
);
alter policy "profile_media_update" on storage.objects to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (
  bucket_id = 'profile-media'
  and name in ((select auth.uid())::text || '/avatar.webp', (select auth.uid())::text || '/cover.webp')
  and (select private.can_upload_profile_media())
);
update storage.buckets set file_size_limit = 2097152 where id = 'profile-media';

-- 3. Bans outlast the account ------------------------------------------------

create table private.banned_identities (
  code text primary key check (code ~ '^[0-9a-f]{64}$'),
  banned_at timestamptz not null default now(),
  keep_until timestamptz not null default now() + interval '2 years'
);
alter table private.banned_identities enable row level security;
revoke all on private.banned_identities from public, anon, authenticated;
grant select on private.banned_identities to supabase_auth_admin;
create policy banned_identities_hook_read on private.banned_identities
  for select to supabase_auth_admin using (true);

create function private.identity_code(provider text, subject text)
returns text language sql immutable set search_path = '' as $$
  select encode(pg_catalog.sha256(convert_to(lower(provider) || ':' || subject, 'UTF8')), 'hex');
$$;

create function private.identity_banned(provider text, subject text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select provider is not null and subject is not null and exists (
    select 1 from private.banned_identities b
    where b.code = private.identity_code(provider, subject) and b.keep_until > now()
  );
$$;

-- Keeps the codes in step with private.account_flags: a ban adds them, an unban removes them.
create function private.sync_banned_identities()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.banned_at is not null then
    insert into private.banned_identities (code)
    select private.identity_code(i.provider, i.provider_id) from auth.identities i where i.user_id = new.user_id
    on conflict (code) do update set banned_at = now(), keep_until = now() + interval '2 years';
  elsif tg_op = 'UPDATE' and old.banned_at is not null then
    delete from private.banned_identities b
    using auth.identities i
    where i.user_id = new.user_id and b.code = private.identity_code(i.provider, i.provider_id);
  end if;
  return new;
end;
$$;
create trigger account_flags_ban_codes after insert or update of banned_at on private.account_flags
  for each row execute function private.sync_banned_identities();

insert into private.banned_identities (code)
select private.identity_code(i.provider, i.provider_id)
from private.account_flags f join auth.identities i on i.user_id = f.user_id
where f.banned_at is not null
on conflict (code) do nothing;

create or replace function private.before_school_beta_signup(event jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  provider text := event #>> '{user,app_metadata,provider}';
  identity jsonb := coalesce(event #> '{user,user_metadata}', '{}'::jsonb)
    || jsonb_build_object('email', event #>> '{user,email}');
  settings private.signup_settings;
begin
  if private.identity_banned(provider, coalesce(identity ->> 'provider_id', identity ->> 'sub')) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'account_blocked: This account can''t sign in.'
    ));
  end if;
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
  if exists (select 1 from private.account_flags f where f.user_id = target and f.banned_at is not null)
    or exists (select 1 from auth.identities i where i.user_id = target and private.identity_banned(i.provider, i.provider_id)) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'account_blocked: This account can''t sign in.'
    ));
  end if;
  if not private.school_beta_user_allowed(target) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', private.refusal_message()));
  end if;
  return jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(event, '{claims,school_beta}', 'true'::jsonb),
          '{claims,full_course}', to_jsonb(private.full_course_user_allowed(target))
        ),
        '{claims,age_ok}', to_jsonb(private.age_confirmed(target))
      ),
      '{claims,public_account}', to_jsonb(not private.user_has_school_identity(target))
    ),
    -- Google's own record, refreshed by Google at each sign-in; '' when there is none.
    '{claims,google_photo}', to_jsonb(coalesce((
      select coalesce(nullif(i.identity_data ->> 'avatar_url', ''), i.identity_data ->> 'picture')
      from auth.identities i where i.user_id = target and i.provider = 'google'
      order by i.last_sign_in_at desc nulls last limit 1
    ), ''))
  );
end;
$$;

revoke all on function private.identity_code(text, text), private.identity_banned(text, text),
  private.sync_banned_identities() from public, anon, authenticated;
grant execute on function private.identity_code(text, text), private.identity_banned(text, text) to supabase_auth_admin;

-- 4. Unanswered age step -----------------------------------------------------

-- `p_made_since`: only accounts created from then on (the tests pass an earlier date).
create function private.delete_unconfirmed_accounts(p_made_since timestamptz default '2026-11-06T00:00:00Z')
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  deleted integer;
begin
  with doomed as (
    select u.id from auth.users u
    where u.created_at < now() - interval '7 days'
      -- Only accounts made since the age step existed, and still empty: accounts kept from before the school gate
      -- (and their progress) are never deleted here.
      and u.created_at >= p_made_since
      and not private.user_has_school_identity(u.id)
      and not exists (select 1 from private.account_flags f where f.user_id = u.id and f.age_confirmed_at is not null)
      and not exists (select 1 from public.user_card_progress c where c.user_id = u.id)
      and not exists (select 1 from public.user_review_events r where r.user_id = u.id)
      and not exists (select 1 from public.user_folders f where f.user_id = u.id)
  )
  delete from auth.users u using doomed d where u.id = d.id;
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;
revoke all on function private.delete_unconfirmed_accounts(timestamptz) from public, anon, authenticated;

create function private.delete_expired_ban_codes()
returns integer language sql volatile security definer set search_path = '' as $$
  with gone as (delete from private.banned_identities where keep_until <= now() returning 1)
  select count(*)::integer from gone;
$$;
revoke all on function private.delete_expired_ban_codes() from public, anon, authenticated;

select cron.schedule('delete-unconfirmed-accounts', '20 19 * * *', $$select private.delete_unconfirmed_accounts()$$);
select cron.schedule('delete-expired-ban-codes', '25 19 * * *', $$select private.delete_expired_ban_codes()$$);

-- 5. Report details ----------------------------------------------------------

alter table private.user_reports
  add column message_id bigint,
  add column target_name text check (char_length(target_name) <= 30),
  add column target_photo text check (char_length(target_photo) <= 500);

create function public.submit_report(
  p_target uuid, p_reason text, p_place text, p_message text default null,
  p_message_id bigint default null, p_name text default null, p_photo text default null
) returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  created bigint;
begin
  if me is null then raise sqlstate 'PT401' using message = 'Sign in required.'; end if;
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  if p_target is null or p_target = me then raise exception using errcode = '22023', message = 'You can''t report yourself.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('user_reports:' || me::text, 0));
  if (select count(*) from private.user_reports r where r.reporter = me and r.created_at > now() - interval '1 day') >= 20 then
    raise exception using errcode = '54000', message = 'You''ve sent a lot of reports today. Try again tomorrow.';
  end if;
  insert into private.user_reports (reporter, target, reason, place, message, message_id, target_name, target_photo)
  values (me, p_target, p_reason, p_place, nullif(left(coalesce(p_message, ''), 300), ''),
    case when p_message_id > 0 then p_message_id end,
    nullif(left(coalesce(p_name, ''), 30), ''),
    -- Without the query string: a signed photo link is a password for that file.
    nullif(left(split_part(coalesce(p_photo, ''), '?', 1), 500), ''))
  returning id into created;
  return created;
end;
$$;
revoke all on function public.submit_report(uuid, text, text, text, bigint, text, text) from public, anon;
grant execute on function public.submit_report(uuid, text, text, text, bigint, text, text) to authenticated;

notify pgrst, 'reload schema';
commit;
