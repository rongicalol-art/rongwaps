import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { isLocallyVerifiable, schoolAccessFromClaims, unverifiedClaims, verifyAccessToken } from '../../shared/accessToken';

import { requireUser, resetAuthState } from '../../server/auth';
import type { Context } from '../../server/env';

const SUPABASE = 'https://claims-fixture.supabase.co';
const b64 = (value: string | ArrayBuffer) => Buffer.from(value as ArrayBuffer).toString('base64url');
const { privateKey, publicKey } = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = { ...await webcrypto.subtle.exportKey('jwk', publicKey), kid: 'fixture-key', alg: 'ES256', use: 'sig' };

/** A project-signed access token, the way Supabase issues one after the school hook ran. */
async function token(claims: Record<string, unknown>, header: Record<string, unknown> = { alg: 'ES256', kid: 'fixture-key', typ: 'JWT' }) {
  const head = b64(JSON.stringify(header));
  const body = b64(JSON.stringify({ sub: 'student-1', role: 'authenticated', aud: 'authenticated', iss: `${SUPABASE}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 600, ...claims }));
  const signature = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64(signature)}`;
}

test('stamped school claims are read only when both are present and well formed', () => {
  assert.deepEqual(schoolAccessFromClaims({ school_beta: true, full_course: false }), { school: true, fullCourse: false, ageOk: true });
  assert.deepEqual(schoolAccessFromClaims({ school_beta: true, full_course: true }), { school: true, fullCourse: true, ageOk: true });
  assert.deepEqual(schoolAccessFromClaims({ school_beta: true, full_course: false, age_ok: true }), { school: true, fullCourse: false, ageOk: true });
  assert.equal(schoolAccessFromClaims({ school_beta: true, full_course: false, age_ok: false })?.ageOk, false, 'a public account before the age step');
  for (const claims of [null, {}, { school_beta: true }, { school_beta: 'true', full_course: false }, { school_beta: false, full_course: true }]) {
    assert.equal(schoolAccessFromClaims(claims), null, JSON.stringify(claims));
  }
  assert.equal(unverifiedClaims('not-a-token'), null);
  assert.equal(isLocallyVerifiable('opaque'), false);
  assert.equal(isLocallyVerifiable(`${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.e30.sig`), false, 'shared-secret tokens go to Supabase');
});

const context = (url: string): Context => ({ env: { SUPABASE_URL: url, SUPABASE_ANON_KEY: 'fixture-key' }, report: () => {} });
async function authorize(url: string, value: string) {
  const result = await requireUser(context(url), new Request('https://app.test/data/vocabulary/book-1.json', { headers: { Authorization: `Bearer ${value}` } }), 'content');
  return result instanceof Response ? { status: result.status, userId: undefined } : { status: 200, userId: result.userId };
}

test('the server trusts a verified school token without calling Supabase, and refuses a forged one outright', async (t) => {
  resetAuthState();
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    assert.equal(url.origin, SUPABASE);
    calls.push(url.pathname);
    if (url.pathname === '/auth/v1/.well-known/jwks.json') return Response.json({ keys: [jwk] });
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'student-1', email: 's25113312@stu.edu.tw' });
    assert.equal(url.pathname, '/rest/v1/rpc/has_beta_access');
    return Response.json(true);
  });
  const stamped = await authorize(SUPABASE, await token({ school_beta: true, full_course: false }));
  assert.equal(stamped.userId, 'student-1');
  assert.deepEqual(calls, ['/auth/v1/.well-known/jwks.json'], 'only the signing keys are fetched');

  const genuine = await token({ school_beta: true, full_course: true });
  const [head, body, signature] = genuine.split('.');
  const forged = `${head}.${b64(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), sub: 'someone-else' }))}.${signature}`;
  calls.length = 0;
  assert.equal((await authorize(SUPABASE, forged)).status, 401);
  assert.equal((await authorize(SUPABASE, await token({ school_beta: true, full_course: true, exp: 1 }))).status, 401, 'expired');
  assert.equal((await authorize(SUPABASE, await token({ school_beta: true, full_course: true, iss: 'https://other.supabase.co/auth/v1' }))).status, 401, 'other project');
  assert.deepEqual(calls, [], 'forged, expired and foreign tokens cost no Supabase calls');

  const unstamped = await authorize(SUPABASE, await token({}));
  assert.equal(unstamped.userId, 'student-1', 'tokens issued before the hook stamped claims still work');
  assert.deepEqual(calls.sort(), ['/auth/v1/user', '/rest/v1/rpc/has_beta_access'], '...through the previous database check');
});

test('a signing-key outage falls back to the database check instead of locking learners out', async (t) => {
  resetAuthState();
  const OUTAGE = 'https://outage-fixture.supabase.co';
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    if (url.pathname.endsWith('/jwks.json')) return new Response('down', { status: 503 });
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'student-1', email: 's25113312@stu.edu.tw' });
    return Response.json(true);
  });
  const head = b64(JSON.stringify({ alg: 'ES256', kid: 'fixture-key', typ: 'JWT' }));
  const body = b64(JSON.stringify({ sub: 'student-1', role: 'authenticated', aud: 'authenticated', iss: `${OUTAGE}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 600, school_beta: true, full_course: false }));
  await assert.rejects(verifyAccessToken(`Bearer ${head}.${body}.c2ln`, OUTAGE), /Signing keys unavailable/);
  assert.equal((await authorize(OUTAGE, `${head}.${body}.c2ln`)).userId, 'student-1');
  assert.ok(calls.includes('/auth/v1/user') && calls.includes('/rest/v1/rpc/has_beta_access'));
});
