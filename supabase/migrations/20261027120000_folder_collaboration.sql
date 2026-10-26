begin;

create schema if not exists private;

-- Live collaboration is restricted to accounts admitted by the existing beta gate.
create table public.folder_members (
  folder_id uuid not null references public.user_folders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz default now(),
  primary key (folder_id, user_id)
);
create index folder_members_user_id_idx on public.folder_members(user_id);
alter table public.folder_members enable row level security;
revoke all on public.folder_members from public, anon, authenticated;
grant select, delete on public.folder_members to authenticated;

alter table public.user_folders add column invite_code text unique
  check (invite_code is null or invite_code ~ '^[A-Za-z0-9_-]{10,16}$');
-- Members may read/copy the invite link. Only the owner can rotate/clear it.

create function private.my_folder_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.folder_id), '{}'::uuid[])
  from public.folder_members m where m.user_id = auth.uid();
$$;
revoke all on function private.my_folder_ids() from public, anon, authenticated;
grant execute on function private.my_folder_ids() to authenticated;

create policy folder_members_select_member on public.folder_members
  for select to authenticated using (folder_id in (select unnest(private.my_folder_ids())));
create policy folder_members_delete_editor on public.folder_members
  for delete to authenticated using (
    role = 'editor' and (user_id = (select auth.uid()) or exists (
      select 1 from public.user_folders f where f.id = folder_id and f.user_id = (select auth.uid())
    ))
  );
create policy school_beta_access on public.folder_members as restrictive
  for all to authenticated using ((select private.has_school_beta_access()))
  with check ((select private.has_school_beta_access()));

create function public.enforce_folder_member_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Shared with join's row lock: concurrent joins cannot exceed the limit.
  perform 1 from public.user_folders f where f.id = new.folder_id for update;
  if not exists (select 1 from public.folder_members m where m.folder_id = new.folder_id and m.user_id = new.user_id)
    and (select count(*) from public.folder_members m where m.folder_id = new.folder_id) >= 20 then
    raise exception 'A folder can have at most 20 members';
  end if;
  return new;
end;
$$;
create trigger folder_members_cap before insert on public.folder_members
  for each row execute function public.enforce_folder_member_cap();

insert into public.folder_members (folder_id, user_id, role)
select id, user_id, 'owner' from public.user_folders;
create function public.add_folder_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.folder_members(folder_id, user_id, role) values (new.id, new.user_id, 'owner');
  return new;
end;
$$;
create trigger user_folders_add_owner after insert on public.user_folders
  for each row execute function public.add_folder_owner();

-- Folder ownership is immutable: the owner membership must stay in sync.
create function public.protect_folder_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id then raise exception 'Folder owner cannot be changed'; end if;
  return new;
end;
$$;
create trigger user_folders_protect_owner before update on public.user_folders
  for each row execute function public.protect_folder_owner();

drop policy "Users can view their own folders" on public.user_folders;

drop policy "Users can insert their own folders" on public.user_folders;

drop policy "Users can update their own folders" on public.user_folders;

drop policy "Users can delete their own folders" on public.user_folders;

drop policy "Users can view their own flashcards" on public.user_flashcards;

drop policy "Users can insert their own flashcards" on public.user_flashcards;

drop policy "Users can update their own flashcards" on public.user_flashcards;

drop policy "Users can delete their own flashcards" on public.user_flashcards;

create policy user_folders_select_member on public.user_folders for select to authenticated
  using (user_id = (select auth.uid()) or id in (select unnest(private.my_folder_ids())));
create policy user_folders_insert_owner on public.user_folders for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy user_folders_update_owner on public.user_folders for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_folders_delete_owner on public.user_folders for delete to authenticated
  using (user_id = (select auth.uid()));
create policy user_flashcards_select_member on public.user_flashcards for select to authenticated
  using (user_id = (select auth.uid()) or folder_id in (select unnest(private.my_folder_ids())));
