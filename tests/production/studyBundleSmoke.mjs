/** Run after npm run build: verifies the real production gate, sidecars and worker with fixture auth. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import http from 'node:http';

const temporary = await mkdtemp(join(tmpdir(), 'study-bundle-smoke-'));
const preload = join(temporary, 'fixture-auth.mjs');
await writeFile(preload, `const network=globalThis.fetch;globalThis.fetch=(input,init)=>{
const url=new URL(String(input));if(url.origin!=='https://production-fixture.supabase.co')return network(input,init);
return Promise.resolve(Response.json(url.pathname==='/auth/v1/user'?{id:'fixture',email:'fixture@stu.edu.tw'}:true));};`);
const available = createServer();
await new Promise(resolve => available.listen(0, '127.0.0.1', resolve));
const port = available.address().port;
await new Promise(resolve => available.close(resolve));
const child = spawn(process.execPath, ['--import', preload, 'dist-server/server.js'], {
  env: { ...process.env, PORT: String(port), NODE_ENV: 'production', VITE_SUPABASE_URL: 'https://production-fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'fixture-key', SENTRY_DSN: '' },
  stdio: 'ignore',
});
function request(path, encoding = 'identity', authenticated = true) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path, headers: {
      'Accept-Encoding': encoding, ...(authenticated ? { Authorization: 'Bearer fixture' } : {}),
    } }, response => {
      const buffers = []; response.on('data', bytes => buffers.push(bytes));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(buffers) }));
    });
    req.setTimeout(25_000, () => req.destroy(new Error('Fixture request timed out')));
    req.on('error', reject);
  });
}
try {
  for (let attempt = 0; ; attempt++) {
    try { await request('/healthz'); break; }
    catch (error) { if (attempt > 100 || child.exitCode !== null) throw error; await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  const manifest = JSON.parse(await readFile('dist/data/study/manifest.json', 'utf8'));
  const path = manifest.parts[0].path;
  const original = await readFile('dist' + path);
  for (const encoding of ['br', 'gzip', 'identity']) {
    const response = await request(path, encoding);
    assert.equal(response.status, 200);
    assert.match(response.headers['cache-control'], /private, no-store/);
    assert.match(response.headers.vary, /Authorization/);
    assert.match(response.headers.vary, /Accept-Encoding/);
    const decoded = encoding === 'br' ? brotliDecompressSync(response.body) : encoding === 'gzip' ? gunzipSync(response.body) : response.body;
    assert.deepEqual(decoded, original);
    if (encoding !== 'identity') assert.equal(response.headers['content-encoding'], encoding);
  }
  for (const suffix of ['', '.br', '.gz']) assert.equal((await request(path + suffix, 'br', false)).status, 401);
  const response = await request('/api/dictionary/search?q=teacher');
  assert.equal(response.status, 200);
  assert.ok(JSON.parse(response.body).some(row => row.simplified === '老师'));
  console.log('Production study smoke passed: authenticated Brotli/gzip/identity, protected sidecars, bundled search worker.');
} finally {
  if (child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
  await rm(temporary, { recursive: true, force: true });
}
