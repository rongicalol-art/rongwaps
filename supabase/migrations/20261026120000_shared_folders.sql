begin;

create table public.shared_folders (
  id text primary key check (char_length(id) between 8 and 16 and id ~ '^[A-Za-z0-9_-]+$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_folder_id uuid unique references public.user_folders(id) on delete cascade,
  name text not null check (char_length(name) <= 200),
  color text check (color is null or char_length(color) <= 64),
  cards jsonb not null check (
    case when jsonb_typeof(cards) = 'array'
      then jsonb_array_length(cards) <= 500 and pg_column_size(cards) <= 262144
      else false
    end
  ),
  save_count integer not null default 0 check (save_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shared_folders_owner_id_idx on public.shared_folders(owner_id);
alter table public.shared_folders enable row level security;
revoke all on public.shared_folders from public, anon, authenticated;
grant select, delete on public.shared_folders to authenticated;
grant insert (id, owner_id, source_folder_id, name, color, cards, created_at, updated_at)
  on public.shared_folders to authenticated;
-- Column-level grants omit save_count on both INSERT and UPDATE, so owners cannot set it directly.
grant update (name, color, cards, updated_at) on public.shared_folders to authenticated;

create policy shared_folders_select_owner on public.shared_folders
  for select to authenticated using (owner_id = (select auth.uid()));
create policy shared_folders_insert_owner on public.shared_folders
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy shared_folders_update_owner on public.shared_folders
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy shared_folders_delete_owner on public.shared_folders
  for delete to authenticated using (owner_id = (select auth.uid()));

create function public.enforce_shared_folder_owner_and_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner_folder_user uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text, 0));
  if new.source_folder_id is not null then
    select f.user_id into owner_folder_user
    from public.user_folders f where f.id = new.source_folder_id;
    if owner_folder_user is distinct from new.owner_id then
      raise exception 'Source folder must belong to the share owner';
    end if;
  end if;
  if (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id)
     and (select count(*) from public.shared_folders s where s.owner_id = new.owner_id) >= 50 then
    raise exception 'A user can share at most 50 folders';
  end if;
  -- Only a republished snapshot counts as an update; a save-count bump does not.
  if tg_op = 'UPDATE' and (new.name, new.color, new.cards) is distinct from (old.name, old.color, old.cards) then
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_shared_folder_owner_and_cap() from public, anon, authenticated;
create trigger shared_folders_before_write
  before insert or update on public.shared_folders
  for each row execute function public.enforce_shared_folder_owner_and_cap();

create table public.shared_folder_saves (
  share_id text not null references public.shared_folders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (share_id, user_id)
);
create index shared_folder_saves_user_id_idx on public.shared_folder_saves(user_id);
alter table public.shared_folder_saves enable row level security;
revoke all on public.shared_folder_saves from public, anon, authenticated;

create function public.get_shared_folder(p_id text)
returns table (
  id text,
  name text,
  color text,
  cards jsonb,
  save_count integer,
  owner_display_name text,
  updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.color, s.cards, s.save_count,
         p.settings ->> 'displayName', s.updated_at
  from public.shared_folders s
  left join public.user_profiles p on p.id = s.owner_id
  where s.id = p_id;
$$;
revoke all on function public.get_shared_folder(text) from public, anon;
grant execute on function public.get_shared_folder(text) to authenticated;

create function public.save_shared_folder(p_id text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  caller_id uuid := auth.uid();
  inserted_count integer;
  current_count integer;
begin
  if caller_id is null then raise exception 'Sign in required'; end if;

  if not exists (select 1 from public.shared_folders s where s.id = p_id) then
    raise exception 'Shared folder not found';
  end if;
  if exists (select 1 from public.shared_folders s where s.id = p_id and s.owner_id = caller_id) then
    select s.save_count into current_count from public.shared_folders s where s.id = p_id;
    return current_count;
  end if;

  insert into public.shared_folder_saves (share_id, user_id)
  values (p_id, caller_id) on conflict do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    update public.shared_folders s set save_count = s.save_count + 1 where s.id = p_id
    returning s.save_count into current_count;
  else
    select s.save_count into current_count from public.shared_folders s where s.id = p_id;
  end if;
  return current_count;
end;
$$;
revoke all on function public.save_shared_folder(text) from public, anon;
grant execute on function public.save_shared_folder(text) to authenticated;

commit;
