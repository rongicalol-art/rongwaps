import assert from 'node:assert/strict';
import test from 'node:test';
import type express from 'express';
import { Readable } from 'node:stream';
import { MsEdgeTTS } from 'msedge-tts';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Import the real handlers without bootstrapping Vite or touching external accounts.
process.env.NODE_ENV = 'test';
process.env.R2_ENDPOINT = 'http://127.0.0.1:1';
process.env.R2_ACCESS_KEY_ID = 'test-access';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
const { app, sendAudioBuffer, synthesizeNeural, getTtsAudio } = await import('../../server/index');

test('audio ranges clamp long suffixes, reject invalid numbers, and honor validators', () => {
  const invoke = (headers: Record<string, string>) => {
    const state = { status: 200, headers: {} as Record<string, unknown>, body: null as Buffer | null };
    const response = {
      setHeader: (key: string, value: unknown) => { state.headers[key] = value; },
      status: (status: number) => { state.status = status; return response; },
      send: (body: Buffer) => { state.body = body; },
      end: () => {},
    };
    sendAudioBuffer({ headers } as express.Request, response as unknown as express.Response, Buffer.from('0123456789'), 'audio/mpeg', '"clip"', 'public, max-age=86400');
    return state;
  };
  const suffix = invoke({ range: 'bytes=-50' });
  assert.equal(suffix.status, 206);
  assert.equal(suffix.body?.toString(), '0123456789');
  assert.equal(suffix.headers['Content-Range'], 'bytes 0-9/10');
  for (const range of ['bytes=-0', 'bytes=10-', 'bytes=999999999999999999999-', 'bytes=-', 'bytes=3-1']) assert.equal(invoke({ range }).status, 416);
  const stale = invoke({ range: 'bytes=2-4', 'if-range': '"old"' });
  assert.equal(stale.status, 200);
  assert.equal(stale.body?.length, 10);
  const unchanged = invoke({ 'if-none-match': '"clip"' });
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.headers.ETag, '"clip"');
  assert.equal(unchanged.headers['Cache-Control'], 'public, max-age=86400');
});

test('protected API checks database beta access with a request-scoped token and fails closed', async (context) => {
  process.env.VITE_SUPABASE_URL = 'https://beta-fixture.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'fixture-key';
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const networkFetch = globalThis.fetch;
  let allowed = true;
  let rpcStatus = 200;
  const seenTokens: string[] = [];
  context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.origin === base) return networkFetch(input, init);
    assert.equal(url.origin, 'https://beta-fixture.supabase.co');
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'fixture', email: 's25113312@stu.edu.tw' });
    assert.equal(url.pathname, '/rest/v1/rpc/has_beta_access');
    seenTokens.push(new Headers(init?.headers).get('Authorization') ?? '');
    return rpcStatus === 200 ? Response.json(allowed) : Response.json({ message: 'fixture outage' }, { status: rpcStatus });
  });
  const request = (token?: string) => fetch(`${base}/api/tts`, {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {}, body: '{}',
  });
  try {
    assert.equal((await request()).status, 401);
    assert.equal((await request('school-fixture')).status, 400, 'approved caller reaches request validation');
    allowed = false;
    assert.equal((await request('personal-fixture')).status, 403);
    rpcStatus = 503;
    assert.equal((await request('school-fixture')).status, 503);
    assert.deepEqual(seenTokens, ['Bearer school-fixture', 'Bearer personal-fixture', 'Bearer school-fixture']);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});

test('neural synthesis escapes SSML and closes the provider even on empty output', async () => {
  const oldMetadata = MsEdgeTTS.prototype.setMetadata;
  const oldStream = MsEdgeTTS.prototype.toStream;
  const oldClose = MsEdgeTTS.prototype.close;
  let input = '';
  let closed = 0;
  MsEdgeTTS.prototype.setMetadata = async () => {};
  MsEdgeTTS.prototype.close = () => { closed++; };
  MsEdgeTTS.prototype.toStream = (text) => {
    input = text;
    return { audioStream: Readable.from([Buffer.from('mp3')]), metadataStream: null };
  };
  try {
    const result = await synthesizeNeural('你好 <break time="9s"/> & test', 'zh-CN-XiaoxiaoNeural');
    assert.equal(result.toString(), 'mp3');
    assert.equal(input, '你好 &lt;break time=&quot;9s&quot;/&gt; &amp; test');
    assert.equal(closed, 1);
    MsEdgeTTS.prototype.toStream = () => ({ audioStream: Readable.from([]), metadataStream: null });
    await assert.rejects(synthesizeNeural('empty', 'zh-CN-XiaoxiaoNeural'), /empty audio/);
    assert.equal(closed, 2);
  } finally {
    MsEdgeTTS.prototype.setMetadata = oldMetadata;
    MsEdgeTTS.prototype.toStream = oldStream;
    MsEdgeTTS.prototype.close = oldClose;
  }
});

