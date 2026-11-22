-- A full pull no longer has to carry every answer ever given (expand: the previous app keeps working).
-- Engineering audit, 2026-11-22.
--
-- get_sync_state is unchanged (older apps: every review event, as before). The new get_sync_state_recent takes
-- p_recent_days: a full pull (p_since is null) returns the events of the last p_recent_days in full and, for
-- everything older, only what the app still shows: how many there were, when the first one was, and the first
-- and last time of each UTC day (enough for the app to tell which of its own calendar days were studied, in
-- any time zone, for the streak). A learner's history then costs a new device kilobytes, not megabytes, and
-- the statement stays far from its time limit however long the history grows.

begin;

create function public.get_sync_state_recent(p_since timestamptz default null, p_recent_days integer default null)
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
    ), older_days as (
        select min(reviewed_at) as first_at, max(reviewed_at) as last_at
        from older group by (reviewed_at at time zone 'UTC')::date
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
            'count', (select count(*) from older),
            'first_at', (select floor(extract(epoch from min(reviewed_at)) * 1000) from older),
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

notify pgrst, 'reload schema';
commit;
