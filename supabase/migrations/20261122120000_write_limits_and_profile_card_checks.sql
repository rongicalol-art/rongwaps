-- Write limits and profile card checks (expand: the previous app keeps working). Engineering audit, 2026-11-22.
--
-- 1. Card progress: one account could store rows without limit through upsert_card_progress (500 a call,
--    any number of calls), each with a scheduler_state of any size. Like review history before 20261106120000,
--    that could fill the free 500 MB database, and Supabase then restricts the whole project.
--    Now: scheduler_state at most 1 kB (the app's is about 200 bytes), and at most 20,000 cards an account
--    (the four books have 4,064 words; custom cards are capped at 5,000).
-- 2. Folders: at most 200 an account (there was no limit).
-- 3. Profile cards: the photo address in a shared card was checked only by the app. Anyone calling
--    save_profile_card directly could store any address, which every classmate's app then loaded as a picture
--    (a way to see who looks at a profile and when, and to show any image). Now the function keeps a photo
--    address only when it is a Google profile photo, and keeps a name to 30 characters as the app does.
--    Uploaded photos are not stored in the card (the app marks them with "ia" and loads a fresh link).

begin;

-- 1. Card progress ------------------------------------------------------------

alter table public.user_card_progress
  add constraint scheduler_state_size check (scheduler_state is null or pg_column_size(scheduler_state) <= 1024) not valid;

create function private.limit_card_progress_rows() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  -- Once a statement, not once a row: a save sends up to 500 cards.
  if me is not null and (select count(*) from public.user_card_progress p where p.user_id = me) > 20000 then
    raise exception using errcode = '54000', message = 'Too many cards saved for this account';
  end if;
  return null;
end;
$$;
revoke all on function private.limit_card_progress_rows() from public, anon, authenticated;
create trigger limit_card_progress_rows after insert on public.user_card_progress
  for each statement execute function private.limit_card_progress_rows();

-- 2. Folders ------------------------------------------------------------------

create function private.limit_folder_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is not null and (select count(*) from public.user_folders f where f.user_id = me) > 200 then
    raise exception using errcode = '54000', message = 'Too many folders for this account';
  end if;
  return null;
end;
$$;
revoke all on function private.limit_folder_count() from public, anon, authenticated;
create trigger limit_folder_count after insert on public.user_folders
  for each statement execute function private.limit_folder_count();

-- 3. Profile cards ------------------------------------------------------------

create or replace function public.save_profile_card(p_card jsonb, p_seen boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := private.require_social_update();
  clean jsonb := p_card;
begin
  if p_card is not null and (jsonb_typeof(p_card) <> 'object' or pg_column_size(p_card) > 2048) then
    raise exception using errcode = '22023', message = 'Invalid profile card';
  end if;
  if p_card is null and not coalesce(p_seen, false) then
    delete from public.profile_cards c where c.user_id = me;
    return;
  end if;
  if clean is not null then
    -- Only a Google profile photo is a lasting, safe address; anything else is dropped, not refused, so an
    -- older app's save still stores the rest of the card.
    if clean ? 'i' and (jsonb_typeof(clean->'i') <> 'string'
      or clean->>'i' !~ '^https://lh3\.googleusercontent\.com/[A-Za-z0-9_=./-]+$') then
      clean := clean - 'i';
    end if;
    if clean ? 'n' then
      if jsonb_typeof(clean->'n') = 'string' and btrim(clean->>'n') <> '' then
        clean := jsonb_set(clean, '{n}', to_jsonb(left(btrim(clean->>'n'), 30)));
      else
        clean := clean - 'n';
      end if;
    end if;
  end if;
  insert into public.profile_cards (user_id, card, last_seen, updated_at)
  values (me, clean, case when p_seen then now() end, now())
  on conflict (user_id) do update set card = excluded.card, last_seen = excluded.last_seen, updated_at = now();
end;
$$;
revoke all on function public.save_profile_card(jsonb, boolean) from public, anon;
grant execute on function public.save_profile_card(jsonb, boolean) to authenticated;

-- Cards saved before this check: drop a photo address that is not a Google profile photo.
update public.profile_cards set card = card - 'i'
where card ? 'i' and (jsonb_typeof(card->'i') <> 'string' or card->>'i' !~ '^https://lh3\.googleusercontent\.com/[A-Za-z0-9_=./-]+$');

notify pgrst, 'reload schema';
commit;
