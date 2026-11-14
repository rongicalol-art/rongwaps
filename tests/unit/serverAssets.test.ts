import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { ASSETS_IGNORE, headersFile } from '../../scripts/build/siteHeaders';
import { REVALIDATED_FILES } from '../../server/content';

interface WranglerConfig {
  name: string;
  vars: Record<string, string>;
  ratelimits: Array<{ name: string; namespace_id: string; simple: { limit: number; period: number } }>;
  assets: { directory: string; binding: string; html_handling: string; not_found_handling: string; run_worker_first: string[] };
  [key: string]: unknown;
}
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, '')) as WranglerConfig;
const live = read('server/wrangler.jsonc');
const staging = read('server/wrangler.staging.jsonc');

test('Cloudflare serves only listed public files on its own; lesson content always reaches the server', () => {
  const [first, ...publicPaths] = live.assets.run_worker_first;
  assert.equal(first, '/*', 'the server runs first for everything...');
  assert.ok(publicPaths.length > 0 && publicPaths.every(pattern => /^!\/[A-Za-z0-9._*/-]*$/.test(pattern)), '...except exact public paths');
  // No public pattern may reach into /data, by name or by wildcard.
  for (const pattern of publicPaths) {
    const path = pattern.slice(1);
    assert.ok(!/^\/data(\/|$)/.test(path) && !/^\/\*/.test(path) && !/^\/d[^/]*\*/.test(path) && !path.includes('..'), `${pattern} must not expose lesson content`);
    const wildcards = path.split('*').length - 1;
    assert.ok(wildcards === 0 || (wildcards === 1 && (path.endsWith('/*') || /^\/[a-z]+-\*\.js$/.test(path))), `${pattern}: a wildcard covers one public folder or one named file family`);
  }
  assert.equal(live.assets.not_found_handling, 'none', 'a missing file must never fall back to another file');

  // Every file and folder the app ships as public is on the list (otherwise it still loads, but costs a server request).
  for (const entry of readdirSync('public')) {
    if (entry === 'data' || entry === 'audio' || entry.startsWith('.')) continue;
    const expected = statSync(`public/${entry}`).isDirectory() ? `!/${entry}/*` : `!/${entry}`;
    assert.ok(publicPaths.includes(expected), `${expected} is missing from run_worker_first in server/wrangler.jsonc`);
  }
  for (const built of ['!/', '!/index.html', '!/assets/*', '!/sw.js', '!/asset-manifest.json', '!/about', '!/privacy', '!/terms', '!/sources']) {
    assert.ok(publicPaths.includes(built), `${built} is missing from run_worker_first`);
  }
});

test('staging runs the same server settings as the live site, apart from its own names and addresses', () => {
  assert.deepEqual(staging.assets, live.assets);
  assert.deepEqual(staging.ratelimits.map(({ name, simple }) => ({ name, simple })), live.ratelimits.map(({ name, simple }) => ({ name, simple })));
  const ids = [...live.ratelimits, ...staging.ratelimits].map(limit => limit.namespace_id);
  assert.equal(new Set(ids).size, ids.length, 'each limit counts on its own');
  assert.deepEqual(Object.keys(staging.vars), Object.keys(live.vars));
  assert.equal(live.vars.APP_ENV, 'production');
  assert.equal(staging.vars.APP_ENV, 'staging');
  assert.ok(staging.vars.GAMES_SERVER_URL.includes('staging') && !live.vars.GAMES_SERVER_URL.includes('staging'));
  assert.notEqual(staging.vars.SUPABASE_URL, live.vars.SUPABASE_URL);
  for (const key of Object.keys(live)) {
    if (!['name', 'vars', 'ratelimits', 'assets'].includes(key)) assert.deepEqual(staging[key], live[key], key);
  }
});

test('the header rules for files Cloudflare serves match the server, and staging stays out of search engines', () => {
  const production = headersFile('production');
  assert.match(production, /^\/\*\n( {2}.+\n)* {2}X-Content-Type-Options: nosniff\n/m);
  assert.match(production, /^\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable$/m);
  for (const name of REVALIDATED_FILES) assert.match(production, new RegExp(`^/${name.replace('.', '\\.')}\\n  Cache-Control: no-cache$`, 'm'));
  const everything = production.slice(production.indexOf('/*'), production.indexOf('\n\n', production.indexOf('/*')));
  assert.ok(!everything.includes('X-Robots-Tag'), 'the live site is indexable');
  assert.match(production, /workers\.dev\/\*\n {2}X-Robots-Tag: noindex/);
  const stagingRules = headersFile('staging');
  assert.match(stagingRules.slice(0, stagingRules.indexOf('/assets/*')), /X-Robots-Tag: noindex, nofollow, noarchive/);
  assert.ok(production.split('\n').every(line => line.length < 2000) && (production.match(/^\S.*$/gm) ?? []).length < 100, "within Cloudflare's limits");
  assert.ok(ASSETS_IGNORE.includes('*.gz') && ASSETS_IGNORE.includes('/audio/') && !/^\*?\.br$/m.test(ASSETS_IGNORE), 'the Brotli copies are uploaded');
});
