-- Blocks and reports for Study together (expand; nothing reads them until the matching app ships).
--
-- public.user_blocks: a learner's own block list, kept with the name and colour the
-- person had when blocked so Settings can list them. Learners read and remove their
-- own rows; adding goes through public.block_user() (at most 100, the most the
-- Lobby accepts in one message). The games Worker
-- never reads this table: the app sends its own list to the Lobby, which hides the
-- two people from each other.
--
-- private.user_reports: what learners report, read only by the owner:
--   select * from private.user_reports order by id desc limit 50;
-- `message` is the line as the reporter saw it. Reports outlive both accounts
-- (no foreign keys) so a deleted account can't erase what was said; at most 20
-- reports per reporter per day.

begin;

create table public.user_blocks (
  blocker uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  blocked_name text not null default '' check (char_length(blocked_name) <= 30),
  blocked_color text not null default '' check (char_length(blocked_color) <= 20),
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index user_blocks_blocked on public.user_blocks (blocked);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from public, anon, authenticated;
grant select, delete on public.user_blocks to authenticated;
create policy user_blocks_own_read on public.user_blocks for select to authenticated
  using (blocker = (select auth.uid()));
create policy user_blocks_own_delete on public.user_blocks for delete to authenticated
  using (blocker = (select auth.uid()));
create policy school_beta_access on public.user_blocks as restrictive for all to authenticated
  using ((select private.has_school_beta_access())) with check ((select private.has_school_beta_access()));

create table private.user_reports (
  id bigint generated always as identity primary key,
  reporter uuid not null,
  target uuid not null,
  reason text not null check (reason in ('spam', 'rude', 'unsafe', 'other')),
  place text not null check (place in ('profile', 'chat', 'party')),
  message text check (char_length(message) <= 300),
  created_at timestamptz not null default now()
);
create index user_reports_reporter on private.user_reports (reporter, created_at);
alter table private.user_reports enable row level security;
revoke all on private.user_reports from public, anon, authenticated;

create function public.block_user(p_user uuid, p_name text default '', p_color text default '')
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise sqlstate 'PT401' using message = 'Sign in required.'; end if;
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  if p_user is null or p_user = me then raise exception using errcode = '22023', message = 'You can''t block yourself.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('user_blocks:' || me::text, 0));
  if exists (select 1 from public.user_blocks b where b.blocker = me and b.blocked = p_user) then return false; end if;
  if (select count(*) from public.user_blocks b where b.blocker = me) >= 100 then
    raise exception using errcode = '54000', message = 'You''ve blocked the most people allowed.';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then return false; end if;
  insert into public.user_blocks (blocker, blocked, blocked_name, blocked_color)
  values (me, p_user, left(coalesce(p_name, ''), 30), left(coalesce(p_color, ''), 20));
  return true;
end;
$$;

create function public.report_user(p_target uuid, p_reason text, p_place text, p_message text default null)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise sqlstate 'PT401' using message = 'Sign in required.'; end if;
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  if p_target is null or p_target = me then raise exception using errcode = '22023', message = 'You can''t report yourself.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('user_reports:' || me::text, 0));
  if (select count(*) from private.user_reports r where r.reporter = me and r.created_at > now() - interval '1 day') >= 20 then
    raise exception using errcode = '54000', message = 'You''ve sent a lot of reports today. Try again tomorrow.';
  end if;
  insert into private.user_reports (reporter, target, reason, place, message)
  values (me, p_target, p_reason, p_place, nullif(left(coalesce(p_message, ''), 300), ''));
  return true;
end;
$$;

revoke all on function public.block_user(uuid, text, text), public.report_user(uuid, text, text, text) from public, anon;
grant execute on function public.block_user(uuid, text, text), public.report_user(uuid, text, text, text) to authenticated;

-- The account export includes the learner's own block list (reports stay with the owner).
CREATE OR REPLACE FUNCTION public.export_my_data() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = ''
    AS $$
DECLARE
    uid uuid := auth.uid();
BEGIN
    IF uid IS NULL THEN
        RAISE EXCEPTION 'export_my_data: not authenticated'
            USING ERRCODE = '28000';
    END IF;

    RETURN jsonb_build_object(
        'exported_at', now(),
        'profile', (
            SELECT to_jsonb(p) FROM public.user_profiles p WHERE p.id = uid
        ),
        'folders', COALESCE((
            SELECT jsonb_agg(to_jsonb(f) ORDER BY f.created_at)
            FROM public.user_folders f WHERE f.user_id = uid
        ), '[]'::jsonb),
        'flashcards', COALESCE((
            SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at)
            FROM public.user_flashcards c WHERE c.user_id = uid
              AND (c.folder_id IS NULL OR c.folder_id = ANY(private.my_folder_ids()))
        ), '[]'::jsonb),
        'review_events', COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM public.user_review_events WHERE user_id = uid), '[]'::jsonb),
        'card_progress', COALESCE((
            SELECT jsonb_agg(to_jsonb(g) ORDER BY g.card_id)
            FROM public.user_card_progress g WHERE g.user_id = uid
        ), '[]'::jsonb),
        'blocked_people', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('name', b.blocked_name, 'blocked_at', b.created_at) ORDER BY b.created_at)
            FROM public.user_blocks b WHERE b.blocker = uid
        ), '[]'::jsonb)
    );
END;
$$;

notify pgrst, 'reload schema';
commit;
