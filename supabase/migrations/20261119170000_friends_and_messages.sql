-- Friends, private messages and profiles that work offline, for Study together (expand only).
--
-- Nothing here stores anything before the privacy update takes effect: every write goes through a
-- function that checks private.social_update_open() (2026-12-01, Taiwan time). Reads of empty tables
-- are harmless, so the app may ship first.
--
-- public.friend_adds: one row per "Add friend" tap (adder → added). Two people are friends when both
--   rows exist; a row alone is a request. Added and removed only through add_friend / remove_friend.
-- public.direct_messages: private messages between two friends, the newest 500 per pair. Read by the
--   two people only; written only through send_direct_message (friends, not blocked, 1 a second,
--   300 a day). Reports copy the recent conversation into private.user_reports.
-- public.direct_reads: each reader's read spot per conversation.
-- public.profile_cards: the visit card a learner last shared (cover, book, words, characters, streak,
--   name, colour; no photo links, which are passwords) and when they were last online, so classmates
--   can see it while they're offline. Only while they share it; save_profile_card(null, false) removes it.
-- Every table cascades with the account, and export_my_data includes all of it.
-- Blocking someone ends the friendship; a blocked pair can't see each other's messages or card.

begin;

create function private.social_update_at() returns timestamptz
language sql immutable set search_path = '' as $$ select timestamptz '2026-12-01 00:00:00+08' $$;
create function private.social_update_open() returns boolean
language sql stable set search_path = '' as $$ select now() >= private.social_update_at() $$;

create function private.apart(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_blocks b
    where (b.blocker = p_a and b.blocked = p_b) or (b.blocker = p_b and b.blocked = p_a));
