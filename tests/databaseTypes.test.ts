import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Database } from '../src/types/database';

/**
 * Drift guard for the hand-maintained `Database` type.
 *
 * `src/types/database.ts` is written by hand (there is no linked Supabase
 * project to run `supabase gen types` against here), so it can silently fall
 * behind the schema. `supabase/migrations/*.sql` is the source of truth; this
 * test derives the live table/function sets from those files and asserts both
 * they and the `Database` type agree with the literal lists below. Adding a
 * table or function to the schema therefore fails here — and fails the
 * typecheck too, because the compile-time assertions underneath reject a list
 * that does not match `Database`.
 */

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase', 'migrations');

/** Tables the migrations leave in `public` (post-drops). Keep in sync with the migrations. */
const EXPECTED_TABLES = [
  'book_vocabulary',
  'character_breakdowns_v2',
  'dictionary',
  'mnemonics',
  'user_card_progress',
  'user_daily_progress',
  'user_flashcards',
  'user_folders',
  'user_learned_cards',
  'user_profiles',
] as const;

/** Functions the migrations leave in `public` (post-drops, overloads collapsed by name). */
const EXPECTED_FUNCTIONS = [
  'append_learned_cards',
  'get_due_card_ids',
  'handle_new_user',
  'replace_learned_cards',
  'reset_user_learning_progress',
  'search_dictionary',
  'upsert_card_progress',
  'upsert_daily_progress',
] as const;

// Compile-time half: the literal lists must be exactly the Database keys, so a
// type edit without a list edit (or vice versa) is a type error, not just a
// runtime failure.
type DatabaseTable = keyof Database['public']['Tables'];
type DatabaseFunction = keyof Database['public']['Functions'];
type MissingTable = Exclude<(typeof EXPECTED_TABLES)[number], DatabaseTable>;
type ExtraTable = Exclude<DatabaseTable, (typeof EXPECTED_TABLES)[number]>;
type MissingFunction = Exclude<(typeof EXPECTED_FUNCTIONS)[number], DatabaseFunction>;
type ExtraFunction = Exclude<DatabaseFunction, (typeof EXPECTED_FUNCTIONS)[number]>;
const tablesMatchDatabase: [MissingTable, ExtraTable] extends [never, never] ? true : never = true;
const functionsMatchDatabase: [MissingFunction, ExtraFunction] extends [never, never] ? true : never = true;
void tablesMatchDatabase;
void functionsMatchDatabase;

/**
 * Table clauses sit between the verb and the object (`CREATE TABLE IF NOT
 * EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TABLE IF EXISTS`).
 */
const MIGRATION_STATEMENTS: Record<
  `${'CREATE' | 'DROP'} ${'TABLE' | 'FUNCTION'}`,
  RegExp
> = {
  'CREATE TABLE': /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi,
  'DROP TABLE': /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?/gi,
  'CREATE FUNCTION': /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+/gi,
  'DROP FUNCTION': /\bDROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?/gi,
};

const PUBLIC_OBJECT = /(?:"public"|public)\.(?:"([a-z_0-9]+)"|([a-z_0-9]+))/gi;

/** Names of `public` objects a migration file creates or drops. */
function migrationObjects(
  sql: string,
  verb: 'CREATE' | 'DROP',
  object: 'TABLE' | 'FUNCTION',
): Set<string> {
  const statement = MIGRATION_STATEMENTS[`${verb} ${object}`];
  const names = new Set<string>();
  for (const head of sql.matchAll(statement)) {
    const rest = sql.slice(head.index + head[0].length);
    const target = PUBLIC_OBJECT.exec(rest);
    PUBLIC_OBJECT.lastIndex = 0;
    if (target) names.add((target[1] ?? target[2]).toLowerCase());
  }
  return names;
}

/** Replays every migration in filename order and returns the surviving public objects. */
function livePublicObjects(object: 'TABLE' | 'FUNCTION'): Set<string> {
  const files = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql')).sort();
  const live = new Set<string>();
  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
    for (const name of migrationObjects(sql, 'CREATE', object)) live.add(name);
    for (const name of migrationObjects(sql, 'DROP', object)) live.delete(name);
  }
  return live;
}

function assertLiveSetMatches(expected: readonly string[], object: 'TABLE' | 'FUNCTION'): void {
  const live = livePublicObjects(object);
  const expectedList = [...expected].sort();
  const liveList = [...live].sort();
  const missing = expectedList.filter((name) => !live.has(name));
  const stale = liveList.filter((name) => !expected.includes(name));
  assert.deepEqual(
    { missing, stale },
    { missing: [], stale: [] },
    `Database ${object === 'TABLE' ? 'Tables' : 'Functions'} drifted from supabase/migrations ` +
      `(update src/types/database.ts, the EXPECTED list here, and docs/DATABASE_SCHEMA.md together)`,
  );
  assert.deepEqual(liveList, expectedList);
}

test('Database tables match the tables the migrations leave in public', () => {
  assertLiveSetMatches(EXPECTED_TABLES, 'TABLE');
});

test('Database functions match the functions the migrations leave in public', () => {
  assertLiveSetMatches(EXPECTED_FUNCTIONS, 'FUNCTION');
});
