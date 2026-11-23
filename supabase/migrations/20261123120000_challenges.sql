-- Challenge links (expand only: the previous app version never touches any of this).
--
-- public.challenges: a lesson quiz a learner chose to share with "Challenge a classmate". It keeps the quiz
--   (book, lessons and parts, quiz types: shared/quizRace.parseSelection), the sender's first pass (correct of
--   total, and `run`: the milliseconds from the first question at which each word was answered, so a classmate
--   can race a replay of it), the sender's display name and colour as they were when shared, and how many
--   classmates became friends through it. It expires after 30 days and is deleted a day later.
-- Only the functions below read or write it. It cascades with the sender's account; export_my_data includes it.
--
-- create_challenge: the sender stores one (at most 20 a day).
-- challenge_card: a signed-in learner with the link sees the name, colour, quiz and run, never who the sender's
--   account is (signed out, the invite shows only the lesson: every request needs a sign-in). Nothing for an
--   expired code, a closed account, or a pair who blocked each other.
-- accept_challenge_friend: one tap makes the classmate and the sender friends, because sharing the link was the
--   sender's yes. After 30 such friends from one link (a link forwarded around a big group), or when the
--   sender's list is full, the tap becomes an ordinary friend request.

begin;

create table public.challenges (
  code text primary key check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'),
  sender uuid not null references auth.users (id) on delete cascade,
  sender_name text not null check (char_length(sender_name) between 1 and 30),
  sender_color text not null check (sender_color in ('blue', 'honey', 'jade', 'plum', 'ink')),
  selection jsonb not null check (jsonb_typeof(selection) = 'object' and pg_column_size(selection) <= 1024),
  correct smallint not null,
  total smallint not null,
  run integer[] not null,
  friend_adds smallint not null default 0 check (friend_adds >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  check (total between 1 and 2000 and correct between 0 and total and cardinality(run) = total)
);
create index challenges_sender on public.challenges (sender, created_at desc);
create index challenges_expires on public.challenges (expires_at);
alter table public.challenges enable row level security;
revoke all on public.challenges from public, anon, authenticated;

create function public.create_challenge(p_code text, p_selection jsonb, p_correct integer, p_total integer, p_run integer[])
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  previous integer := 0;
  mark integer;
  shown_name text;
  shown_color text;
begin
  if me is null then raise sqlstate 'PT401' using message = 'Sign in required.'; end if;
  if not private.has_school_beta_access() then raise exception 'School beta access required' using errcode = '42501'; end if;
  if p_code is null or p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
    or p_selection is null or jsonb_typeof(p_selection) <> 'object' or pg_column_size(p_selection) > 1024
    or p_total is null or p_total < 1 or p_total > 2000 or p_correct is null or p_correct < 0 or p_correct > p_total
    or p_run is null or cardinality(p_run) <> p_total or array_position(p_run, null) is not null then
    raise exception using errcode = '22023', message = 'Invalid challenge.';
  end if;
  foreach mark in array p_run loop
    if mark < previous or mark > 3600000 then raise exception using errcode = '22023', message = 'Invalid challenge.'; end if;
    previous := mark;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('challenges:' || me::text, 0));
  if (select count(*) from public.challenges c where c.sender = me and c.created_at > now() - interval '1 day') >= 20 then
    raise exception using errcode = '54000', message = 'You''ve shared the most challenges for today.';
  end if;
  -- The name and colour classmates see for this account (as public.friend_people shows them).
  select left(coalesce(nullif(btrim(regexp_replace(p.settings ->> 'displayName', '[[:cntrl:]]', '', 'g')), ''),
      nullif(split_part(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ' ', 1), ''), 'Student'), 30),
    coalesce(nullif(p.settings ->> 'avatarColor', ''), 'blue')
  into shown_name, shown_color
  from auth.users u left join public.user_profiles p on p.id = u.id where u.id = me;
  if shown_color not in ('blue', 'honey', 'jade', 'plum', 'ink') then shown_color := 'blue'; end if;
  insert into public.challenges (code, sender, sender_name, sender_color, selection, correct, total, run)
  values (p_code, me, coalesce(nullif(shown_name, ''), 'Student'), shown_color, p_selection, p_correct, p_total, p_run);
