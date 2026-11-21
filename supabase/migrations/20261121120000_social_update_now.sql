-- The owner moved the privacy update up to November 21, 2026 (Taiwan time), so friends, private messages and
-- offline profiles start now instead of December 1. Same function, new date; the app (SOCIAL_UPDATE_FROM) and the
-- privacy policy (LEGAL_EFFECTIVE_DATE) change with it, and tests/unit/legalMeta.test.ts keeps the three equal.
begin;

create or replace function private.social_update_at() returns timestamptz
language sql immutable set search_path = '' as $$ select timestamptz '2026-11-21 00:00:00+08' $$;

commit;
