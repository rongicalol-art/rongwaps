-- Inactive account cleanup (2026-10-23)
--
-- Terms §5 and Privacy §6 promise that accounts with no sign-in for 12 months
-- are deleted. "Activity" is the newest of every signal we have, so a learner
-- who stays signed in (token refreshes, no fresh sign-in) is never deleted:
-- account creation, last sign-in, session refresh, profile/settings writes,
-- card progress writes and review events. Accounts on either owner allowlist
-- are exempt.
--
-- Deleting the auth user cascades to every user table (see
-- 20261007130000_account_delete_and_export.sql). Profile photos live in
-- Storage, which SQL cannot delete; `scripts/dev/purgeOrphanProfileMedia.ts`
-- removes photos whose account no longer exists.
--
-- Runs daily at 03:00 Taiwan time (19:00 UTC) via pg_cron, at most 500
-- accounts per run. Dry run: select * from private.inactive_accounts();

begin;

create extension if not exists pg_cron;

create function private.inactive_accounts(p_cutoff timestamptz default now() - interval '12 months')
returns table (user_id uuid, last_active timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.id, activity.last_active
  from auth.users u
  cross join lateral (
    select greatest(
      u.created_at,
      u.last_sign_in_at,
      (select max(s.updated_at) from auth.sessions s where s.user_id = u.id),
      (select p.updated_at from public.user_profiles p where p.id = u.id),
      (select max(c.last_updated) from public.user_card_progress c where c.user_id = u.id),
      (select max(e.created_at) from public.user_review_events e where e.user_id = u.id)
    ) as last_active
  ) activity
  where activity.last_active < p_cutoff
    and not exists (
      select 1 from private.beta_owner_emails o where o.email = lower(u.email)
    )
    and not exists (
      select 1 from private.full_course_access_emails g where g.email = lower(u.email)
    )
  order by activity.last_active
$$;

create function private.delete_inactive_accounts(p_limit integer default 500)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  deleted integer;
begin
  with doomed as (
    select i.user_id from private.inactive_accounts() i limit greatest(p_limit, 0)
  )
  delete from auth.users u using doomed d where u.id = d.user_id;
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

revoke all on function private.inactive_accounts(timestamptz), private.delete_inactive_accounts(integer)
  from public, anon, authenticated;

select cron.schedule(
  'delete-inactive-accounts',
  '0 19 * * *',
  $$select private.delete_inactive_accounts()$$
);

commit;
