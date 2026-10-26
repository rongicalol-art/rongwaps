-- Rollback-only fixture for a disposable Supabase database after all migrations.
-- Never run against owner progress. psql -v ON_ERROR_STOP=1 -f this-file
begin;
create function pg_temp.check_collab(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception '%', label; end if; end;
$$;
insert into auth.users(id, email, email_confirmed_at) values
 ('f0000000-0000-0000-0000-000000000001', 's90000001@stu.edu.tw', now()),
 ('f0000000-0000-0000-0000-000000000002', 's90000002@stu.edu.tw', now()),
 ('f0000000-0000-0000-0000-000000000003', 's90000003@stu.edu.tw', now());
insert into auth.identities(id, user_id, provider_id, provider, identity_data) values
 ('f0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001','collab-owner','google','{"email":"s90000001@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}'),
 ('f0000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000002','collab-editor','google','{"email":"s90000002@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}'),
 ('f0000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000003','collab-outsider','google','{"email":"s90000003@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}');
set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';
set local role authenticated;
insert into public.user_folders(id, user_id, name, color, invite_code) values
 ('f1000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001','Collaborative fixture','blue','collabtest01');
insert into public.user_flashcards(id,user_id,folder_id,simplified,translation,created_at) values
 ('f2000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','字','character',1);
select pg_temp.check_collab((select count(*) from public.folder_members where role = 'owner') = 1, 'owner membership trigger');

set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
select public.join_folder('collabtest01');
select public.join_folder('collabtest01');
select pg_temp.check_collab((select count(*) from public.folder_members) = 2, 'join idempotent');
select pg_temp.check_collab((select count(*) from public.user_flashcards) = 1, 'member reads owner cards');
select pg_temp.check_collab((public.get_sync_state()->'folders'->0->>'role') = 'editor', 'sync includes editor role');
select pg_temp.check_collab(jsonb_array_length(public.get_sync_state()->'flashcards') = 1, 'sync includes shared cards');
select pg_temp.check_collab(jsonb_array_length(public.export_my_data()->'flashcards') = 0, 'export excludes other creator data');
insert into public.user_flashcards(id,user_id,folder_id,simplified,translation,created_at) values
 ('f2000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000002','f1000000-0000-0000-0000-000000000001','詞','word',2);
update public.user_flashcards set translation = 'edited by member' where id = 'f2000000-0000-0000-0000-000000000001';
select pg_temp.check_collab((select translation from public.user_flashcards where id = 'f2000000-0000-0000-0000-000000000001') = 'edited by member', 'member edits another creator card');
do $$ begin
  begin
    update public.user_flashcards set folder_id = null where id = 'f2000000-0000-0000-0000-000000000001';
    raise exception 'move was incorrectly allowed';
  exception when raise_exception then
    if sqlerrm <> 'Only the card creator can move this card to another folder' then raise; end if;
  end;
  begin
    update public.user_flashcards set user_id = auth.uid() where id = 'f2000000-0000-0000-0000-000000000001';
    raise exception 'creator change was incorrectly allowed';
  exception when raise_exception then
    if sqlerrm <> 'Card creator cannot be changed' then raise; end if;
  end;
end $$;
update public.user_folders set name = 'stolen' where id = 'f1000000-0000-0000-0000-000000000001';
select pg_temp.check_collab((select name from public.user_folders) = 'Collaborative fixture', 'editor cannot rename folder');

set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000003';
select pg_temp.check_collab((select count(*) from public.user_folders) = 0, 'nonmember cannot read folder');
select pg_temp.check_collab((select count(*) from public.user_flashcards) = 0, 'nonmember cannot read cards');
do $$ begin
  begin
    insert into public.user_flashcards(id,user_id,folder_id,simplified,translation,created_at) values
     ('f2000000-0000-0000-0000-000000000003',auth.uid(),'f1000000-0000-0000-0000-000000000001','外','outside',3);
    raise exception 'nonmember insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
update public.user_flashcards set translation = 'stolen';
delete from public.user_flashcards;

set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
select pg_temp.check_collab((select count(*) from public.user_flashcards) = 2, 'nonmember writes affect no rows');
delete from public.user_flashcards where id = 'f2000000-0000-0000-0000-000000000001';
select pg_temp.check_collab((select count(*) from public.user_flashcards) = 1, 'member deletes another creator card');

set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
select public.remove_folder_member('f1000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000002');
select pg_temp.check_collab((select count(*) from public.folder_members) = 1, 'owner removes editor');
delete from public.folder_members where user_id = auth.uid();
select pg_temp.check_collab((select count(*) from public.folder_members) = 1, 'owner cannot leave');
-- Capacity checks still apply to privileged inserts, and an existing member
-- can rejoin a full folder without tripping the cap.
reset role;
insert into auth.users(id) select md5('collab-cap-' || n)::uuid from generate_series(1,20) n;
insert into public.folder_members(folder_id,user_id,role)
  select 'f1000000-0000-0000-0000-000000000001',md5('collab-cap-' || n)::uuid,'editor' from generate_series(1,19) n;
do $$ begin
  begin
    insert into public.folder_members(folder_id,user_id,role) values
      ('f1000000-0000-0000-0000-000000000001',md5('collab-cap-20')::uuid,'editor');
    raise exception 'member cap bypassed';
  exception when raise_exception then if sqlerrm <> 'A folder can have at most 20 members' then raise; end if; end;
end $$;
set local role authenticated;
select public.join_folder('collabtest01');
select pg_temp.check_collab((select count(*) from public.folder_members) = 20, 'rejoin full folder is idempotent');
insert into public.user_flashcards(id,user_id,folder_id,simplified,translation,created_at)
  select md5('collab-card-cap-' || n)::uuid,auth.uid(),'f1000000-0000-0000-0000-000000000001','測','cap fixture',n
  from generate_series(1,1999) n;
do $$ begin
  begin
    insert into public.user_flashcards(user_id,folder_id,simplified,translation,created_at)
      values(auth.uid(),'f1000000-0000-0000-0000-000000000001','測','overflow',2000);
    raise exception 'card cap bypassed';
  exception when raise_exception then if sqlerrm <> 'A folder can contain at most 2000 cards' then raise; end if; end;
end $$;
select public.clear_folder_invite('f1000000-0000-0000-0000-000000000001');
set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
select pg_temp.check_collab((select count(*) from public.user_folders) = 0, 'removed editor loses folder access');
do $$ begin
  begin perform public.join_folder('collabtest01'); raise exception 'cleared invite allowed';
  exception when raise_exception then if sqlerrm <> 'Invite link is no longer valid' then raise; end if; end;
end $$;
set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
delete from public.user_folders where id = 'f1000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.check_collab(not exists(select 1 from public.user_flashcards where folder_id = 'f1000000-0000-0000-0000-000000000001'), 'folder deletion cascades every creator card');
rollback;
