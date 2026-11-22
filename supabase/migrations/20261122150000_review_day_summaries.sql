-- Old single answers become one small row per learner per day (owner decision, 2026-11-22; expand).
--
-- public.user_review_events grew without limit. The app keeps 120 days of single answers on the device and, for
-- anything older, only what it shows: how many answers, when the first was, and each day's first and last time
-- (streak and study days). So after 180 days the server keeps exactly that, in public.user_review_days, and
-- removes the single rows. private.roll_up_old_reviews runs every night; an answer is rolled up only once both
-- its review time and its arrival are older than the limit, so no device that syncs within 180 days misses one.
-- get_sync_state_recent adds these days to its older_reviews summary. get_sync_state (older apps) is unchanged
-- and simply no longer returns the removed rows. A progress reset clears the days, the account export includes
-- them, and deleting the account removes them. This removes data and cannot be undone; Migrate production
-- takes a proven backup first.
begin;

create table public.user_review_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null check (count > 0),
  first_at timestamptz not null,
  last_at timestamptz not null,
  primary key (user_id, day)
);
alter table public.user_review_days enable row level security;
revoke all on public.user_review_days from public, anon, authenticated;
grant select on public.user_review_days to authenticated;
grant all on public.user_review_days to service_role;
create policy own_review_days_read on public.user_review_days for select to authenticated
  using ((select auth.uid()) = user_id);
create policy school_beta_access on public.user_review_days as restrictive for all to authenticated
  using ((select private.has_school_beta_access())) with check ((select private.has_school_beta_access()));

-- Never keeps fewer than 150 days: the app's full pull asks for the last 125 as single answers.
create function private.roll_up_old_reviews(p_keep_days integer default 180, p_limit integer default 100000)
returns integer
language sql volatile security definer set search_path = '' as $$
  with cutoff as (
    select now() - make_interval(days => greatest(coalesce(p_keep_days, 180), 150)) as at
  ), gone as (
    delete from public.user_review_events e
    where (e.user_id, e.event_id) in (
      select o.user_id, o.event_id from public.user_review_events o, cutoff
      where o.reviewed_at < cutoff.at and o.created_at < cutoff.at
      limit greatest(coalesce(p_limit, 100000), 1)
    )
    returning e.user_id, e.reviewed_at
  ), days as (
    insert into public.user_review_days as d (user_id, day, count, first_at, last_at)
    select user_id, (reviewed_at at time zone 'UTC')::date, count(*), min(reviewed_at), max(reviewed_at)
    from gone group by 1, 2
    on conflict (user_id, day) do update
      set count = d.count + excluded.count,
          first_at = least(d.first_at, excluded.first_at),
          last_at = greatest(d.last_at, excluded.last_at)
    returning 1
  )
  select (select count(*) from gone)::integer from (select count(*) from days) written;
$$;
revoke all on function private.roll_up_old_reviews(integer, integer) from public, anon, authenticated;