$$;
revoke all on function private.apart(uuid, uuid) from public, anon, authenticated;
-- For row policies: only ever about the caller, so nobody can probe other people's blocks.
create function private.apart_from_me(p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select private.apart((select auth.uid()), p_other) $$;
revoke all on function private.apart_from_me(uuid) from public, anon;
grant execute on function private.apart_from_me(uuid) to authenticated;

create function private.require_social_update() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise sqlstate 'PT401' using message = 'Sign in required.'; end if;
  if not private.has_school_beta_access() then raise exception 'School beta access required' using errcode = '42501'; end if;
  if not private.social_update_open() then raise exception using errcode = '55000', message = 'Friends and messages start on December 1.'; end if;
  return me;
end;
$$;
revoke all on function private.require_social_update() from public, anon, authenticated;

-- Friends --------------------------------------------------------------------

create table public.friend_adds (
  adder uuid not null default auth.uid() references auth.users (id) on delete cascade,
  added uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (adder, added),
  check (adder <> added)
);
create index friend_adds_added on public.friend_adds (added);
alter table public.friend_adds enable row level security;
revoke all on public.friend_adds from public, anon, authenticated;
grant select on public.friend_adds to authenticated;
create policy friend_adds_mine on public.friend_adds for select to authenticated
  using (adder = (select auth.uid()) or added = (select auth.uid()));
create policy school_beta_access on public.friend_adds as restrictive for all to authenticated
  using ((select private.has_school_beta_access())) with check ((select private.has_school_beta_access()));

create function private.friends(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friend_adds f where f.adder = p_a and f.added = p_b)
     and exists (select 1 from public.friend_adds f where f.adder = p_b and f.added = p_a);
$$;
revoke all on function private.friends(uuid, uuid) from public, anon, authenticated;

-- 'friends' when the other person had already added you, else 'requested'.
create function public.add_friend(p_user uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := private.require_social_update();
begin
  if p_user is null or p_user = me then raise exception using errcode = '22023', message = 'You can''t add yourself.'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user) or private.apart(me, p_user) then
    raise exception using errcode = '22023', message = 'You can''t add this person.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('friend_adds:' || me::text, 0));
  if not exists (select 1 from public.friend_adds f where f.adder = me and f.added = p_user)
    and (select count(*) from public.friend_adds f where f.adder = me) >= 300 then
    raise exception using errcode = '54000', message = 'You''ve added the most friends allowed.';
  end if;
  insert into public.friend_adds (adder, added) values (me, p_user) on conflict do nothing;
  return case when private.friends(me, p_user) then 'friends' else 'requested' end;
end;
$$;

-- Unfriend, cancel a request or decline one: both directions go.
create function public.remove_friend(p_user uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise sqlstate 'PT401' using message = 'Sign in required.'; end if;
  delete from public.friend_adds f where (f.adder = me and f.added = p_user) or (f.adder = p_user and f.added = me);
end;
$$;

-- Everyone in my friends list and requests, with the name and colour their profile shows in Study together
-- (like folder members): friends have both flags, a request to me only added_me.
create function public.friend_people()
returns table (user_id uuid, name text, color text, i_added boolean, added_me boolean)
language sql stable security definer set search_path = '' as $$
  with rel as (
    select f.added as other, true as i_added, false as added_me from public.friend_adds f where f.adder = (select auth.uid())
    union all
    select f.adder, false, true from public.friend_adds f where f.added = (select auth.uid())
  ), pairs as (
    select other, bool_or(i_added) as i_added, bool_or(added_me) as added_me from rel group by other
  )
  select r.other,
    left(coalesce(nullif(btrim(p.settings ->> 'displayName'), ''),
      nullif(split_part(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ' ', 1), ''), 'Student'), 30),
    coalesce(nullif(p.settings ->> 'avatarColor', ''), 'blue'),
    r.i_added, r.added_me
  from pairs r join auth.users u on u.id = r.other left join public.user_profiles p on p.id = r.other
  where private.has_school_beta_access() and not private.apart((select auth.uid()), r.other);
$$;

-- Blocking ends the friendship (and any request) both ways.
create function private.unfriend_on_block() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friend_adds f
  where (f.adder = new.blocker and f.added = new.blocked) or (f.adder = new.blocked and f.added = new.blocker);
  return new;
end;
$$;
create trigger unfriend_on_block after insert on public.user_blocks
  for each row execute function private.unfriend_on_block();

-- Private messages -----------------------------------------------------------

create table public.direct_messages (
  id bigint generated always as identity primary key,
  sender uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  check (sender <> recipient)
);
create index direct_messages_pair on public.direct_messages (least(sender, recipient), greatest(sender, recipient), id);
create index direct_messages_recipient on public.direct_messages (recipient, id);
create index direct_messages_sender on public.direct_messages (sender, created_at);
alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from public, anon, authenticated;
grant select on public.direct_messages to authenticated;
create policy direct_messages_two on public.direct_messages for select to authenticated
  using ((sender = (select auth.uid()) or recipient = (select auth.uid()))
    and not private.apart_from_me(case when sender = (select auth.uid()) then recipient else sender end));
create policy school_beta_access on public.direct_messages as restrictive for all to authenticated
  using ((select private.has_school_beta_access())) with check ((select private.has_school_beta_access()));

create function public.send_direct_message(p_to uuid, p_body text) returns public.direct_messages
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := private.require_social_update();
  clean text;
  sent public.direct_messages;
  oldest_kept bigint;
begin
  if p_to is null or not private.friends(me, p_to) or private.apart(me, p_to) then
    raise exception using errcode = '42501', message = 'You can message friends only.';
  end if;
  -- Plain text: no line breaks, control or direction-override characters, at most 300 characters.
  clean := btrim(regexp_replace(coalesce(p_body, ''), '[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]+', ' ', 'g'));
  clean := left(clean, 300);
  if clean = '' then raise exception using errcode = '22023', message = 'Write a message first.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('direct_messages:' || me::text, 0));
  if exists (select 1 from public.direct_messages m where m.sender = me and m.created_at > now() - interval '1 second') then
    raise exception using errcode = '54000', message = 'Please wait before sending another message.';
  end if;
  if (select count(*) from public.direct_messages m where m.sender = me and m.created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc') >= 300 then
    raise exception using errcode = '54000', message = 'You''ve reached today''s limit. Try again tomorrow.';
  end if;
  insert into public.direct_messages (sender, recipient, body) values (me, p_to, clean) returning * into sent;
  -- Keep the newest 500 per pair.
  select m.id into oldest_kept from public.direct_messages m
  where least(m.sender, m.recipient) = least(me, p_to) and greatest(m.sender, m.recipient) = greatest(me, p_to)
  order by m.id desc offset 499 limit 1;
  if oldest_kept is not null then
    delete from public.direct_messages m
    where least(m.sender, m.recipient) = least(me, p_to) and greatest(m.sender, m.recipient) = greatest(me, p_to) and m.id < oldest_kept;
  end if;
  return sent;
end;
$$;

create table public.direct_reads (
  reader uuid not null default auth.uid() references auth.users (id) on delete cascade,
  other uuid not null references auth.users (id) on delete cascade,
  last_id bigint not null default 0,
  primary key (reader, other)
);
alter table public.direct_reads enable row level security;
revoke all on public.direct_reads from public, anon, authenticated;
grant select on public.direct_reads to authenticated;
create policy direct_reads_own on public.direct_reads for select to authenticated using (reader = (select auth.uid()));
create policy school_beta_access on public.direct_reads as restrictive for all to authenticated
  using ((select private.has_school_beta_access())) with check ((select private.has_school_beta_access()));

create function public.mark_direct_read(p_other uuid, p_id bigint) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := private.require_social_update();
begin
  if p_other is null or p_id is null or p_id <= 0 or not exists (select 1 from auth.users u where u.id = p_other) then return; end if;
  insert into public.direct_reads (reader, other, last_id) values (me, p_other, p_id)
  on conflict (reader, other) do update set last_id = greatest(public.direct_reads.last_id, excluded.last_id);
end;
$$;

-- One row per conversation: the latest message and how many from the other person came after the read spot.
create function public.direct_inbox()
returns table (other uuid, last_id bigint, last_sender uuid, last_body text, last_at timestamptz, unread integer)
language sql stable security invoker set search_path = '' as $$
  with mine as (
    select m.id, m.sender, m.body, m.created_at,
      case when m.sender = (select auth.uid()) then m.recipient else m.sender end as other
    from public.direct_messages m
    where m.sender = (select auth.uid()) or m.recipient = (select auth.uid())
  ), latest as (
    select distinct on (other) other, id, sender, body, created_at from mine order by other, id desc
  )
  select l.other, l.id, l.sender, l.body, l.created_at,
    (select count(*)::integer from mine u
     where u.other = l.other and u.sender <> (select auth.uid())
       and u.id > coalesce((select r.last_id from public.direct_reads r where r.reader = (select auth.uid()) and r.other = l.other), 0))
  from latest l order by l.id desc;
$$;

-- Profiles that work offline -------------------------------------------------

create table public.profile_cards (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  card jsonb check (card is null or (jsonb_typeof(card) = 'object' and pg_column_size(card) <= 2048)),
  last_seen timestamptz,
  updated_at timestamptz not null default now()
);
create index profile_cards_last_seen on public.profile_cards (last_seen desc) where last_seen is not null;
alter table public.profile_cards enable row level security;
revoke all on public.profile_cards from public, anon, authenticated;
grant select on public.profile_cards to authenticated;
create policy profile_cards_visible on public.profile_cards for select to authenticated
  using (not private.apart_from_me(user_id));
create policy school_beta_access on public.profile_cards as restrictive for all to authenticated
  using ((select private.has_school_beta_access())) with check ((select private.has_school_beta_access()));

-- p_card: the visit card while "Show my profile" is on, else null; p_seen: true while "Show me online" is on.
-- Both off removes the row.
create function public.save_profile_card(p_card jsonb, p_seen boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := private.require_social_update();
begin
  if p_card is not null and (jsonb_typeof(p_card) <> 'object' or pg_column_size(p_card) > 2048) then
    raise exception using errcode = '22023', message = 'Invalid profile card';
  end if;
  if p_card is null and not coalesce(p_seen, false) then
    delete from public.profile_cards c where c.user_id = me;
    return;
  end if;
  insert into public.profile_cards (user_id, card, last_seen, updated_at)
  values (me, p_card, case when p_seen then now() end, now())
  on conflict (user_id) do update set card = excluded.card, last_seen = excluded.last_seen, updated_at = now();
end;
$$;

revoke all on function public.add_friend(uuid), public.remove_friend(uuid), public.friend_people(), public.send_direct_message(uuid, text),
  public.mark_direct_read(uuid, bigint), public.direct_inbox(), public.save_profile_card(jsonb, boolean) from public, anon;
grant execute on function public.add_friend(uuid), public.remove_friend(uuid), public.friend_people(), public.send_direct_message(uuid, text),
  public.mark_direct_read(uuid, bigint), public.direct_inbox(), public.save_profile_card(jsonb, boolean) to authenticated;

-- Reports from a private conversation keep a copy of it ------------------------

alter table private.user_reports add column conversation jsonb;
alter table private.user_reports drop constraint user_reports_place_check;
alter table private.user_reports add constraint user_reports_place_check check (place in ('profile', 'chat', 'party', 'message'));

create or replace function public.submit_report(
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
  insert into private.user_reports (reporter, target, reason, place, message, message_id, target_name, target_photo, conversation)
  values (me, p_target, p_reason, p_place, nullif(left(coalesce(p_message, ''), 300), ''),
    case when p_message_id > 0 then p_message_id end,
    nullif(left(coalesce(p_name, ''), 30), ''),
    -- Without the query string: a signed photo link is a password for that file.
    nullif(left(split_part(coalesce(p_photo, ''), '?', 1), 500), ''),
    -- A private conversation is copied (the newest 50 lines), so deleting an account can't erase it.
    case when p_place = 'message' then (
      select jsonb_agg(jsonb_build_object('from', m.sender, 'text', m.body, 'at', m.created_at) order by m.id)
      from (select * from public.direct_messages d
            where least(d.sender, d.recipient) = least(me, p_target) and greatest(d.sender, d.recipient) = greatest(me, p_target)
            order by d.id desc limit 50) m
    ) end)
  returning id into created;
  return created;
end;
$$;

-- The account export includes friends, private messages, read spots and the shared card

do $export$
declare
  body text := pg_get_functiondef('public.export_my_data()'::regprocedure);
begin
  if position('''blocked_people''' in body) = 0 then raise exception 'export_my_data changed; update this migration'; end if;
  body := replace(body, '''blocked_people''',
    '''friend_adds'', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.created_at) FROM public.friend_adds f WHERE f.adder = uid OR f.added = uid), ''[]''::jsonb),
        ''direct_messages'', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM public.direct_messages m WHERE m.sender = uid OR m.recipient = uid), ''[]''::jsonb),
        ''direct_reads'', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.other) FROM public.direct_reads r WHERE r.reader = uid), ''[]''::jsonb),
        ''profile_card'', (SELECT to_jsonb(c) FROM public.profile_cards c WHERE c.user_id = uid),
        ''blocked_people''');
  execute body;
end;
$export$;

notify pgrst, 'reload schema';
commit;