test('neural synthesis expires a stalled provider and releases its connection', async (context) => {
  const oldMetadata = MsEdgeTTS.prototype.setMetadata;
  const oldClose = MsEdgeTTS.prototype.close;
  let closed = 0;
  MsEdgeTTS.prototype.setMetadata = () => new Promise(() => {});
  MsEdgeTTS.prototype.close = () => { closed++; };
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const rejected = assert.rejects(synthesizeNeural('stall', 'zh-CN-XiaoxiaoNeural'), /timed out/);
    context.mock.timers.tick(15_000);
    await rejected;
    assert.equal(closed, 1);
  } finally {
    context.mock.timers.reset();
    MsEdgeTTS.prototype.setMetadata = oldMetadata;
    MsEdgeTTS.prototype.close = oldClose;
  }
});

test('concurrent TTS callers share the storage miss and synthesis, with non-blocking persistence', async () => {
  const oldSend = S3Client.prototype.send;
  const oldMetadata = MsEdgeTTS.prototype.setMetadata;
  const oldStream = MsEdgeTTS.prototype.toStream;
  const oldClose = MsEdgeTTS.prototype.close;
  let reads = 0;
  let synthesis = 0;
  S3Client.prototype.send = (async (command: unknown) => {
    if (command instanceof GetObjectCommand) { reads++; return {}; }
    return new Promise(() => {}); // A hung cache write must not delay the audio response.
  }) as typeof S3Client.prototype.send;
  MsEdgeTTS.prototype.setMetadata = async () => { synthesis++; };
  MsEdgeTTS.prototype.toStream = () => ({ audioStream: Readable.from([Buffer.from('mp3')]), metadataStream: null });
  MsEdgeTTS.prototype.close = () => {};
  try {
    const clips = await Promise.all([getTtsAudio('dedupe-server', 'zh-CN-XiaoxiaoNeural'), getTtsAudio('dedupe-server', 'zh-CN-XiaoxiaoNeural')]);
    assert.equal(reads, 1);
    assert.equal(synthesis, 1);
    assert.equal(clips[0].buffer.toString(), 'mp3');
    const cached = await getTtsAudio('dedupe-server', 'zh-CN-XiaoxiaoNeural');
    assert.equal(cached.buffer.toString(), 'mp3');
    assert.equal(reads, 1);
  } finally {
    S3Client.prototype.send = oldSend;
    MsEdgeTTS.prototype.setMetadata = oldMetadata;
    MsEdgeTTS.prototype.toStream = oldStream;
    MsEdgeTTS.prototype.close = oldClose;
  }
});

test('cache endpoint accepts literal percent text and rejects prototype voices', async () => {
  const oldSend = S3Client.prototype.send;
  S3Client.prototype.send = (async () => ({})) as typeof S3Client.prototype.send;
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const missing = await fetch(`${base}/api/tts-cache/100%25`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error, 'TTS audio not cached');
    const invalid = await fetch(`${base}/api/tts-cache/test?voice=__proto__`);
    assert.equal(invalid.status, 400);
    const anonymous = await fetch(`${base}/api/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '你好' }) });
    assert.equal(anonymous.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    S3Client.prototype.send = oldSend;
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

test('a hung storage body releases the read after five seconds even if the transport ignores abort', async (context) => {
  const { getTtsObject } = await import('../../server/ttsStore');
  const oldSend = S3Client.prototype.send;
  S3Client.prototype.send = (async () => ({ Body: { transformToByteArray: () => new Promise(() => {}) } })) as typeof S3Client.prototype.send;
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const pending = getTtsObject('tts/test/stalled.mp3');
    await Promise.resolve();
    context.mock.timers.tick(5000);
    assert.equal(await pending, null);
  } finally { S3Client.prototype.send = oldSend; context.mock.timers.reset(); }
});
