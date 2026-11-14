// The site server in Cloudflare's runtime, with the real routing rules from server/wrangler.jsonc over a
// small made-up site. Sign-in is synthetic: a throwaway key signs the tokens, and a stand-in inside the test
// build answers for Supabase. Nothing here reaches a real account or the real site.
//
//   npm run server:test              local runtime (`wrangler dev`): part of the gate and CI
//   npm run server:test -- --edge    the same checks on Cloudflare itself: uploads a throwaway Worker
//                                    (rons-mandarin-edge-check, its own address), then deletes it.
//                                    Run it before a change to routing or compression goes live.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { brotliCompressSync, brotliDecompressSync, gunzipSync } from 'node:zlib';
import { ASSETS_IGNORE, headersFile } from '../../scripts/build/siteHeaders.ts';

const edge = process.argv.includes('--edge');
const root = path.resolve(import.meta.dirname, '../..');
const wrangler = path.join(root, 'node_modules/.bin/wrangler');
const work = mkdtempSync(path.join(tmpdir(), 'rongwaps-server-'));
const site = path.join(work, 'dist');
const EDGE_WORKER = 'rons-mandarin-edge-check';
const SUPABASE = 'https://supabase-stand-in.invalid';

// ─── A small site ───────────────────────────────────────────────────────────
const lesson = JSON.stringify({ lesson: 'school accounts only', filler: 'lesson text '.repeat(400) });
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
const packed = {};
for (const name of ['data/vocabulary/book-1.json', 'data/study/1001001-8989b311b07f.json']) {
  packed[name] = brotliCompressSync(Buffer.from(files[name]));
  writeFileSync(path.join(site, `${name}.br`), packed[name]);
}

// ─── Synthetic sign-in ──────────────────────────────────────────────────────
const { privateKey, publicKey } = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = { ...await webcrypto.subtle.exportKey('jwk', publicKey), kid: 'test', alg: 'ES256', use: 'sig' };
const b64 = value => Buffer.from(value).toString('base64url');
const claims = (sub, overrides = {}) => ({ sub, role: 'authenticated', aud: 'authenticated', iss: `${SUPABASE}/auth/v1`,
  exp: Math.floor(Date.now() / 1000) + 600, school_beta: true, full_course: true, ...overrides });
