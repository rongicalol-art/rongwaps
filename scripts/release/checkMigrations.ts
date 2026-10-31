/**
 * Migration safety gate (CI, every PR). Rolling back the app never rolls back
 * the database, and installed PWAs keep running the previous client, so
 * migrations follow expand → migrate → contract (AGENTS.md):
 *
 * - Applied migrations are immutable: only new files may be added.
 * - New files are named `YYYYMMDDHHMMSS_name.sql` and sort after every existing one.
 * - Statements that destroy data or break the previous client (DROP TABLE /
 *   COLUMN / FUNCTION, renames, type changes, TRUNCATE, top-level DELETE, a new
 *   NOT NULL column without a default) fail unless the file declares
 *   `-- migration-safety: contract <why the old client no longer needs it>`.
 *
 * Usage: tsx scripts/release/checkMigrations.ts [baseRef]   (default origin/main)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = 'supabase/migrations';
const NAME = /^(\d{14})_[a-z0-9_]+\.sql$/;
const CONTRACT_MARKER = /^\s*--\s*migration-safety:\s*contract\s+\S.{10,}$/im;

const DESTRUCTIVE: Array<[string, RegExp]> = [
  ['drops a table, view, schema or type', /\bdrop\s+(?:table|view|materialized\s+view|schema|type|sequence|extension)\b/i],
  ['drops a column', /\bdrop\s+column\b/i],
  ['drops a function the previous client may call', /\bdrop\s+function\b/i],
  ['renames a table or column', /\balter\s+table\b[^;]*\brename\b/i],
  ['changes a column type', /\balter\s+column\s+\S+\s+(?:set\s+data\s+)?type\b/i],
  ['truncates a table', /(?:^|;)\s*truncate\b/im],
  ['deletes rows', /(?:^|;)\s*delete\s+from\b/im],
  ['adds a NOT NULL column without a default (old clients cannot insert)', /\badd\s+column\b(?![^;,]*\bdefault\b)[^;,]*\bnot\s+null\b/i],
];

/** Removes comments and dollar-quoted bodies (function code runs later, not at migration time). */
function executableSql(sql: string): string {
  return sql
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''");
}

/** Problems with one new migration file. */
export function checkNewMigration(file: string, sql: string, latestExisting: string): string[] {
  const problems: string[] = [];
  const match = NAME.exec(file);
  if (!match) problems.push('name must be YYYYMMDDHHMMSS_snake_case.sql');
  else if (match[1] <= latestExisting) problems.push(`timestamp ${match[1]} must be after the newest existing migration (${latestExisting})`);
  if (CONTRACT_MARKER.test(sql)) return problems;
  const body = executableSql(sql);
  for (const [why, pattern] of DESTRUCTIVE) {
    if (pattern.test(body)) problems.push(`${why}. Ship this only as a contract step after no live client needs the old shape, and declare it: "-- migration-safety: contract <reason>"`);
  }
  return problems;
}

/** Version key that sorts legacy 8-digit names with 14-digit ones. */
export function versionOf(file: string): string {
  return (/^(\d+)/.exec(file)?.[1] ?? '').padEnd(14, '0');
}

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run(baseRef: string): number {
  // Shallow CI checkouts have no merge base; there HEAD is the PR merge commit,
  // so comparing straight against the base tip gives exactly the PR's changes.
  let base = baseRef;
  try { base = git(['merge-base', baseRef, 'HEAD']); } catch { /* shallow clone */ }
  const existing = git(['ls-tree', '--name-only', base, `${DIR}/`]).split('\n').filter((path) => path.endsWith('.sql')).map((path) => basename(path));
  const latest = existing.map(versionOf).sort().at(-1) ?? '';
  const changes = git(['diff', '--name-status', '--no-renames', base, 'HEAD', '--', DIR]).split('\n').filter(Boolean);
  let failures = 0;
  const fail = (path: string, message: string) => {
    failures += 1;
    console.error(`::error file=${path}::${message}`);
  };
  for (const line of changes) {
    const [status, path] = line.split('\t');
    if (!path.endsWith('.sql')) continue;
    if (status !== 'A') {
      fail(path, 'Applied migrations are immutable: add a new migration instead of editing or deleting this one.');
      continue;
    }
    for (const problem of checkNewMigration(basename(path), readFileSync(path, 'utf8'), latest)) fail(path, problem);
  }
  console.log(failures ? `Migration safety: ${failures} problem(s).` : `Migration safety: ${changes.length} change(s) checked, OK.`);
  return failures ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(run(process.argv[2] ?? 'origin/main'));
}
