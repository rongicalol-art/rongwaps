-- One-time: saved profiles made before 20261121140000 don't carry the uploaded-photo marks (`ia`, `ca`), so a
-- classmate's uploaded photo and cover only showed after they opened the app again. Mark them now from the profile
-- settings their app syncs (avatarPath, coverPath) and the files that exist. Cover only on a full card (Show my
-- profile on). Data only; the app writes the same marks from now on.
begin;

update public.profile_cards c
set card = case
    when p.settings->>'avatarPath' is not null
      and exists (select 1 from storage.objects o where o.bucket_id = 'profile-media' and o.name = c.user_id::text || '/avatar.webp')
    then (c.card - 'i') || '{"ia":1}'::jsonb else c.card end
  || case
    when p.settings->>'coverPath' is not null and c.card ? 'cv'
      and exists (select 1 from storage.objects o where o.bucket_id = 'profile-media' and o.name = c.user_id::text || '/cover.webp')
    then '{"ca":1}'::jsonb else '{}'::jsonb end
from public.user_profiles p
where p.id = c.user_id and c.card is not null
  and (p.settings->>'avatarPath' is not null or p.settings->>'coverPath' is not null);

commit;
