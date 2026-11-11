#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook for Edit/Write: lints the file that was just
 * edited and hands any error straight back to the session, so a wrong import
 * layer or a hardcoded colour is fixed at the edit instead of at the gate.
 *
 * Silent (exit 0) when the file is not linted code, ESLint is not installed
 * (a worktree before `npm ci`) or the file is clean. Exit 2 sends stderr to
 * the session.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

// The folders `npm run lint` covers.
const LINTED = /^(?:src|shared|tests|server|scripts|games)\/.+\.(?:ts|tsx|js|mjs)$/;
const MAX_LINES = 15;

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const named = input?.tool_input?.file_path;
if (typeof named !== 'string') process.exit(0);
const file = resolve(typeof input.cwd === 'string' ? input.cwd : process.cwd(), named);
if (!existsSync(file)) process.exit(0);

// The checkout this file belongs to (the shared folder or a worktree): the nearest ESLint config above it.
let root = dirname(file);
while (!existsSync(join(root, 'eslint.config.js'))) {
  if (root === dirname(root)) process.exit(0);
  root = dirname(root);
}
const eslint = join(root, 'node_modules/.bin/eslint');
const path = relative(root, file);
if (!LINTED.test(path) || !existsSync(eslint)) process.exit(0);

const run = spawnSync(eslint, ['--max-warnings=0', '--format', 'json', path], { cwd: root, encoding: 'utf8', timeout: 25_000 });
if (run.status === 0 || run.status === null) process.exit(0);

let problems;
try {
  problems = JSON.parse(run.stdout).flatMap((result) => result.messages)
    .map((m) => `${path}:${m.line}:${m.column} ${m.message}${m.ruleId ? ` (${m.ruleId})` : ''}`);
} catch {
  process.exit(0); // ESLint itself failed (config error): the gate will say so.
}
if (problems.length === 0) process.exit(0);
const more = problems.length > MAX_LINES ? `\n… and ${problems.length - MAX_LINES} more (npx eslint ${path})` : '';
process.stderr.write(`ESLint on the file you just edited (ignore anything your next edit will resolve):\n${problems.slice(0, MAX_LINES).join('\n')}${more}\n`);
process.exit(2);
