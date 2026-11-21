-- @usernames and "Let classmates find me" (owner decisions, 2026-11-21). Expand only.
--
-- public.usernames: every learner's unique @username, made from their name the first time the app asks
--   (claim_username) and changeable once a week (set_username; the automatic one can be changed at once). A name
--   someone gives up stays held for them for 7 days, so nobody can take a friend's old @username to pose as them.
--   `findable` is "Let classmates find me" (on by default): off hides the @username and keeps them out of search.
-- public.find_classmates(text): Add friends search, a name or @username, among learners who can be found.
-- The rude-word check runs in the app (shared/nameFilter.ts), like display names; the database checks the format,
-- that it is free, and the weekly limit. Everything cascades with the account and is in the data export.
begin;

create table public.usernames (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  findable boolean not null default true,
  -- When the learner last chose it; null while it is still the automatic one.
  chosen_at timestamptz,
  constraint usernames_format check (username ~ '^[a-z0-9_.]{3,20}$' and username !~ '(^\.|\.$|\.\.)')
);
alter table public.usernames enable row level security;
revoke all on public.usernames from public, anon, authenticated;
grant select on public.usernames to authenticated;
create policy usernames_visible on public.usernames for select to authenticated
  using (user_id = (select auth.uid()) or (findable and not private.apart_from_me(user_id)));
create policy school_beta_access on public.usernames as restrictive for all to authenticated
  using ((select private.has_school_beta_access())) with check ((select private.has_school_beta_access()));

-- A given-up @username, held for its last owner for 7 days.
create table private.username_holds (
  username text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  until timestamptz not null
);
revoke all on private.username_holds from public, anon, authenticated;

create function private.username_free(p_name text, p_me uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.usernames u where u.username = p_name and u.user_id <> p_me)
     and not exists (select 1 from private.username_holds h where h.username = p_name and h.user_id <> p_me and h.until > now());
$$;
revoke all on function private.username_free(text, uuid) from public, anon, authenticated;

-- This learner's @username, made from `p_base` (the app's slug of their name) if they have none yet:
-- kai.lin, then kai.lin2, kai.lin3, ... and a random number after 20 tries.
create function public.claim_username(p_base text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := private.require_social_update();
  mine text;
  base text;
  candidate text;
  tries int := 0;
begin
  select u.username into mine from public.usernames u where u.user_id = me;
  if mine is not null then return mine; end if;
  base := regexp_replace(lower(coalesce(p_base, '')), '[^a-z0-9_.]+', '', 'g');
  base := regexp_replace(regexp_replace(base, '\.{2,}', '.', 'g'), '(^\.+|\.+$)', '', 'g');
  base := regexp_replace(left(base, 16), '\.+$', '');
  if length(base) < 3 then base := 'learner'; end if;
  perform pg_advisory_xact_lock(hashtextextended('usernames:' || base, 0));
  loop
    tries := tries + 1;
    candidate := case when tries = 1 then base when tries <= 20 then base || tries
                      else left(base, 14) || (1000 + floor(random() * 9000))::int end;
    if private.username_free(candidate, me) then
      begin
        insert into public.usernames (user_id, username) values (me, candidate);
        return candidate;
      exception when unique_violation then
        -- Taken a moment ago by someone else, or this account claimed one at the same time.
        select u.username into mine from public.usernames u where u.user_id = me;
        if mine is not null then return mine; end if;
      end;
    end if;
    if tries > 60 then raise exception using errcode = '54000', message = 'Could not make a username. Try again.'; end if;
  end loop;
end;
$$;

-- Change it: 3-20 lowercase letters, numbers, dots or underscores; once a week after the automatic one.
create function public.set_username(p_name text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := private.require_social_update();
  wanted text := lower(btrim(ltrim(btrim(coalesce(p_name, '')), '@')));
  current_row public.usernames;
begin
  if wanted !~ '^[a-z0-9_.]{3,20}$' or wanted ~ '(^\.|\.$|\.\.)' then
    raise exception using errcode = '22023', message = 'Use 3 to 20 letters, numbers, dots or underscores.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('usernames:' || wanted, 0));
  select * into current_row from public.usernames u where u.user_id = me for update;
  if current_row.username = wanted then return wanted; end if;
  if current_row.chosen_at > now() - interval '7 days' then
    raise exception using errcode = '54000', message = 'You can change your username again on '
      || to_char((current_row.chosen_at + interval '7 days') at time zone 'Asia/Taipei', 'FMMonth FMDD') || '.';
  end if;
  if not private.username_free(wanted, me) then
    raise exception using errcode = '23505', message = 'That username is taken.';
  end if;
  delete from private.username_holds h where h.until <= now() or h.username = wanted;
  begin
    if current_row.username is not null then
      insert into private.username_holds (username, user_id, until) values (current_row.username, me, now() + interval '7 days')
      on conflict (username) do update set user_id = excluded.user_id, until = excluded.until;
      update public.usernames u set username = wanted, chosen_at = now() where u.user_id = me;
    else
      insert into public.usernames (user_id, username, chosen_at) values (me, wanted, now());
    end if;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'That username is taken.';
  end;
  return wanted;
end;
$$;

-- "Let classmates find me".
create function public.set_findable(p_on boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := private.require_social_update();
begin
  update public.usernames u set findable = coalesce(p_on, true) where u.user_id = me;
  if not found then raise exception using errcode = '55000', message = 'Your username isn''t ready yet. Try again.'; end if;
end;
$$;

-- Add friends search: a name or @username (any part), among learners who can be found and have a saved profile.
-- Runs as the caller, so row security hides blocked pairs and anyone who turned finding off. An exact @username
-- comes first, then names that start with it, then the most recently online. A few hundred rows: a plain scan.
create function public.find_classmates(p_text text) returns table (user_id uuid, username text, card jsonb, last_seen timestamptz)
language sql stable security invoker set search_path = '' as $$
  with q as (select lower(ltrim(btrim(coalesce(p_text, '')), '@')) as t)
  select u.user_id, u.username, c.card, c.last_seen
  from q, public.usernames u
  join public.profile_cards c on c.user_id = u.user_id
  where length(q.t) between 1 and 40 and u.findable and u.user_id <> (select auth.uid())
    and (strpos(u.username, q.t) > 0 or strpos(lower(coalesce(c.card->>'n', '')), q.t) > 0)
  order by (u.username = q.t) desc, (strpos(u.username, q.t) = 1 or strpos(lower(coalesce(c.card->>'n', '')), q.t) = 1) desc,
    c.last_seen desc nulls last
  limit 21;
$$;

revoke all on function public.claim_username(text), public.set_username(text), public.set_findable(boolean), public.find_classmates(text) from public, anon;
grant execute on function public.claim_username(text), public.set_username(text), public.set_findable(boolean), public.find_classmates(text) to authenticated;

-- The account export includes the @username and its setting ---------------------

do $export$
declare
  body text := pg_get_functiondef('public.export_my_data()'::regprocedure);
begin
  if position('''blocked_people''' in body) = 0 then raise exception 'export_my_data changed; update this migration'; end if;
  body := replace(body, '''blocked_people''',
    '''username'', (SELECT jsonb_build_object(''username'', n.username, ''findable'', n.findable, ''chosen_at'', n.chosen_at) FROM public.usernames n WHERE n.user_id = uid),
        ''blocked_people''');
  execute body;
end;
$export$;

notify pgrst, 'reload schema';
commit;
