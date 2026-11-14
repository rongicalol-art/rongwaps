// The site server in Cloudflare's own local runtime (`wrangler dev`), with the real routing rules from
// server/wrangler.jsonc over a small made-up site. Sign-in is synthetic: a throwaway key signs the tokens
// and a local stand-in answers for Supabase and the email provider. Nothing here reaches a real account.
//
//   npm run server:test
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { brotliCompressSync, brotliDecompressSync, gunzipSync } from 'node:zlib';
import { ASSETS_IGNORE, headersFile } from '../../scripts/build/siteHeaders.ts';

const root = path.resolve(import.meta.dirname, '../..');
const work = mkdtempSync(path.join(tmpdir(), 'rongwaps-server-'));
const site = path.join(work, 'dist');

// ─── A small site ───────────────────────────────────────────────────────────
const lesson = JSON.stringify({ lesson: 'school accounts only', filler: 'x'.repeat(4000) });
const files = {
  'index.html': "<!doctype html><title>Ron's Mandarin</title><div id=root></div>",
  'about.html': '<!doctype html><title>About</title>',
  'sw.js': '// service worker',
  'robots.txt': 'User-agent: *',
  'assets/app-abc123.js': 'console.log("app")',
  'fonts/font.woff2': 'font',
  'data/vocabulary/book-1.json': lesson,
  'data/study/1001001-8989b311b07f.json': lesson,
  'data/book-pages/1/page.webp': 'image-bytes',
  'data/plain.json': '{"plain":true}',
  'new-top-level-file.txt': 'not on the public list',
};
for (const [name, body] of Object.entries(files)) {
  mkdirSync(path.dirname(path.join(site, name)), { recursive: true });
  writeFileSync(path.join(site, name), body);
}
for (const name of ['data/vocabulary/book-1.json', 'data/study/1001001-8989b311b07f.json']) {
  writeFileSync(path.join(site, `${name}.br`), brotliCompressSync(Buffer.from(files[name])));
}

// ─── Stand-ins for Supabase and Resend ──────────────────────────────────────
const { privateKey, publicKey } = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = { ...await webcrypto.subtle.exportKey('jwk', publicKey), kid: 'test', alg: 'ES256', use: 'sig' };
const b64 = value => Buffer.from(value).toString('base64url');
const seen = { rpc: [], userChecks: 0 };
const supabase = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  const token = (req.headers.authorization ?? '').slice(7);
  if (req.url === '/auth/v1/.well-known/jwks.json') return send(200, { keys: [jwk] });
  if (req.url === '/auth/v1/user') { seen.userChecks += 1; return token.startsWith('legacy-') ? send(200, { id: token }) : send(401, { message: 'invalid' }); }
  if (req.url === '/rest/v1/rpc/has_beta_access') return send(200, token === 'legacy-school');
  if (req.url === '/rest/v1/rpc/submit_feedback') { seen.rpc.push(['feedback', JSON.parse(body), req.headers.apikey]); return send(200, true); }
  if (req.url === '/rest/v1/rpc/submit_report') { seen.rpc.push(['report', JSON.parse(body), req.headers.apikey]); return send(200, 41); }
  send(404, { message: 'unexpected' });
});
await new Promise(resolve => supabase.listen(0, '127.0.0.1', resolve));
const supabaseUrl = `http://127.0.0.1:${supabase.address().port}`;

