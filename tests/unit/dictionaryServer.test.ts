import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildStudyPacks } from '../../scripts/performance/studyPacks';
import { closeDictionary } from '../../server/dictionary';

process.env.NODE_ENV = 'test';
const { app } = await import('../../server/index');

test('dictionary API authenticates, bounds requests, serves small results and keeps HTTP responsive', async t => {
  for (const [path, bytes] of await buildStudyPacks(process.cwd())) {
    if (!path.endsWith('.json')) continue;
    const target = resolve(`.vite/study${path}`); await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes);
  }
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const originalUrl = process.env.VITE_SUPABASE_URL;
  const originalKey = process.env.VITE_SUPABASE_ANON_KEY;
  process.env.VITE_SUPABASE_URL = 'https://dictionary-fixture.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'fixture-key';
  const networkFetch = globalThis.fetch;
  let access: boolean | 'outage' = true;
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.origin === base) return networkFetch(input, init);
    assert.equal(url.origin, 'https://dictionary-fixture.supabase.co');
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'fixture', email: 'fixture@stu.edu.tw' });
    assert.equal(url.pathname, '/rest/v1/rpc/has_beta_access');
    return access === 'outage' ? Response.json({ message: 'outage' }, { status: 503 }) : Response.json(access);
  });
  const headers = { Authorization: 'Bearer dictionary-fixture', 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(base + '/api/dictionary/search?q=teacher')).status, 401);
    access = false;
    assert.equal((await fetch(base + '/api/dictionary/search?q=teacher', { headers })).status, 403);
    access = 'outage';
    assert.equal((await fetch(base + '/api/dictionary/search?q=teacher', { headers })).status, 503);
    access = true;
    assert.equal((await fetch(base + '/api/dictionary/search?q=teacher&limit=1000', { headers })).status, 400);
    assert.equal((await fetch(base + '/api/dictionary/lookup', { headers, method: 'POST', body: JSON.stringify({ words: Array(65).fill('好') }) })).status, 400);
    let finished = false;
    const started = performance.now();
    const cold = fetch(base + '/api/dictionary/search?q=teacher', { headers }).then(response => { finished = true; return response; });
    assert.equal((await fetch(base + '/healthz')).status, 200);
    assert.equal(finished, false, 'HTTP can answer while the worker builds its index');
    const response = await cold;
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.match(response.headers.get('vary') ?? '', /Authorization/);
    const bytes = await response.text(); assert.ok(Buffer.byteLength(bytes) < 30_000);
    const rows = JSON.parse(bytes) as Array<{ simplified: string }>;
    assert.ok(rows.some(row => row.simplified === '老师'));
    const coldMs = performance.now() - started;
    const warm = performance.now();
    assert.equal((await fetch(base + '/api/dictionary/search?q=teacher', { headers })).status, 200);
    const warmMs = performance.now() - warm;
    for (const path of ['lookup', 'course']) {
      const response = await fetch(base + '/api/dictionary/' + path, { headers, method: 'POST', body: JSON.stringify({ words: ['你好'] }) });
      assert.equal(response.status, 200); assert.ok(JSON.stringify(await response.json()).includes('你好'));
    }
    const examples = await fetch(base + '/api/dictionary/examples?word=' + encodeURIComponent('同學'), { headers });
    assert.equal(examples.status, 200); assert.ok((await examples.json() as unknown[]).length);
    console.log(JSON.stringify({ coldDictionaryMs: Math.round(coldMs), warmDictionaryMs: Math.round(warmMs), searchResponseBytes: Buffer.byteLength(bytes) }));
  } finally {
    closeDictionary();
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (originalUrl === undefined) delete process.env.VITE_SUPABASE_URL; else process.env.VITE_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY; else process.env.VITE_SUPABASE_ANON_KEY = originalKey;
  }
});
