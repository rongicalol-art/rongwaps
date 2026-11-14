import assert from 'node:assert/strict';
import test from 'node:test';
import { handle } from '../../server/app';
import { requireUser, resetAuthState } from '../../server/auth';
import { canonicalPath, isGated } from '../../server/content';
import type { Context } from '../../server/env';

const SUPABASE = 'https://beta-fixture.supabase.co';
const context = (env: Context['env'] = {}): Context => ({ env: { SUPABASE_URL: SUPABASE, SUPABASE_ANON_KEY: 'fixture-key', ...env }, report: () => {} });

test('protected content auth checks database beta access with a request-scoped token and fails closed', async (t) => {
  resetAuthState();
  let allowed = true;
  let rpcStatus = 200;
  let userCheckInFlight = false;
  let authChecksOverlapped = false;
  const seenTokens: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, SUPABASE);
    assert.equal(new Headers(init?.headers).get('apikey'), 'fixture-key');
    if (url.pathname === '/auth/v1/user') {
      userCheckInFlight = true;
      await new Promise((resolve) => setImmediate(resolve));
      userCheckInFlight = false;
      return Response.json({ id: 'fixture', email: 's25113312@stu.edu.tw' });
    }
    assert.equal(url.pathname, '/rest/v1/rpc/has_beta_access');
    if (userCheckInFlight) authChecksOverlapped = true;
    seenTokens.push(new Headers(init?.headers).get('Authorization') ?? '');
    return rpcStatus === 200 ? Response.json(allowed) : Response.json({ message: 'fixture outage' }, { status: rpcStatus });
  });
  const authorize = async (token?: string) => {
    const result = await requireUser(context(), new Request('https://app.test/data/vocabulary/book-1.json', { headers: token ? { Authorization: `Bearer ${token}` } : {} }), 'content');
    return result instanceof Response ? { status: result.status, cache: result.headers.get('cache-control') } : { status: 200, userId: result.userId };
  };

  const refused = await authorize();
  assert.deepEqual(refused, { status: 401, cache: 'private, no-store' });
  assert.equal((await authorize('school-fixture')).userId, 'fixture');
  assert.equal(authChecksOverlapped, true, 'user and beta-access checks should start concurrently');
  // Repeat requests with a verified token reuse its check.
  const burst = await Promise.all([authorize('school-fixture'), authorize('school-fixture')]);
  assert.ok(burst.every((state) => state.userId === 'fixture'));
  allowed = false;
  assert.equal((await authorize('personal-fixture')).status, 403);
  allowed = true;
  rpcStatus = 503;
  assert.equal((await authorize('outage-fixture')).status, 503);
  rpcStatus = 200;
  assert.equal((await authorize('outage-fixture')).userId, 'fixture', 'failed checks are not cached');
  assert.deepEqual(seenTokens, [
    'Bearer school-fixture', 'Bearer personal-fixture',
    'Bearer outage-fixture', 'Bearer outage-fixture',
  ]);
});

test('retired APIs return 404 without contacting auth or any provider', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('A retired endpoint must never call an external service'); });
  for (const authorization of [undefined, 'Bearer retired-endpoint-fixture']) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (authorization) headers.set('Authorization', authorization);
    for (const path of ['/api/jev/grade-answer', '/api/dictionary/lookup', '/api']) {
      const response = await handle(new Request(`https://app.test${path}`, { method: 'POST', headers, body: JSON.stringify({ reference: '我在家。', answer: '我在家' }) }), context());
      assert.equal(response.status, 404, path);
      assert.deepEqual(await response.json(), { error: 'Not found' });
    }
  }
});

test('150 cold student accounts behind one campus IP reach authentication without sharing a user quota', async (t) => {
  resetAuthState();
  let authRequests = 0;
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, SUPABASE);
    const identity = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '');
    if (url.pathname === '/auth/v1/user') { authRequests++; return Response.json({ id: identity, email: 'synthetic@stu.edu.tw' }); }
    assert.equal(url.pathname, '/rest/v1/rpc/has_beta_access');
    return Response.json(true);
  });
  const shared = context();
  const responses = await Promise.all(Array.from({ length: 150 }, (_, index) => handle(new Request('https://app.test/api/feedback', {
    method: 'POST', headers: { Authorization: `Bearer classroom-${index}`, 'CF-Connecting-IP': '203.0.113.7', 'Content-Type': 'application/json' }, body: '{}',
  }), shared)));
  // The empty feedback is rejected by the route after authentication.
  assert.ok(responses.every(response => response.status === 400), `classroom status counts: ${JSON.stringify(responses.reduce<Record<number, number>>((counts, response) => { counts[response.status] = (counts[response.status] ?? 0) + 1; return counts; }, {}))}`);
  assert.equal(authRequests, 150);
  // The next 151 signed-out requests from that address pass the per-IP allowance (300 a minute); then it closes.
  const signedOut = () => handle(new Request('https://app.test/api/feedback', { method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.7' } }), shared);
  const statuses = (await Promise.all(Array.from({ length: 151 }, signedOut))).map(response => response.status);
  assert.equal(statuses.filter(status => status === 401).length, 150);
  assert.equal(statuses.at(-1), 429);
  assert.equal((await handle(new Request('https://app.test/api/feedback', { method: 'POST', headers: { 'CF-Connecting-IP': '198.51.100.9' } }), shared)).status, 401, 'another address is unaffected');
});

test('every answer carries the security headers; staging also tells search engines to stay away', async () => {
  const health = await handle(new Request('https://app.test/healthz'), context({ APP_ENV: 'production', COMMIT: 'abc' }));
  assert.deepEqual(await health.json(), { ok: true, commit: 'abc', env: 'production' });
  assert.equal(health.headers.get('x-robots-tag'), null);
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('x-frame-options'), 'DENY');
  assert.equal(health.headers.get('strict-transport-security'), 'max-age=31536000');
  assert.equal(health.headers.get('cache-control'), 'no-store');
  const staging = await handle(new Request('https://app.test/healthz'), context({ APP_ENV: 'staging' }));
  assert.equal(staging.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  const games = await handle(new Request('https://app.test/api/games/config'), context({ APP_ENV: 'production', GAMES_SERVER_URL: 'https://games.example/path' }));
  assert.deepEqual(await games.json(), { url: 'https://games.example' });
  assert.deepEqual(await (await handle(new Request('https://app.test/api/games/config'), context({ APP_ENV: 'production', GAMES_SERVER_URL: 'http://games.example' }))).json(), { url: null });
  assert.deepEqual(await (await handle(new Request('https://app.test/api/games/config'), context({ APP_ENV: 'development' }))).json(), { url: 'http://localhost:8787' });
});

test('every spelling of a lesson-content address resolves to the gated path', () => {
  for (const spelling of ['/data/x.json', '/%64ata/x.json', '//data/x.json', '/data//x.json', '/./data/x.json', '/assets/../data/x.json',
    '/assets/..%2fdata/x.json', '/assets/%2e%2e/data/x.json', '/assets\\..\\data\\x.json', '/data%2Fx.json', '/a/b/../../data/x.json']) {
    assert.equal(canonicalPath(spelling), '/data/x.json', spelling);
  }
  assert.equal(canonicalPath('/%E0%A4%A'), null, 'undecodable');
  assert.equal(canonicalPath('/data/%00'), null);
  assert.equal(canonicalPath('/../..'), '/');
  assert.ok(isGated('/data') && isGated('/data/x') && !isGated('/database') && !isGated('/assets/data/x'));
});
