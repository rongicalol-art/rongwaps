import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { parseFeedback, submitFeedback } from '../../server/feedback';

const input = { id: '3f9b431e-a058-478b-bd3e-c49d06101ac1', message: '  Audio stopped  ', path: '/library' };

test('Feedback validates message, id and path at the API boundary', () => {
  assert.deepEqual(parseFeedback(input), { ...input, message: 'Audio stopped' });
  for (const body of [null, {}, { ...input, id: 'invalid' }, { ...input, message: ' ' },
    { ...input, message: 'x'.repeat(2001) }, { ...input, path: '//example.com' },
    { ...input, path: '/?token=secret' }, { ...input, path: '/#private' },
    { ...input, path: '/bad path' }, { ...input, path: '/' + 'x'.repeat(256) }]) {
    assert.equal(parseFeedback(body), null);
  }
  assert.ok(parseFeedback({ ...input, message: '中'.repeat(2000), path: '/' }));
});

test('Feedback saves before notifying; save failure, retry, and notification outage remain safe', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const values = { VITE_SUPABASE_URL: 'https://feedback-test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon', RESEND_API_KEY: 'test-mail-key',
    FEEDBACK_EMAIL_FROM: 'Feedback <feedback@example.com>', FEEDBACK_EMAIL_TO: 'owner@example.com' };
  const previous = new Map(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => { for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  const originalFetch = globalThis.fetch;
  let dbError: object | null = null;
  let created = true;
  let mailStatus = 200;
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    const address = String(url);
    if (address.startsWith('http://127.0.0.1')) return originalFetch(url, options);
    if (address.includes('/rpc/submit_feedback')) {
      calls.push('save');
      const saved = JSON.parse(String(options?.body));
      assert.equal(saved.p_id, input.id);
      assert.equal(saved.p_message, 'Audio stopped');
      assert.ok(saved.p_browser.length <= 512);
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-session');
      return new Response(JSON.stringify(dbError ?? created), { status: dbError ? 400 : 200, headers: { 'Content-Type': 'application/json' } });
    }
    assert.equal(address, 'https://api.resend.com/emails');
    calls.push('email');
    assert.equal(new Headers(options?.headers).get('Idempotency-Key'), `feedback/${input.id}`);
    const mail = JSON.parse(String(options?.body));
    assert.deepEqual(mail.to, ['owner@example.com']);
    assert.ok(mail.text.includes('Audio stopped'));
    return new Response('{}', { status: mailStatus });
  });
  const app = express();
  app.use(express.json());
  app.post('/api/feedback', (req, res) => { res.locals.userId = 'test-user'; void submitFeedback(req, res); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/feedback`;
  const send = (body: object = input) => fetch(endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-session' }, body: JSON.stringify(body) });

  assert.equal((await send({ ...input, message: '' })).status, 400);
  assert.deepEqual(calls, []);
  dbError = { code: 'XX000', message: 'Database unavailable' };
  assert.equal((await send()).status, 503);
  assert.deepEqual(calls.splice(0), ['save']);
  dbError = { code: 'P0001', message: 'Too many submissions' };
  assert.equal((await send()).status, 429);
  assert.deepEqual(calls.splice(0), ['save']);
  dbError = null;
  mailStatus = 503;
  const saved = await send();
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await saved.json(), { ok: true });
  assert.deepEqual(calls.splice(0), ['save', 'email']);
  created = false;
  mailStatus = 200;
  assert.equal((await send()).status, 200);
  assert.deepEqual(calls.splice(0), ['save', 'email']);
  delete process.env.RESEND_API_KEY;
  assert.equal((await send()).status, 200);
  assert.deepEqual(calls.splice(0), ['save']);
});