end;
$$;

create function public.challenge_card(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', c.sender_name, 'color', c.sender_color, 'selection', c.selection,
    'correct', c.correct, 'total', c.total, 'run', to_jsonb(c.run),
    'mine', c.sender = (select auth.uid()),
    'friends', private.friends((select auth.uid()), c.sender))
  from public.challenges c
  where c.code = p_code and c.expires_at > now()
    and not exists (select 1 from private.account_flags f where f.user_id = c.sender and f.banned_at is not null)
    and private.has_school_beta_access() and not private.apart((select auth.uid()), c.sender);
$$;

-- 'friends', or 'requested' when this link has made its 30 friends or the sender's list is full.
create function public.accept_challenge_friend(p_code text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := private.require_social_update();
  found_challenge public.challenges;
begin
  select * into found_challenge from public.challenges c where c.code = p_code and c.expires_at > now() for update;
  if not found or exists (select 1 from private.account_flags f where f.user_id = found_challenge.sender and f.banned_at is not null) then
    raise exception using errcode = '22023', message = 'This challenge has ended.';
  end if;
  if found_challenge.sender = me then raise exception using errcode = '22023', message = 'This is your own challenge.'; end if;
  if private.apart(me, found_challenge.sender) then raise exception using errcode = '22023', message = 'You can''t add this person.'; end if;
  if private.friends(me, found_challenge.sender) then return 'friends'; end if;
  -- add_friend takes each adder's lock; both adders here, always in the same order.
  perform pg_advisory_xact_lock(hashtextextended('friend_adds:' || least(me::text, found_challenge.sender::text), 0));
  perform pg_advisory_xact_lock(hashtextextended('friend_adds:' || greatest(me::text, found_challenge.sender::text), 0));
  if not exists (select 1 from public.friend_adds f where f.adder = me and f.added = found_challenge.sender)
    and (select count(*) from public.friend_adds f where f.adder = me) >= 300 then
    raise exception using errcode = '54000', message = 'You''ve added the most friends allowed.';
  end if;
  insert into public.friend_adds (adder, added) values (me, found_challenge.sender) on conflict do nothing;
  if found_challenge.friend_adds >= 30
    or (not exists (select 1 from public.friend_adds f where f.adder = found_challenge.sender and f.added = me)
      and (select count(*) from public.friend_adds f where f.adder = found_challenge.sender) >= 300) then
    return case when private.friends(me, found_challenge.sender) then 'friends' else 'requested' end;
  end if;
  insert into public.friend_adds (adder, added) values (found_challenge.sender, me) on conflict do nothing;
  update public.challenges set friend_adds = friend_adds + 1 where code = found_challenge.code;
  return 'friends';
end;
$$;

revoke all on function public.create_challenge(text, jsonb, integer, integer, integer[]), public.challenge_card(text),
  public.accept_challenge_friend(text) from public, anon, authenticated;
grant execute on function public.create_challenge(text, jsonb, integer, integer, integer[]), public.challenge_card(text),
  public.accept_challenge_friend(text) to authenticated;

-- Download my data: the challenges this account shared.
do $export$
declare
  body text := pg_get_functiondef('public.export_my_data()'::regprocedure);
begin
  if position('''blocked_people''' in body) = 0 then raise exception 'export_my_data changed; update this migration'; end if;
  body := replace(body, '''blocked_people''',
    '''challenges'', COALESCE((SELECT jsonb_agg(to_jsonb(c) - ''sender'' ORDER BY c.created_at) FROM public.challenges c WHERE c.sender = uid), ''[]''::jsonb),
        ''blocked_people''');
  execute body;
end;
$export$;

select cron.schedule('delete-expired-challenges', '50 19 * * *', $$delete from public.challenges where expires_at < now() - interval '1 day'$$);

notify pgrst, 'reload schema';
commit;
