import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { checkNewMigration, versionOf } from '../../scripts/release/checkMigrations.ts';

const LATEST = '20261031120000';
const NEW = '20261101120000_example.sql';

test('additive migrations pass', () => {
  assert.deepEqual(checkNewMigration(NEW, `
    create table if not exists public.notes (id uuid primary key, body text not null);
    alter table public.notes add column created_at timestamptz not null default now();
    create or replace function public.reset() returns void language plpgsql as $$
    begin
      delete from public.notes where true;  -- runs later, inside the function
      drop table if exists temp_x;
    end $$;
    drop policy if exists "old" on public.notes;
    comment on table public.notes is 'drop table is only a word here';
  `, LATEST), []);
});

test('destructive statements fail without a contract declaration', () => {
  const problems = checkNewMigration(NEW, `
    drop table public.legacy;
    alter table public.cards drop column hint;
    alter table public.cards rename column a to b;
    alter table public.cards alter column due type date;
    truncate public.events;
    delete from public.events;
    alter table public.cards add column level int not null;
    drop function public.old_rpc(jsonb);
  `, LATEST);
  assert.equal(problems.length, 8, problems.join('\n'));
});

test('a declared contract step passes', () => {
  assert.deepEqual(checkNewMigration(NEW, '-- migration-safety: contract client 2026.11 stopped calling old_rpc\ndrop function public.old_rpc(jsonb);', LATEST), []);
});

test('names and order are enforced', () => {
  assert.equal(checkNewMigration('20261101_short.sql', 'select 1;', LATEST).length, 1);
  assert.equal(checkNewMigration('20261001120000_backdated.sql', 'select 1;', LATEST).length, 1);
  assert.equal(versionOf('20260911_learned_cards_table.sql'), '20260911000000');
});

test('the newest committed migration sorts last', () => {
  const files = readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql'));
  const newest = [...files].sort((a, b) => versionOf(a).localeCompare(versionOf(b))).at(-1)!;
  assert.match(newest, /^\d{14}_/);
  assert.ok(readFileSync(`supabase/migrations/${newest}`, 'utf8').length > 0);
});