async function token(sub, overrides = {}) {
  const head = b64(JSON.stringify({ alg: 'ES256', kid: 'test', typ: 'JWT' }));
  const body = b64(JSON.stringify(claims(sub, overrides)));
  const signature = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64(signature)}`;
}

// The real server (server/worker.ts) with Supabase answered from inside the build: the public half of the
// throwaway key, and the database functions the server calls. `/__seen` reports what the stand-in received.
const entry = path.join(work, 'entry.mjs');
writeFileSync(entry, `
import worker from ${JSON.stringify(path.join(root, 'server/worker.ts'))};
const network = globalThis.fetch;
const seen = { rpc: [], userChecks: 0 };
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== ${JSON.stringify(SUPABASE)}) return network(input, init);
  const headers = new Headers(init.headers);
  const token = (headers.get('authorization') ?? '').slice(7);
  const body = init.body ? JSON.parse(String(init.body)) : null;
  if (url.pathname === '/auth/v1/.well-known/jwks.json') return Response.json({ keys: [${JSON.stringify(jwk)}] });
  if (url.pathname === '/auth/v1/user') { seen.userChecks += 1; return token.startsWith('legacy-') ? Response.json({ id: token }) : Response.json({ message: 'invalid' }, { status: 401 }); }
  if (url.pathname === '/rest/v1/rpc/has_beta_access') return Response.json(token === 'legacy-school');
  if (url.pathname === '/rest/v1/rpc/submit_feedback') { seen.rpc.push(['feedback', body, headers.get('apikey')]); return Response.json(true); }
  if (url.pathname === '/rest/v1/rpc/submit_report') { seen.rpc.push(['report', body, headers.get('apikey')]); return Response.json(41); }
  return Response.json({ message: 'unexpected' }, { status: 404 });
};
export default { fetch(request, env, ctx) {
  if (new URL(request.url).pathname === '/__seen') return Response.json(seen);
  return worker.fetch(request, env, ctx);
} };
`);

// ─── The server, with the production routing rules ──────────────────────────
function configFor(configFile, name) {
  const config = JSON.parse(readFileSync(path.join(root, configFile), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  // The site as that environment's build would leave it (header rules differ on staging).
  const directory = path.join(work, `site-${name}`);
  cpSync(site, directory, { recursive: true });
  writeFileSync(path.join(directory, '_headers'), headersFile(config.vars.APP_ENV));
  writeFileSync(path.join(directory, '.assetsignore'), ASSETS_IGNORE);
  config.name = name;
  config.main = entry;
  config.assets.directory = directory;
  config.vars = { ...config.vars, SUPABASE_URL: SUPABASE, SUPABASE_ANON_KEY: 'test-anon', COMMIT: 'test-commit' };
  // Its own counters, so a run never shares limits with the live or staging site.
  config.ratelimits = config.ratelimits.map((limit, index) => ({ ...limit, namespace_id: String(9001 + index) }));
  delete config.$schema;
  const file = path.join(work, `${name}.json`);
  writeFileSync(file, JSON.stringify(config));
  return { file, directory };
}
const wranglerEnv = { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' };

function startLocal(configFile, port) {
  const { file, directory } = configFor(configFile, `local-${port}`);
  const child = spawn(wrangler, ['dev', '--config', file, '--port', String(port), '--ip', '127.0.0.1', '--log-level', 'warn', '--persist-to', path.join(work, `state-${port}`)], {
    cwd: directory, stdio: ['ignore', 'inherit', 'inherit'], env: wranglerEnv,
  });
  return { child, base: `http://127.0.0.1:${port}` };
}
/** Local runtimes cannot share a machine: one server at a time. */
async function stop(server) {
  if (!server?.child || server.child.exitCode !== null) return;
  server.child.kill('SIGTERM');
  await new Promise(resolve => { server.child.once('exit', resolve); setTimeout(resolve, 5000); });
}
function deployToEdge() {
  const { file } = configFor('server/wrangler.jsonc', EDGE_WORKER);
  const output = execFileSync(wrangler, ['deploy', '--config', file, '--message', 'edge check (temporary)'], { cwd: work, encoding: 'utf8', env: wranglerEnv, stdio: ['ignore', 'pipe', 'inherit'] });
  const base = /https:\/\/[a-z0-9.-]+\.workers\.dev/.exec(output)?.[0];
  if (!base) throw new Error('wrangler did not report the address of the edge check');
  return { base, remove: () => execFileSync(wrangler, ['delete', '--config', file, '--force'], { cwd: work, env: wranglerEnv, stdio: 'ignore' }) };
}
async function ready(base, expected = 'test-commit') {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${base}/healthz`);
      if (response.ok && (await response.json()).commit === expected) return;
    } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`${base} did not start`);
}

/** A request whose address is sent exactly as written (fetch would tidy dots and slashes first). */
function raw(base, target, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, port } = new URL(base);
    const send = protocol === 'https:' ? httpsRequest : httpRequest;
    const request = send({ hostname, port, path: target, method, headers: { 'Accept-Encoding': 'br', ...headers } }, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const encoding = response.headers['content-encoding'];
        const sent = Buffer.concat(chunks);
        let bytes = sent;
        if (bytes.length && encoding === 'br') bytes = brotliDecompressSync(bytes);
        if (bytes.length && encoding === 'gzip') bytes = gunzipSync(bytes);
        const text = bytes.toString();
        resolve({ status: response.statusCode, sent, headers: new Headers(Object.entries(response.headers).map(([name, value]) => [name, String(value)])),
          text: async () => text, json: async () => JSON.parse(text) });
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

const results = [];
async function check(name, run) {
  try { await run(); results.push(`ok   ${name}`); } catch (error) { results.push(`FAIL ${name}: ${error.message.replace(/\s+/g, " ")}`); process.exitCode = 1; }
}

let staging = null;
let live = null;
try {
  if (!edge) {
    staging = startLocal('server/wrangler.staging.jsonc', 4412);
    await ready(staging.base);
    await check('staging tells search engines to stay away, on files and on answers', async () => {
      assert.equal((await (await fetch(`${staging.base}/healthz`)).json()).env, 'staging');
      for (const target of ['/', '/assets/app-abc123.js', '/healthz', '/library']) {
        assert.match((await raw(staging.base, target)).headers.get('x-robots-tag') ?? '', /noindex/, target);
      }
    });
    await stop(staging);
  }

  live = edge ? deployToEdge() : startLocal('server/wrangler.jsonc', 4411);
  await ready(live.base);
  const { base } = live;
  const learner = { Authorization: `Bearer ${await token('learner-1')}` };
  const seen = async () => (await fetch(`${base}/__seen`)).json();

  await check('health reports the commit and the environment', async () => {
    assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), { ok: true, commit: 'test-commit', env: 'production' });
  });

  await check('public files and pages answer without a session, with their cache rules', async () => {
    const home = await raw(base, '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Ron's Mandarin/);
    // Only the real address of the live site is for search engines; its Cloudflare address is not.
    assert.equal(home.headers.get('x-robots-tag'), edge ? 'noindex' : null);
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(home.headers.get('x-frame-options'), 'DENY');
    const about = await raw(base, '/about');
    assert.equal(about.status, 200);
    assert.match(await about.text(), /About/);
    const script = await raw(base, '/assets/app-abc123.js');
    assert.equal(script.status, 200);
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
    assert.match(unknown.headers.get('x-robots-tag') ?? '', /noindex/);
    assert.match(await unknown.text(), /Ron's Mandarin/);
    // Cloudflare answers a missing public file itself; a browser must not remember that answer.
    const chunk = await raw(base, '/assets/missing-chunk.js');
    assert.equal(chunk.status, 404);
    assert.ok(!/max-age=[1-9]|immutable/.test(chunk.headers.get('cache-control') ?? ''), `a missing file is cacheable: ${chunk.headers.get('cache-control')}`);
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
      '/data%2Fplain.json', '/data/missing.json', '/data', '/DATA/plain.json', '/data/plain.json/', '/data/plain.json%00',
    ]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await raw(base, target, { method });
        const text = await response.text();
        assert.ok([400, 401, 404].includes(response.status), `${method} ${target}: ${response.status}`);
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
    const forged = `${head}.${b64(JSON.stringify(claims('someone-else')))}.${signature}`;
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: `Bearer ${forged}` } })).status, 401, 'forged');
  });

  await check('a school account gets lesson content, compressed by the build, cached only in the browser', async () => {
    const pack = await raw(base, '/data/vocabulary/book-1.json', { headers: learner });
    assert.equal(pack.status, 200);
    assert.equal(pack.headers.get('content-encoding'), 'br');
    assert.ok(pack.sent.equals(packed['data/vocabulary/book-1.json']), "the build's own compressed bytes arrive untouched");
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
    // Browsers without Brotli still get the right content, whatever Cloudflare compresses it with.
    for (const accepted of ['identity', 'gzip']) {
      const other = await raw(base, '/data/vocabulary/book-1.json', { headers: { ...learner, 'Accept-Encoding': accepted } });
      assert.notEqual(other.headers.get('content-encoding'), 'br', accepted);
      assert.deepEqual(await other.json(), JSON.parse(lesson), accepted);
    }
    const image = await raw(base, '/data/book-pages/1/page.webp', { headers: learner });
    assert.equal(await image.text(), 'image-bytes');
    const part = await raw(base, '/data/book-pages/1/page.webp', { headers: { ...learner, Range: 'bytes=0-4' } });
    // Cloudflare's file store may answer a range with the whole file, which is valid; lesson content is never streamed.
    assert.ok([[206, 'image'], [200, 'image-bytes']].some(([status, body]) => part.status === status && part.sent.toString() === body), `range: ${part.status}`);
    assert.equal((await raw(base, '/data/missing.json', { headers: learner })).status, 404);
    assert.equal((await raw(base, '/data/vocabulary/book-1.json.br', { headers: learner })).status, 200);
  });

  await check('accounts without the school stamp are decided by the database', async () => {
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: 'Bearer legacy-school' } })).status, 200);
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: 'Bearer legacy-personal' } })).status, 403);
    const unstamped = `Bearer ${await token('unstamped', { school_beta: undefined })}`;
    assert.equal((await raw(base, '/data/plain.json', { headers: { Authorization: unstamped } })).status, 401, 'Supabase did not accept it');
    // Cloudflare runs many copies of the server, so only the local run can count what one copy received.
    if (!edge) assert.ok((await seen()).userChecks >= 3);
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
    const report = { target: '3f9b431e-a058-478b-bd3e-c49d06101ac1', reason: 'rude', place: 'chat', message: 'go away' };
    assert.equal((await post('/api/reports', report)).status, 200);
    assert.equal((await post('/api/reports', { ...report, reason: 'mean' })).status, 400);
    if (edge) {
      // Cloudflare's limiter counts in the background, per location: it must close soon, not on an exact request.
      const statuses = [];
      for (let attempt = 0; attempt < 40 && !statuses.includes(429); attempt += 1) statuses.push((await post('/api/feedback', feedback)).status);
      assert.ok(statuses.includes(429), `the feedback limit never closed: ${statuses.join(' ')}`);
      return;
    }
    const [kind, args, apikey] = (await seen()).rpc.find(([name]) => name === 'feedback');
    assert.deepEqual([kind, args.p_message, args.p_app_version, apikey], ['feedback', 'Audio stopped', 'test-commit', 'test-anon']);
    assert.equal((await post('/api/feedback', feedback)).status, 200);
    assert.equal((await post('/api/feedback', feedback)).status, 429, 'three a minute');
    const other = { Authorization: `Bearer ${await token('learner-2')}` };
    assert.equal((await post('/api/feedback', feedback, other)).status, 200, 'another learner is not limited');
  });
} finally {
  await stop(staging);
  if (edge) { try { live?.remove(); } catch { console.error(`Could not delete the temporary Worker ${EDGE_WORKER}: delete it in the Cloudflare dashboard.`); process.exitCode = 1; } } else await stop(live);
  rmSync(work, { recursive: true, force: true });
}
console.log(results.join('\n'));
console.log(`server runtime (${edge ? 'Cloudflare' : 'local'}): ${process.exitCode ? 'FAILED' : 'all checks passed'}`);
