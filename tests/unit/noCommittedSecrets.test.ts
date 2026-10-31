import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

// A service-role key once reached the public history through a debug script.
// Public anon/publishable keys are fine; anything that bypasses RLS is not.
const BINARY = /\.(png|jpe?g|webp|gif|ico|mp3|m4a|opus|ogg|wav|woff2?|ttf|otf|pdf|gz|br|zip)$/i;
const PATTERNS: Array<[string, RegExp]> = [
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ['Supabase access token', /\bsbp_(?:oauth_|v0_)?[a-f0-9]{40}\b/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;

function serviceRoleJwt(text: string): boolean {
  for (const [, payload] of text.matchAll(JWT)) {
    try {
      if (JSON.parse(Buffer.from(payload, 'base64url').toString()).role === 'service_role') return true;
    } catch { /* not a JWT */ }
  }
  return false;
}

test('no privileged credentials are committed', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const found: string[] = [];
  for (const file of files) {
    if (BINARY.test(file)) continue;
    let text: string;
    try {
      if (statSync(file).size > 5_000_000) continue;
      text = readFileSync(file, 'utf8');
    } catch { continue; }
    for (const [label, pattern] of PATTERNS) if (pattern.test(text)) found.push(`${file}: ${label}`);
    if (text.includes('eyJ') && serviceRoleJwt(text)) found.push(`${file}: service-role JWT`);
  }
  assert.deepEqual(found, [], 'Remove these and rotate the credential; deleting the file does not revoke it.');
});
