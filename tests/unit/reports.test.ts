import assert from 'node:assert/strict';
import test from 'node:test';
import type { Context } from '../../server/env';
import { parseReport, submitReport } from '../../server/reports';

const target = '3f9b431e-a058-478b-bd3e-c49d06101ac1';

test('Report input is bounded, and a signed photo link loses its query string', () => {
  assert.deepEqual(parseReport({ target, reason: 'rude', place: 'chat', message: ' hi ', messageId: 7, name: 'Gee',
    photo: 'https://x.supabase.co/storage/v1/object/sign/profile-media/u/avatar.webp?token=secret' }),
  { target, reason: 'rude', place: 'chat', message: 'hi', messageId: 7, name: 'Gee', photo: 'https://x.supabase.co/storage/v1/object/sign/profile-media/u/avatar.webp' });
  for (const body of [null, {}, { target: 'nope', reason: 'rude', place: 'chat' }, { target, reason: 'mean', place: 'chat' },
    { target, reason: 'rude', place: 'dm' }]) assert.equal(parseReport(body), null);
  assert.equal(parseReport({ target, reason: 'spam', place: 'profile', messageId: -1, photo: 'javascript:alert(1)' })?.messageId, undefined);
  assert.equal(parseReport({ target, reason: 'spam', place: 'profile', photo: 'http://example.com/a.png' })?.photo, undefined);
  assert.equal(parseReport({ target, reason: 'spam', place: 'chat', message: 'x'.repeat(400) })?.message?.length, 300);
});

test('Reports save first; only "Not safe" emails the owner, and the daily limit reads as itself', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const values = { SUPABASE_URL: 'https://report-test.supabase.co', SUPABASE_ANON_KEY: 'test-anon',
    RESEND_API_KEY: 'test-mail-key', FEEDBACK_EMAIL_FROM: 'App <app@example.com>', FEEDBACK_EMAIL_TO: 'owner@example.com' };
  const env: Context['env'] = { ...values };
  let dbError: object | null = null;
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    const address = String(url);
    if (address.includes('/rpc/submit_report')) {
      calls.push('save');
      const saved = JSON.parse(String(options?.body));
      assert.equal(saved.p_target, target);
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-session');
      return new Response(JSON.stringify(dbError ?? 41), { status: dbError ? 400 : 200, headers: { 'Content-Type': 'application/json' } });
    }
    assert.equal(address, 'https://api.resend.com/emails');
    calls.push('email');
    assert.equal(new Headers(options?.headers).get('Idempotency-Key'), 'report/41');
    const mail = JSON.parse(String(options?.body));
    assert.ok(mail.text.includes('Reported line: go away'));
    assert.ok(mail.text.includes('Reporter: reporter-1'));
    return new Response('{}', { status: 200 });
  });
  const send = (body: object) => submitReport({ env, report: () => {} }, new Request('https://app.test/api/reports', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-session' }, body: JSON.stringify(body) }), { userId: 'reporter-1', token: 'test-session' });

  assert.equal((await send({ target, reason: 'bad', place: 'chat' })).status, 400);
  assert.deepEqual(calls.splice(0), []);
  assert.equal((await send({ target, reason: 'rude', place: 'chat', message: 'go away' })).status, 200);
  assert.deepEqual(calls.splice(0), ['save']);
  const urgent = await send({ target, reason: 'unsafe', place: 'chat', message: 'go away' });
  assert.equal(urgent.status, 200);
  assert.equal(urgent.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(calls.splice(0), ['save', 'email']);
  dbError = { code: '54000', message: 'You’ve sent a lot of reports today. Try again tomorrow.' };
  const limited = await send({ target, reason: 'unsafe', place: 'chat' });
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { error: 'You’ve sent a lot of reports today. Try again tomorrow.' });
  assert.deepEqual(calls.splice(0), ['save']);
  dbError = { code: 'XX000', message: 'Database unavailable' };
  assert.equal((await send({ target, reason: 'unsafe', place: 'chat' })).status, 503);
});