create policy user_flashcards_insert_member on public.user_flashcards for insert to authenticated
  with check (user_id = (select auth.uid()) and (folder_id is null or folder_id in (select unnest(private.my_folder_ids()))));
create policy user_flashcards_update_member on public.user_flashcards for update to authenticated
  using (user_id = (select auth.uid()) or folder_id in (select unnest(private.my_folder_ids())))
  with check (folder_id is null or folder_id in (select unnest(private.my_folder_ids())));
create policy user_flashcards_delete_member on public.user_flashcards for delete to authenticated
  using (user_id = (select auth.uid()) or folder_id in (select unnest(private.my_folder_ids())));

alter table public.user_flashcards drop constraint user_flashcards_folder_id_fkey,
  add constraint user_flashcards_folder_id_fkey foreign key (folder_id) references public.user_folders(id) on delete cascade;

create function public.protect_flashcard_creator() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id then raise exception 'Card creator cannot be changed'; end if;
  if new.folder_id is distinct from old.folder_id and old.user_id is distinct from auth.uid() then
    raise exception 'Only the card creator can move this card to another folder';
  end if;
  return new;
end;
$$;
create trigger user_flashcards_protect_creator before update on public.user_flashcards
  for each row execute function public.protect_flashcard_creator();

create function public.enforce_folder_card_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.folder_id is not null and (tg_op = 'INSERT' or new.folder_id is distinct from old.folder_id) then
    perform 1 from public.user_folders f where f.id = new.folder_id for update;
    if (select count(*) from public.user_flashcards c where c.folder_id = new.folder_id) >= 2000 then
      raise exception 'A folder can contain at most 2000 cards';
    end if;
  end if;
  return new;
end;
$$;
create trigger user_flashcards_folder_cap before insert or update of folder_id on public.user_flashcards
  for each row execute function public.enforce_folder_card_cap();
-- The existing per-creator 5000-card cap remains intact.

