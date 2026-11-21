-- Offline profiles show uploaded photos too (owner decision, 2026-11-21). Expand only.
--
-- profile-media stays private: until now only the owner could read their files, and their app shared a one-hour link
-- while they were online. Now a signed-in learner may also read another learner's avatar.webp while that learner has a
-- saved profile card (Show my profile or Show me online on), and their cover.webp while the card is a full card (Show
-- my profile on, it has `cv`). Never between a blocked pair. The card's own row security (school access, blocks)
-- applies inside the check, since it runs as the reader.
begin;

create policy profile_media_select_shared on storage.objects for select to authenticated
using (
  bucket_id = 'profile-media'
  and exists (
    select 1 from public.profile_cards c
    where c.user_id::text = (storage.foldername(name))[1]
      and (storage.filename(name) = 'avatar.webp' or (storage.filename(name) = 'cover.webp' and c.card ? 'cv'))
      and not private.apart_from_me(c.user_id)
  )
);

commit;
