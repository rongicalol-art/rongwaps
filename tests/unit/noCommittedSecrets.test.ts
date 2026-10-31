import assert from 'node:assert/strict';
import test from 'node:test';

import { findSecrets, scanTrackedFiles } from '../../scripts/release/secretScan.ts';

// A service-role key once reached the public history through a debug script.
// Public anon/publishable keys are fine; anything that bypasses RLS is not.
test('no privileged credentials are committed', () => {
  assert.deepEqual(scanTrackedFiles(), [], 'Remove these and rotate the credential; deleting the file does not revoke it.');
});

test('secret patterns catch real credential shapes and spare public values', () => {
  const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, iss: 'supabase' })).toString('base64url')}.c2lnbmF0dXJlc2lnbmF0dXJl`;
  assert.deepEqual(findSecrets(jwt('service_role')), ['service-role JWT']);
  assert.deepEqual(findSecrets(jwt('anon')), []);
  assert.deepEqual(findSecrets(`sb_secret_${'a'.repeat(30)}`), ['Supabase secret key']);
  assert.deepEqual(findSecrets(`AGE-SECRET-KEY-1${'Q'.repeat(58)}`), ['age secret key']);
  assert.deepEqual(findSecrets(`ghp_${'A'.repeat(36)}`), ['GitHub token']);
  assert.deepEqual(findSecrets(['postgresql://postgres.abc:', 'Sup3rS3cretPass', '@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'].join('')), ['database URL with password']);
  assert.deepEqual(findSecrets('postgresql://postgres:postgres@127.0.0.1:54322/postgres'), []);
  assert.deepEqual(findSecrets('postgresql://postgres:${PGPASSWORD}@db.example.com/postgres'), []);
  assert.deepEqual(findSecrets('sb_publishable_abc123 age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqs'), []);
});
