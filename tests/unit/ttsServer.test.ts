import assert from 'node:assert/strict';
import test from 'node:test';
import type express from 'express';

process.env.NODE_ENV = 'test';
const { app, requireAuth } = await import('../../server/index');

test('protected content auth checks database beta access with a request-scoped token and fails closed', async (context) => {
  const previousUrl = process.env.VITE_SUPABASE_URL;
  const previousKey = process.env.VITE_SUPABASE_ANON_KEY;
  process.env.VITE_SUPABASE_URL = 'https://beta-fixture.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'fixture-key';
  const networkFetch = globalThis.fetch;
  let allowed = true;
  let rpcStatus = 200;
  let userCheckInFlight = false;
  let authChecksOverlapped = false;
  const seenTokens: string[] = [];
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://beta-fixture.supabase.co');
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
    const state = { status: 200, body: undefined as unknown, locals: {} as Record<string, unknown>, continued: false };
    const response = {
      locals: state.locals,
      status(status: number) { state.status = status; return response; },
      json(body: unknown) { state.body = body; return response; },
    };
    await requireAuth(
      { headers: token ? { authorization: `Bearer ${token}` } : {} } as express.Request,
      response as unknown as express.Response,
      () => { state.continued = true; },
    );
    return state;
  };

  try {
    assert.equal((await authorize()).status, 401);
    assert.equal((await authorize('school-fixture')).continued, true);
    assert.equal(authChecksOverlapped, true, 'user and beta-access checks should start concurrently');
    // Parallel and repeat requests with a verified token reuse one check.
    const burst = await Promise.all([authorize('school-fixture'), authorize('school-fixture')]);
    assert.ok(burst.every((state) => state.locals.userId === 'fixture'));
    allowed = false;
    assert.equal((await authorize('personal-fixture')).status, 403);
    allowed = true;
    rpcStatus = 503;
    assert.equal((await authorize('outage-fixture')).status, 503);
    rpcStatus = 200;
    assert.equal((await authorize('outage-fixture')).continued, true, 'failed checks are not cached');
    assert.deepEqual(seenTokens, [
      'Bearer school-fixture', 'Bearer personal-fixture',
      'Bearer outage-fixture', 'Bearer outage-fixture',
    ]);
  } finally {
    globalThis.fetch = networkFetch;
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY;
    else process.env.VITE_SUPABASE_ANON_KEY = previousKey;
  }
});

test('retired grading API returns 404 without contacting auth or grading providers', async (context) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const networkFetch = globalThis.fetch;
  context.mock.method(globalThis, 'fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(new URL(String(input)).origin, base, 'Retired endpoint must never call an external service');
    return networkFetch(input, init);
  });
  try {
    for (const authorization of [undefined, 'Bearer retired-endpoint-fixture']) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (authorization) headers.set('Authorization', authorization);
      const response = await fetch(`${base}/api/jev/grade-answer`, {
        method: 'POST', headers, body: JSON.stringify({ reference: '我在家。', answer: '我在家' }),
      });
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: 'Not found' });
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
