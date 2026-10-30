begin;

-- Removing a member also replaces the folder's invite code, so the removed
-- person cannot rejoin with the link they already hold. Remaining members
-- read the new code on their next sync.
create or replace function public.remove_folder_member(p_folder_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_school_beta_access() then raise exception 'School beta access required'; end if;
  if not exists (select 1 from public.user_folders f where f.id = p_folder_id and f.user_id = auth.uid()) then
    raise exception 'Only the owner can remove a member';
  end if;
  if p_user_id = auth.uid() then raise exception 'The owner cannot leave their folder'; end if;
  delete from public.folder_members where folder_id = p_folder_id and user_id = p_user_id and role <> 'owner';
  if found then
    update public.user_folders
      set invite_code = translate(substr(encode(pg_catalog.uuid_send(gen_random_uuid()), 'base64'), 1, 12), '+/', '-_')
      where id = p_folder_id and invite_code is not null;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