create or replace function public.get_sync_state_recent(p_since timestamptz default null, p_recent_days integer default null)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
    with bounds as (
        -- Only a full pull that asks for it is trimmed; an incremental pull already returns just what changed.
        select case when p_since is null and p_recent_days between 1 and 3650
                    then now() - make_interval(days => p_recent_days) end as recent_from
    ), c as (
        select card_id, ease, "interval", repetitions, next_review_date, learning_step,
               last_updated, reviewed_at, learned_at, scheduler_state
        from public.user_card_progress
        where user_id = auth.uid()
          and (p_since is null or last_updated >= p_since)
    ), mine as (
        select payload, created_at, reviewed_at from public.user_review_events
        where user_id = auth.uid() and (p_since is null or created_at >= p_since)
    ), e as (
        select payload, created_at from mine, bounds
        where bounds.recent_from is null or mine.reviewed_at >= bounds.recent_from
    ), older as (
        select mine.reviewed_at from mine, bounds
        where bounds.recent_from is not null and mine.reviewed_at < bounds.recent_from
    ), rolled as (
        -- Days whose single answers were already summarised and removed (private.roll_up_old_reviews).
        select d.count, d.first_at, d.last_at from public.user_review_days d, bounds
        where d.user_id = auth.uid() and bounds.recent_from is not null
    ), older_days as (
        select min(reviewed_at) as first_at, max(reviewed_at) as last_at
        from older group by (reviewed_at at time zone 'UTC')::date
        union all
        select first_at, last_at from rolled
    )
    select jsonb_build_object(
        'cards', coalesce((select jsonb_agg(to_jsonb(c)) from c), '[]'::jsonb),
        'review_events', coalesce((select jsonb_agg(payload - 'before' - 'after' order by created_at) from e), '[]'::jsonb),
        -- The cursor covers every event, also the summarised ones, so the next pull starts after them.
        'cursor', greatest((select max(last_updated) from c), (select max(created_at) from mine)),
        'profile', (
            select jsonb_build_object(
                'updated_at', updated_at,
                'settings', settings,
                'progress_reset_at', progress_reset_at
            )
            from public.user_profiles
            where id = auth.uid()
        ),
        'folders', coalesce((
            select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'color', f.color,
              'role', (select m.role from public.folder_members m where m.folder_id = f.id and m.user_id = auth.uid()),
              'ownerId', f.user_id, 'inviteCode', f.invite_code,
              'memberCount', (select count(*) from public.folder_members m where m.folder_id = f.id)) order by f.created_at, f.id)
            from public.user_folders f
            where f.user_id = auth.uid() or f.id = any(private.my_folder_ids())
        ), '[]'::jsonb)
    ) || case when (select recent_from from bounds) is null then '{}'::jsonb else jsonb_build_object(
        'older_reviews', jsonb_build_object(
            'count', (select count(*) from older) + coalesce((select sum(count) from rolled), 0),
            'first_at', (select floor(extract(epoch from min(first_at)) * 1000) from older_days),
            'times', coalesce((
                select jsonb_agg(t order by t) from (
                    select floor(extract(epoch from first_at) * 1000) as t from older_days
                    union
                    select floor(extract(epoch from last_at) * 1000) from older_days
                ) d
            ), '[]'::jsonb)
        )
    ) end;
$$;


revoke all on function public.get_sync_state_recent(timestamptz, integer) from public, anon;
grant execute on function public.get_sync_state_recent(timestamptz, integer) to authenticated;

CREATE OR REPLACE FUNCTION public.reset_user_learning_progress() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
    IF NOT private.has_school_beta_access() THEN RAISE EXCEPTION 'School beta access required' USING ERRCODE = '42501'; END IF;
    DELETE FROM public.user_review_events WHERE user_id = auth.uid();
    DELETE FROM public.user_review_days WHERE user_id = auth.uid();
    DELETE FROM public.user_card_progress WHERE user_id = auth.uid();

    INSERT INTO public.user_profiles (id, progress_reset_at, updated_at)
    VALUES (auth.uid(), now(), now())
    ON CONFLICT (id) DO UPDATE
        SET progress_reset_at = EXCLUDED.progress_reset_at,
            settings = public.user_profiles.settings - 'grammarProgress',
            updated_at = EXCLUDED.updated_at;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reset_user_learning_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_user_learning_progress() TO authenticated;


do $export$
declare
  body text := pg_get_functiondef('public.export_my_data()'::regprocedure);
begin
  if position('''blocked_people''' in body) = 0 then raise exception 'export_my_data changed; update this migration'; end if;
  body := replace(body, '''blocked_people''',
    '''review_days'', COALESCE((SELECT jsonb_agg(to_jsonb(d) - ''user_id'' ORDER BY d.day) FROM public.user_review_days d WHERE d.user_id = uid), ''[]''::jsonb),
        ''blocked_people''');
  execute body;
end;
$export$;

select cron.schedule('roll-up-old-reviews', '40 19 * * *', $$select private.roll_up_old_reviews()$$);

notify pgrst, 'reload schema';
commit;
