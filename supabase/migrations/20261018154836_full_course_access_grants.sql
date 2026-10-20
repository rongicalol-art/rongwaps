-- Full-course grants stay private and are checked against the caller's saved,
-- provider-owned Google identity. Client metadata cannot grant lesson access.
create table private.full_course_access_emails (
  email text primary key check (email = lower(trim(email)))
);
alter table private.full_course_access_emails enable row level security;
revoke all on private.full_course_access_emails from public, anon, authenticated;

insert into private.full_course_access_emails (email)
values ('s25113312@stu.edu.tw');

create function private.full_course_user_allowed(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join auth.identities i on i.user_id = u.id
    join private.full_course_access_emails g
      on g.email = lower(i.identity_data ->> 'email')
    where u.id = target_user
      and u.email_confirmed_at is not null
      and lower(u.email) = lower(i.identity_data ->> 'email')
      and private.school_beta_identity_allowed(i.provider, i.identity_data)
  );
$$;

create function private.has_full_course_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and private.full_course_user_allowed((select auth.uid()));
$$;

create function public.has_full_course_access()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.has_full_course_access();
$$;

revoke all on function private.full_course_user_allowed(uuid),
  private.has_full_course_access(), public.has_full_course_access()
  from public, anon, authenticated;
grant execute on function private.has_full_course_access() to authenticated;
grant execute on function public.has_full_course_access() to authenticated;
