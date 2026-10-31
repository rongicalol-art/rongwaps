/**
 * Finds privileged credentials in text. One owner for the patterns, used by:
 * - tests/unit/noCommittedSecrets.test.ts (every tracked file, in CI)
 * - .githooks/pre-commit (`--staged`: only what is about to be committed)
 *
 * Public keys are fine (Supabase publishable/anon keys, Sentry DSNs, the
 * backup age *public* key). Anything that bypasses RLS or grants account
 * access is not.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BINARY = /\.(png|jpe?g|webp|gif|ico|mp3|m4a|opus|ogg|wav|woff2?|ttf|otf|pdf|gz|br|zip)$/i;
const MAX_BYTES = 5_000_000;

const PATTERNS: Array<[string, RegExp]> = [
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ['Supabase access token', /\bsbp_(?:oauth_|v0_)?[a-f0-9]{40}\b/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/],
  ['age secret key', /\bAGE-SECRET-KEY-1[0-9A-Z]{50,}/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/],
  ['Sentry auth token', /\bsntry[su]_[A-Za-z0-9_=+/-]{40,}/],
  ['Render API key', /\brnd_[A-Za-z0-9]{24,}/],
  ['Anthropic key or Claude token', /\bsk-ant-[A-Za-z0-9_-]{30,}/],
  ['OpenAI/OpenRouter key', /\bsk-(?:proj|or-v1)-[A-Za-z0-9_-]{30,}/],
  // A database URL with a real password. Local test stacks (localhost) are fine.
  ['database URL with password', /\bpostgres(?:ql)?:\/\/[^:@\s/'"]+:(?!postgres@(?:localhost|127\.0\.0\.1))[^@\s'"$<{]{6,}@(?!localhost|127\.0\.0\.1)[^\s'"]+/],
];
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;

function hasServiceRoleJwt(text: string): boolean {
  if (!text.includes('eyJ')) return false;
  for (const [, payload] of text.matchAll(JWT)) {
    try {
      if (JSON.parse(Buffer.from(payload, 'base64url').toString()).role === 'service_role') return true;
    } catch { /* not a JWT */ }
  }
  return false;
}

/** Labels of every credential kind found in `text`. */
export function findSecrets(text: string): string[] {
  const found = PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  if (hasServiceRoleJwt(text)) found.push('service-role JWT');
  return found;
}

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function list(output: string): string[] {
  return output.split('\0').filter((file) => file && !BINARY.test(file));
}

/** Findings for every tracked file (working-tree contents). */
export function scanTrackedFiles(): string[] {
  const findings: string[] = [];
  for (const file of list(git(['ls-files', '-z']))) {
    let text: string;
    try {
      if (statSync(file).size > MAX_BYTES) continue;
      text = readFileSync(file, 'utf8');
    } catch { continue; }
    for (const label of findSecrets(text)) findings.push(`${file}: ${label}`);
  }
  return findings;
}

/** Findings for the staged version of each staged file (what the commit will contain). */
export function scanStagedFiles(): string[] {
  const findings: string[] = [];
  for (const file of list(git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']))) {
    let text: string;
    try {
      text = git(['show', `:${file}`]);
    } catch { continue; }
    if (text.length > MAX_BYTES) continue;
    for (const label of findSecrets(text)) findings.push(`${file}: ${label}`);
  }
  return findings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = process.argv.includes('--staged') ? scanStagedFiles() : scanTrackedFiles();
  if (findings.length) {
    console.error('Secret scan: possible credentials found. Remove them before committing:');
    for (const finding of findings) console.error(`  ${finding}`);
    console.error('If one was ever pushed, rotate it: deleting the file does not revoke it.');
    process.exit(1);
  }
}