async function token(sub, overrides = {}) {
  const head = b64(JSON.stringify({ alg: 'ES256', kid: 'test', typ: 'JWT' }));
  const body = b64(JSON.stringify({ sub, role: 'authenticated', aud: 'authenticated', iss: `${supabaseUrl}/auth/v1`,
    exp: Math.floor(Date.now() / 1000) + 600, school_beta: true, full_course: true, ...overrides }));
  const signature = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64(signature)}`;
}

// ─── The server, with the production routing rules ──────────────────────────
function startServer(configFile, port) {
  const config = JSON.parse(readFileSync(path.join(root, configFile), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  config.main = path.join(root, 'server/worker.ts');
  // Each server gets the site as its own build would leave it (header rules differ on staging).
  const directory = path.join(work, `site-${config.vars.APP_ENV}`);
  cpSync(site, directory, { recursive: true });
  writeFileSync(path.join(directory, '_headers'), headersFile(config.vars.APP_ENV));
  writeFileSync(path.join(directory, '.assetsignore'), ASSETS_IGNORE);
  config.assets.directory = directory;
  config.vars = { ...config.vars, SUPABASE_URL: supabaseUrl, SUPABASE_ANON_KEY: 'test-anon', COMMIT: 'test-commit' };
  delete config.$schema;
  const file = path.join(work, `${config.name}.json`);
  writeFileSync(file, JSON.stringify(config));
  const child = spawn(path.join(root, 'node_modules/.bin/wrangler'), ['dev', '--config', file, '--port', String(port), '--ip', '127.0.0.1', '--log-level', 'warn', '--persist-to', path.join(work, `state-${port}`)], {
    cwd: directory, stdio: ['ignore', 'inherit', 'inherit'],
    env: { PATH: process.env.PATH, HOME: process.env.HOME, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
  });
  return { child, base: `http://127.0.0.1:${port}` };
}
async function ready(base) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { if ((await fetch(`${base}/healthz`)).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`${base} did not start`);
}
/** A request whose address is sent exactly as written (fetch would tidy dots and slashes first). */
function raw(base, target, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const { hostname, port } = new URL(base);
    const request = httpRequest({ hostname, port, path: target, method, headers: { 'Accept-Encoding': 'br', ...headers } }, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const encoding = response.headers['content-encoding'];
        let bytes = Buffer.concat(chunks);
        if (bytes.length && encoding === 'br') bytes = brotliDecompressSync(bytes);
        if (bytes.length && encoding === 'gzip') bytes = gunzipSync(bytes);
        const text = bytes.toString();
        resolve({ status: response.statusCode, headers: new Headers(Object.entries(response.headers).map(([name, value]) => [name, String(value)])),
          text: async () => text, json: async () => JSON.parse(text) });
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

/** Local runtimes cannot share a machine port set: one server at a time. */
async function stop({ child }) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 5000); });
}
let live = null;
let staging = null;
const results = [];
async function check(name, run) {
  try { await run(); results.push(`ok   ${name}`); } catch (error) { results.push(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

try {
  staging = startServer('server/wrangler.staging.jsonc', 4412);
  await ready(staging.base);
  await check('staging tells search engines to stay away, on files and on answers', async () => {
    assert.equal((await (await fetch(`${staging.base}/healthz`)).json()).env, 'staging');
    for (const target of ['/', '/assets/app-abc123.js', '/healthz', '/library']) {
      assert.match((await raw(staging.base, target)).headers.get('x-robots-tag') ?? '', /noindex/, target);
    }
  });
  await stop(staging);

  live = startServer('server/wrangler.jsonc', 4411);
  await ready(live.base);
  const { base } = live;
  if (process.env.SERVER_TEST_PROBE) { for (const target of process.env.SERVER_TEST_PROBE.split(' ')) { const r = await raw(base, target); console.log('PROBE', target, r.status, JSON.stringify(Object.fromEntries(r.headers)), JSON.stringify((await r.text()).slice(0, 120))); } }
  const learner = { Authorization: `Bearer ${await token('learner-1')}` };

  await check('health reports the commit and the environment', async () => {
    assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), { ok: true, commit: 'test-commit', env: 'production' });
  });

  await check('public files and pages answer without a session, with their cache rules', async () => {
    const home = await raw(base, '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Ron's Mandarin/);
    assert.equal(home.headers.get('x-robots-tag'), null);
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(home.headers.get('x-frame-options'), 'DENY');
    const about = await raw(base, '/about');
    assert.equal(about.status, 200);
    assert.match(await about.text(), /About/);
    const script = await raw(base, '/assets/app-abc123.js');
    assert.equal(script.status, 200);
    assert.equal(script.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const worker = await raw(base, '/sw.js');
    assert.equal(worker.status, 200);
    assert.match(worker.headers.get('cache-control') ?? '', /no-cache/);
    assert.equal((await raw(base, '/fonts/font.woff2')).status, 200);
    // A file nobody listed as public still loads: the server hands it over.
    assert.equal((await raw(base, '/new-top-level-file.txt')).status, 200);
  });

  await check('app screens get the shell; unknown addresses and missing files answer 404', async () => {
    const screen = await raw(base, '/library/book/1');
    assert.equal(screen.status, 200);
    assert.match(await screen.text(), /Ron's Mandarin/);
    assert.match(screen.headers.get('cache-control') ?? '', /no-cache/);
    const unknown = await raw(base, '/no-such-screen');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.headers.get('x-robots-tag'), 'noindex');
    assert.match(await unknown.text(), /Ron's Mandarin/);
    // Cloudflare answers a missing public file itself; the server answers the rest.
    assert.equal((await raw(base, '/assets/missing-chunk.js')).status, 404);
    const missing = await raw(base, '/missing-file.txt');
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'Not found' });
    assert.equal((await raw(base, '/api/jev/grade-answer', { method: 'POST', body: '{}' })).status, 404);
    assert.equal((await raw(base, '/api/dictionary/search?q=teacher', { headers: learner })).status, 404);
  });

  await check('lesson content is locked under every spelling of its address', async () => {
    for (const target of [
      '/data/vocabulary/book-1.json', '/data/vocabulary/book-1.json.br', '/data/plain.json', '/data/book-pages/1/page.webp',
      '/%64ata/vocabulary/book-1.json', '//data/vocabulary/book-1.json', '/data//vocabulary/book-1.json',
      '/assets/../data/vocabulary/book-1.json', '/assets/%2e%2e/data/vocabulary/book-1.json', '/assets/..%2fdata/vocabulary/book-1.json',
      '/assets/..%5Cdata/vocabulary/book-1.json', '/fonts/%2E%2E%2Fdata%2Fvocabulary%2Fbook-1.json', '/./data/plain.json',
      '/data%2Fplain.json', '/data/missing.json', '/data',
    ]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await raw(base, target, { method });
        const text = await response.text();
        assert.ok([401, 404].includes(response.status), `${method} ${target}: ${response.status}`);
        assert.ok(!text.includes('school accounts only') && !text.includes('image-bytes') && !text.includes('"plain"'), `${method} ${target} leaked content`);
        if (response.status === 401) assert.equal(response.headers.get('cache-control'), 'private, no-store', target);
      }
    }
    // The plain addresses must be refusals, not misses.
    for (const target of ['/data/vocabulary/book-1.json', '/%64ata/vocabulary/book-1.json', '//data/vocabulary/book-1.json', '/data//vocabulary/book-1.json']) {
      assert.equal((await raw(base, target)).status, 401, target);
    }
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: 'Bearer not-a-token' } })).status, 401, 'not a token');
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: `Bearer ${await token('expired', { exp: 1 })}` } })).status, 401, 'expired');
    // A real token for someone else, with the name swapped: the signature no longer matches.
    const [head, , signature] = (await token('forger')).split('.');
    const forged = `${head}.${b64(JSON.stringify({ sub: 'someone-else', role: 'authenticated', aud: 'authenticated', iss: `${supabaseUrl}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 600, school_beta: true, full_course: true }))}.${signature}`;
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: `Bearer ${forged}` } })).status, 401, 'forged');
  });

  await check('a school account gets lesson content, compressed by the build, cached only in the browser', async () => {
    const pack = await raw(base, '/data/vocabulary/book-1.json', { headers: learner });
    assert.equal(pack.status, 200);
    assert.equal(pack.headers.get('content-encoding'), 'br');
    assert.match(pack.headers.get('content-type') ?? '', /application\/json/);
    assert.equal(pack.headers.get('cache-control'), 'private, no-cache');
    assert.deepEqual(await pack.json(), JSON.parse(lesson));
    const again = await raw(base, '/data/vocabulary/book-1.json', { headers: { ...learner, 'If-None-Match': pack.headers.get('etag') } });
    assert.equal(again.status, 304);
    assert.equal(again.headers.get('cache-control'), 'private, no-cache');
    const hashed = await raw(base, '/data/study/1001001-8989b311b07f.json', { headers: learner });
    assert.equal(hashed.headers.get('cache-control'), 'private, max-age=31536000, immutable');
    const versioned = await raw(base, '/data/plain.json?v=0123456789abcdef', { headers: learner });
    assert.equal(versioned.headers.get('cache-control'), 'private, max-age=31536000, immutable');
    assert.deepEqual(await versioned.json(), { plain: true });
    const identity = await raw(base, '/data/vocabulary/book-1.json', { headers: { ...learner, 'Accept-Encoding': 'identity' } });
    assert.deepEqual(await identity.json(), JSON.parse(lesson));
    const image = await raw(base, '/data/book-pages/1/page.webp', { headers: learner });
    assert.equal(await image.text(), 'image-bytes');
    assert.equal((await raw(base, '/data/missing.json', { headers: learner })).status, 404);
    assert.equal((await raw(base, '/data/vocabulary/book-1.json.br', { headers: learner })).status, 200);
  });

  await check('accounts without the school stamp are decided by the database', async () => {
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: 'Bearer legacy-school' } })).status, 200);
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: 'Bearer legacy-personal' } })).status, 403);
    const unstamped = `Bearer ${await token('unstamped', { school_beta: undefined })}`;
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: unstamped } })).status, 401, 'Supabase did not accept it');
    assert.ok(seen.userChecks >= 3);
  });

  await check('feedback and reports are saved as the learner; limits hold per learner', async () => {
    assert.deepEqual(await (await raw(base, '/api/games/config')).json(), { url: 'https://rons-mandarin-games.ronm222007.workers.dev' });
    const post = (target, body, headers = learner) => raw(base, target, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const feedback = { id: '3f9b431e-a058-478b-bd3e-c49d06101ac1', message: 'Audio stopped', path: '/library' };
    assert.equal((await post('/api/feedback', feedback, {})).status, 401);
    assert.equal((await post('/api/feedback', { ...feedback, message: '' })).status, 400);
    const saved = await post('/api/feedback', feedback);
    assert.equal(saved.status, 200);
    assert.equal(saved.headers.get('cache-control'), 'private, no-store');
    const [kind, args, apikey] = seen.rpc.at(-1);
    assert.deepEqual([kind, args.p_message, args.p_app_version, apikey], ['feedback', 'Audio stopped', 'test-commit', 'test-anon']);
    assert.equal((await post('/api/feedback', feedback)).status, 200);
    assert.equal((await post('/api/feedback', feedback)).status, 429, 'three a minute');
    const other = { Authorization: `Bearer ${await token('learner-2')}` };
    assert.equal((await post('/api/feedback', feedback, other)).status, 200, 'another learner is not limited');
    const report = { target: '3f9b431e-a058-478b-bd3e-c49d06101ac1', reason: 'rude', place: 'chat', message: 'go away' };
    assert.equal((await post('/api/reports', report)).status, 200);
    assert.equal((await post('/api/reports', { ...report, reason: 'mean' })).status, 400);
  });
} finally {
  if (live) await stop(live);
  if (staging) await stop(staging);
  supabase.close();
  rmSync(work, { recursive: true, force: true });
}
console.log(results.join('\n'));
console.log(process.exitCode ? 'server runtime: FAILED' : 'server runtime: all checks passed');
