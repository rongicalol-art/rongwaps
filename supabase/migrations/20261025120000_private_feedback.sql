-- Operator inbox. No client role may read or write the underlying table.
create table private.feedback (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  path text not null check (char_length(path) <= 256 and path ~ '^/[^?#[:space:]]*$' and path !~ '^//'),
  browser text not null check (char_length(browser) <= 512),
  app_version text not null check (char_length(app_version) <= 64),
  created_at timestamptz not null default now()
);
alter table private.feedback enable row level security;
revoke all on private.feedback from public, anon, authenticated;
create index feedback_user_created_at on private.feedback(user_id, created_at desc);

create function public.submit_feedback(p_id uuid, p_message text, p_path text, p_browser text, p_app_version text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null or not public.has_beta_access() then
    raise insufficient_privilege using message = 'Sign in to send feedback.';
  end if;
  -- Serialize submissions per account, including across server replicas.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text, 0));
  if exists (select 1 from private.feedback where id = p_id and user_id = caller) then
    if not exists (select 1 from private.feedback where id = p_id and user_id = caller
      and message = btrim(p_message) and path = p_path) then
      raise invalid_parameter_value using message = 'Submission id already used.';
    end if;
    return false;
  end if;
  if (select count(*) from private.feedback where user_id = caller and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Please wait before sending more feedback.';
  end if;
  insert into private.feedback(id, user_id, message, path, browser, app_version)
  values (p_id, caller, btrim(p_message), p_path, p_browser, p_app_version);
  return true;
end;
$$;
revoke all on function public.submit_feedback(uuid, text, text, text, text) from public, anon;
grant execute on function public.submit_feedback(uuid, text, text, text, text) to authenticated;
