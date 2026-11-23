-- Pinyin practice answers get their own review source, 'pinyin' (owner decision, 2026-11-23; expand).
--
-- The Pinyin screen saved nothing, so its practice never reached the streak, the learner report or the
-- after-quiz suggestion. The app now records each first Pinyin answer as observe-only (it never schedules a
-- word or marks it learned) with source 'pinyin'. append_review_events rejects a whole batch with an unknown
-- source, so this migration only widens the allowed list and must be applied before an app that sends 'pinyin'
-- (Deploy refuses production until it is). Older apps never send it, so they are unaffected. The body is
-- 20261106120000's, unchanged apart from the list; create or replace keeps its grants.
begin;

create or replace function public.append_review_events(p_events jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  e jsonb;
  clean jsonb;
  events jsonb := '[]'::jsonb;
  allowance integer;
begin
  if me is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if not private.has_school_beta_access() then raise exception 'School beta access required' using errcode = '42501'; end if;
  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) > 500 then
    raise exception 'Expected at most 500 review events' using errcode = '22023';
  end if;
  for e in select value from jsonb_array_elements(p_events) loop
    if jsonb_typeof(e) <> 'object'
      or not (e ?& array['id','cardId','sessionId','quality','source','durationMs','reviewedAt','scheduled'])
      or jsonb_typeof(e->'id') <> 'string' or jsonb_typeof(e->'cardId') <> 'string'
      or jsonb_typeof(e->'sessionId') <> 'string'
      or jsonb_typeof(e->'quality') <> 'number' or jsonb_typeof(e->'durationMs') <> 'number'
      or jsonb_typeof(e->'reviewedAt') <> 'number'
      or (e->>'quality')::integer not between 0 and 5
      or e->>'source' not in ('flashcards','quiz','listening','writing','tones','pinyin','daily','practice')
      or jsonb_typeof(e->'scheduled') <> 'boolean'
      or (e->>'durationMs')::numeric not between 0 and 300000
      or (e->>'reviewedAt')::numeric <= 0 or length(e->>'sessionId') > 200
      or length(e->>'cardId') not between 1 and 500
      or e->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid review event' using errcode = '22023';
    end if;
    -- Only what the app reads (src/utils/srs/reviewEvents.ts); anything else a client sends is dropped.
    clean := jsonb_strip_nulls(jsonb_build_object(
      'id', e->'id', 'cardId', e->'cardId', 'sessionId', e->'sessionId', 'quality', e->'quality',
      'source', e->'source', 'durationMs', e->'durationMs', 'reviewedAt', e->'reviewedAt', 'scheduled', e->'scheduled',
      'practiceOnly', case when jsonb_typeof(e->'practiceOnly') = 'boolean' then e->'practiceOnly' end,
      'dailyTarget', case when jsonb_typeof(e->'dailyTarget') = 'number' and (e->>'dailyTarget')::numeric between 1 and 20 then e->'dailyTarget' end
    ));
    if octet_length(clean::text) > 2048 then raise exception 'Invalid review event' using errcode = '22023'; end if;
    events := events || jsonb_build_array(clean);
  end loop;

  perform pg_advisory_xact_lock(hashtextextended('review_events:' || me::text, 0));
  -- Room left in this account's daily allowance; new events past it are dropped without an error, so the same
  -- save still stores card progress and settings (the card's state lives in user_card_progress anyway).
  allowance := greatest(0, 5000 - (select count(*) from public.user_review_events r
    where r.user_id = me and r.created_at > now() - interval '1 day'));

  insert into public.user_review_events(user_id, event_id, card_id, reviewed_at, payload)
  select me, x.id, x.value->>'cardId', to_timestamp((x.value->>'reviewedAt')::double precision / 1000), x.value
  from (
    select e.value, (e.value->>'id')::uuid as id from jsonb_array_elements(events) e
    where not exists (select 1 from public.user_review_events r where r.user_id = me and r.event_id = (e.value->>'id')::uuid)
    order by (e.value->>'reviewedAt')::double precision
    limit allowance
  ) x
  where not exists (
    select 1 from public.user_profiles p where p.id = me
    and p.progress_reset_at >= to_timestamp((x.value->>'reviewedAt')::double precision / 1000)
  )
  on conflict (user_id, event_id) do nothing;
end;
$$;

notify pgrst, 'reload schema';
commit;