create function public.create_folder_invite(p_folder_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare code text;
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  -- Core PostgreSQL UUID entropy; no pgcrypto extension is required.
  code := translate(substr(encode(pg_catalog.uuid_send(gen_random_uuid()), 'base64'), 1, 12), '+/', '-_');
  update public.user_folders set invite_code = code where id = p_folder_id and user_id = auth.uid();
  if not found then raise exception 'Only the owner can create an invite'; end if;
  return code;
end;
$$;
create function public.clear_folder_invite(p_folder_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  update public.user_folders set invite_code = null where id = p_folder_id and user_id = auth.uid();
  if not found then raise exception 'Only the owner can clear an invite'; end if;
end;
$$;
create function public.get_folder_invite(p_code text)
returns table(folder_id uuid, name text, color text, card_count int, owner_display_name text, member_count int, already_member boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  return query select f.id, f.name, f.color,
    (select count(*)::int from public.user_flashcards c where c.folder_id = f.id),
    p.settings ->> 'displayName',
    (select count(*)::int from public.folder_members m where m.folder_id = f.id),
    exists (select 1 from public.folder_members m where m.folder_id = f.id and m.user_id = auth.uid())
  from public.user_folders f left join public.user_profiles p on p.id = f.user_id
  where f.invite_code = p_code;
end;
$$;
create function public.join_folder(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  select f.id into target from public.user_folders f where f.invite_code = p_code for update;
  if target is null then raise exception 'Invite link is no longer valid'; end if;
  insert into public.folder_members(folder_id, user_id, role) values (target, auth.uid(), 'editor') on conflict do nothing;
  return target;
end;
$$;
create function public.remove_folder_member(p_folder_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  if not exists (select 1 from public.user_folders f where f.id = p_folder_id and f.user_id = auth.uid()) then
    raise exception 'Only the owner can remove an editor';
  end if;
  if p_user_id = auth.uid() then raise exception 'The owner cannot leave their folder'; end if;
  delete from public.folder_members where folder_id = p_folder_id and user_id = p_user_id and role = 'editor';
end;
$$;
create function public.list_folder_members(p_folder_id uuid)
returns table(user_id uuid, role text, display_name text, avatar_color text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  if not (p_folder_id = any(private.my_folder_ids())) then raise exception 'Folder membership required'; end if;
  return query select m.user_id, m.role, p.settings ->> 'displayName', p.settings ->> 'avatarColor'
    from public.folder_members m left join public.user_profiles p on p.id = m.user_id
    where m.folder_id = p_folder_id order by m.role desc, m.created_at, m.user_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_sync_state(p_since timestamptz DEFAULT NULL)
RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = ''
    AS $$
    WITH c AS (
        SELECT card_id, ease, "interval", repetitions, next_review_date, learning_step,
               last_updated, reviewed_at, learned_at, scheduler_state
        FROM public.user_card_progress
        WHERE user_id = auth.uid()
          AND (p_since IS NULL OR last_updated >= p_since)
    ), e AS (
        SELECT payload, created_at FROM public.user_review_events
        WHERE user_id = auth.uid() AND (p_since IS NULL OR created_at >= p_since)
    )
    SELECT jsonb_build_object(
        'cards', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM c), '[]'::jsonb),
        'review_events', COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM e), '[]'::jsonb),
        'cursor', GREATEST((SELECT max(last_updated) FROM c), (SELECT max(created_at) FROM e)),
        'profile', (
            SELECT jsonb_build_object(
                'updated_at', updated_at,
                'settings', settings,
                'progress_reset_at', progress_reset_at
            )
            FROM public.user_profiles
            WHERE id = auth.uid()
        ),
        'folders', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'color', f.color,
              'role', case when f.user_id = auth.uid() then 'owner' else 'editor' end,
              'ownerId', f.user_id, 'inviteCode', f.invite_code,
              'memberCount', (select count(*) from public.folder_members m where m.folder_id = f.id)) ORDER BY f.created_at, f.id)
            FROM public.user_folders f
            WHERE f.user_id = auth.uid() or f.id = any(private.my_folder_ids())
        ), '[]'::jsonb)
    );
$$;

-- Export intentionally includes only caller-owned folders/cards, never other creators’ cards.
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
        ), '[]'::jsonb),
        'review_events', COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM public.user_review_events WHERE user_id = uid), '[]'::jsonb),
        'card_progress', COALESCE((
            SELECT jsonb_agg(to_jsonb(g) ORDER BY g.card_id)
            FROM public.user_card_progress g WHERE g.user_id = uid
        ), '[]'::jsonb)
    );
END;
$$;

revoke all on function public.enforce_folder_member_cap() from public, anon, authenticated;
revoke all on function public.add_folder_owner() from public, anon, authenticated;
revoke all on function public.protect_folder_owner() from public, anon, authenticated;
revoke all on function public.protect_flashcard_creator() from public, anon, authenticated;
revoke all on function public.enforce_folder_card_cap() from public, anon, authenticated;
revoke all on function public.create_folder_invite(uuid) from public, anon;
grant execute on function public.create_folder_invite(uuid) to authenticated;
revoke all on function public.clear_folder_invite(uuid) from public, anon;
grant execute on function public.clear_folder_invite(uuid) to authenticated;
revoke all on function public.get_folder_invite(text) from public, anon;
grant execute on function public.get_folder_invite(text) to authenticated;
revoke all on function public.join_folder(text) from public, anon;
grant execute on function public.join_folder(text) to authenticated;
revoke all on function public.remove_folder_member(uuid, uuid) from public, anon;
grant execute on function public.remove_folder_member(uuid, uuid) to authenticated;
revoke all on function public.list_folder_members(uuid) from public, anon;
grant execute on function public.list_folder_members(uuid) to authenticated;
revoke all on function public.get_sync_state(timestamptz) from public, anon;
grant execute on function public.get_sync_state(timestamptz) to authenticated;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

notify pgrst, 'reload schema';
commit;
