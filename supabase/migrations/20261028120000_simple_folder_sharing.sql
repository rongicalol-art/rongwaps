begin;

alter table public.folder_members drop constraint folder_members_role_check;
alter table public.folder_members add constraint folder_members_role_check
  check (role in ('owner', 'editor', 'viewer'));

create function private.my_editable_folder_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.folder_id), '{}'::uuid[])
  from public.folder_members m where m.user_id = auth.uid() and m.role in ('owner', 'editor');
$$;
revoke all on function private.my_editable_folder_ids() from public, anon, authenticated;
grant execute on function private.my_editable_folder_ids() to authenticated;

-- Authorship must not retain access to live shared content after membership ends.
drop policy user_flashcards_select_member on public.user_flashcards;
create policy user_flashcards_select_member on public.user_flashcards for select to authenticated
  using ((folder_id is null and user_id = (select auth.uid())) or folder_id in (select unnest(private.my_folder_ids())));

drop policy user_flashcards_insert_member on public.user_flashcards;
drop policy user_flashcards_update_member on public.user_flashcards;
drop policy user_flashcards_delete_member on public.user_flashcards;
create policy user_flashcards_insert_member on public.user_flashcards for insert to authenticated
  with check (user_id = (select auth.uid()) and (folder_id is null or folder_id in (select unnest(private.my_editable_folder_ids()))));
create policy user_flashcards_update_member on public.user_flashcards for update to authenticated
  using ((user_id = (select auth.uid()) and (folder_id is null or folder_id in (select unnest(private.my_editable_folder_ids())))) or folder_id in (select unnest(private.my_editable_folder_ids())))
  with check (folder_id is null or folder_id in (select unnest(private.my_editable_folder_ids())));
create policy user_flashcards_delete_member on public.user_flashcards for delete to authenticated
  using ((user_id = (select auth.uid()) and (folder_id is null or folder_id in (select unnest(private.my_editable_folder_ids())))) or folder_id in (select unnest(private.my_editable_folder_ids())));

create or replace function public.join_folder(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  select f.id into target from public.user_folders f where f.invite_code = p_code for update;
  if target is null then raise exception 'Invite link is no longer valid'; end if;
  insert into public.folder_members(folder_id, user_id, role) values (target, auth.uid(), 'viewer') on conflict do nothing;
  return target;
end;
$$;

create function public.set_folder_member_role(p_folder_id uuid, p_user_id uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  if p_role is null or p_role not in ('viewer', 'editor') then raise exception 'Role must be viewer or editor'; end if;
  perform 1 from public.user_folders f where f.id = p_folder_id and f.user_id = auth.uid() for update;
  if not found then raise exception 'Only the owner can change member roles'; end if;
  if exists (select 1 from public.folder_members m where m.folder_id = p_folder_id and m.user_id = p_user_id and m.role = 'owner') then
    raise exception 'The owner role cannot be changed';
  end if;
  update public.folder_members set role = p_role where folder_id = p_folder_id and user_id = p_user_id and role <> 'owner';
  if not found then raise exception 'Folder member not found'; end if;
end;
$$;

create or replace function public.remove_folder_member(p_folder_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  if not exists (select 1 from public.user_folders f where f.id = p_folder_id and f.user_id = auth.uid()) then
    raise exception 'Only the owner can remove a member';
  end if;
  if p_user_id = auth.uid() then raise exception 'The owner cannot leave their folder'; end if;
  delete from public.folder_members where folder_id = p_folder_id and user_id = p_user_id and role <> 'owner';
end;
$$;

drop policy folder_members_delete_editor on public.folder_members;
create policy folder_members_delete_non_owner on public.folder_members
  for delete to authenticated using (
    role <> 'owner' and (user_id = (select auth.uid()) or exists (
      select 1 from public.user_folders f where f.id = folder_id and f.user_id = (select auth.uid())
    ))
  );

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
              'role', (select m.role from public.folder_members m where m.folder_id = f.id and m.user_id = auth.uid()),
              'ownerId', f.user_id, 'inviteCode', f.invite_code,
              'memberCount', (select count(*) from public.folder_members m where m.folder_id = f.id)) ORDER BY f.created_at, f.id)
            FROM public.user_folders f
            WHERE f.user_id = auth.uid() or f.id = any(private.my_folder_ids())
        ), '[]'::jsonb)
    );
$$;

revoke all on function public.join_folder(text) from public, anon, authenticated;
grant execute on function public.join_folder(text) to authenticated;
revoke all on function public.set_folder_member_role(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_folder_member_role(uuid, uuid, text) to authenticated;
revoke all on function public.remove_folder_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_folder_member(uuid, uuid) to authenticated;
revoke all on function public.get_sync_state(timestamptz) from public, anon, authenticated;
grant execute on function public.get_sync_state(timestamptz) to authenticated;

drop function if exists public.save_shared_folder(text);
drop function if exists public.get_shared_folder(text);
drop table if exists public.shared_folder_saves;
drop table if exists public.shared_folders;
drop function if exists public.enforce_shared_folder_owner_and_cap();

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
        ), '[]'::jsonb)
    );
END;
$$;

notify pgrst, 'reload schema';
commit;
