/**
 * Signed-out checks of a deployed site, run after every staging and production
 * deploy (deploy.yml) and by hand: proves the right build is live, talks to the
 * right database, and still locks lesson content. Never signs in or writes.
 *
 *   tsx scripts/release/smoke.ts <baseUrl> --env production|staging
 *     [--commit <sha>]          wait (rollout) until /healthz reports it
 *     [--supabase-ref <ref>]    the entry bundle must use this Supabase project
 *     [--forbid-ref <ref>]      ...and never this one (staging must not reach production)
 */
import { fileURLToPath } from 'node:url';

interface Options {
  base: string;
  env: 'production' | 'staging';
  commit?: string;
  supabaseRef?: string;
  forbidRef?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parse(argv: string[]): Options {
  const [base, ...rest] = argv;
  if (!base?.startsWith('https://') && !base?.startsWith('http://')) throw new Error('base URL required');
  const flag = (name: string) => {
    const index = rest.indexOf(`--${name}`);
    return index >= 0 ? rest[index + 1] : undefined;
  };
  const env = flag('env');
  if (env !== 'production' && env !== 'staging') throw new Error('--env production|staging required');
  return { base: base.replace(/\/+$/, ''), env, commit: flag('commit'), supabaseRef: flag('supabase-ref'), forbidRef: flag('forbid-ref') };
}

const REQUEST_TIMEOUT_MS = 15_000;
const CHECK_DEADLINE_MS = 30_000;
const SMOKE_DEADLINE_MS = 120_000;

class NonRetryableSmokeError extends Error {}

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), ...init, headers: { 'User-Agent': 'rongwaps-release-smoke', ...init.headers } });
}

/** A new version reaches every Cloudflare location within seconds; allow a few minutes. */
async function waitForBuild(options: Options, minutes = 5): Promise<void> {
  const deadline = Date.now() + minutes * 60_000;
  let seen = '';
  while (Date.now() < deadline) {
    try {
      const response = await get(`${options.base}/healthz`);
      if (response.ok) {
        const body = await response.json() as { ok?: boolean; commit?: string | null };
        seen = body.commit ?? 'unknown';
        if (body.ok && (!options.commit || body.commit === options.commit)) return;
      }
    } catch { /* not answering yet */ }
    await sleep(5_000);
  }
  throw new Error(`/healthz did not report ${options.commit ?? 'ok'} within ${minutes} minutes (last seen ${seen || 'nothing'})`);
}

type Check = [name: string, run: () => Promise<void>];

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function checks(options: Options): Check[] {
  const url = (path: string) => `${options.base}${path}`;
  const staging = options.env === 'staging';
  return [
    ['health', async () => {
      const response = await get(url('/healthz'));
      expect(response.status === 200, `status ${response.status}`);
      const body = await response.json() as { ok: boolean; env?: string; commit?: string | null };
      expect(body.ok === true, 'ok is not true');
      expect(!body.env || body.env === options.env, `reports env ${body.env}`);
      expect(!options.commit || body.commit === options.commit, `reports commit ${body.commit ?? 'none'} (expected ${options.commit})`);
    }],
    ['home page and its code load', async () => {
      const response = await get(url('/'));
      expect(response.status === 200, `status ${response.status}`);
      const html = await response.text();
      expect(/<title>[^<]*Ron's Mandarin/.test(html), 'title missing');
      const robots = response.headers.get('x-robots-tag') ?? '';
      expect(staging ? robots.includes('noindex') : !robots.includes('noindex'), staging ? 'staging must send noindex' : 'production must be indexable');
      const scripts = [...html.matchAll(/<script[^>]+src="(\/assets\/[^"]+\.js)"/g)].map((match) => match[1]);
      expect(scripts.length > 0, 'no entry script');
      for (const script of scripts) {
        const asset = await get(url(script));
        expect(asset.status === 200 && /javascript/.test(asset.headers.get('content-type') ?? ''), `${script}: ${asset.status}`);
        const code = await asset.text();
        if (options.supabaseRef) expect(code.includes(`${options.supabaseRef}.supabase.co`), `${script} does not use Supabase ${options.supabaseRef}`);
        if (options.forbidRef) expect(!code.includes(options.forbidRef), `${script} references the forbidden Supabase project`);
      }
    }],
    ['public pages', async () => {
      for (const path of ['/books', '/books/1/lesson-4', '/books/3/lesson-5', '/grammar', '/tocfl', '/privacy', '/terms', '/about']) {
        const response = await get(url(path));
        expect(response.status === 200 && (response.headers.get('content-type') ?? '').includes('text/html'), `${path}: ${response.status}`);
      }
    }],
    ['missing pages show the app', async () => {
      // Cloudflare serves /books, /grammar and /tocfl itself; a missing page there gets the folder's 404.html, not a blank page.
      for (const path of ['/books/1', '/grammar/no-such-page', '/tocfl/no-such-list', '/no-such-page']) {
        const response = await get(url(path));
        const html = await response.text();
        expect(response.status === 404 && /<div id="root">/.test(html), `${path}: ${response.status}, ${html.length} bytes (expected 404 with the app)`);
      }
    }],
    ['lesson content needs sign-in', async () => {
      for (const path of ['/data/vocabulary/book-1.json', '/data/dictionary/manifest.json', '/%64ata/grammar/book-1.json', '//data/grammar/book-1.json']) {
        const response = await get(url(path));
        if (response.status >= 200 && response.status < 300) throw new NonRetryableSmokeError(`${path}: ${response.status} (unauthenticated content exposed)`);
        expect(response.status === 401, `${path}: ${response.status} (expected 401)`);
      }
      // Other spellings may be refused or simply not exist; they must never hand over a file.
      for (const path of ['/data/vocabulary/book-1.json.br', '/assets/..%2fdata/vocabulary/book-1.json', '/assets/..%5Cdata/vocabulary/book-1.json', '/fonts/%2e%2e%2fdata%2fvocabulary%2fbook-1.json']) {
        const response = await get(url(path));
        if (response.status >= 200 && response.status < 300) throw new NonRetryableSmokeError(`${path}: ${response.status} (unauthenticated content exposed)`);
        expect(response.status === 401 || response.status === 404, `${path}: ${response.status} (expected 401 or 404)`);
      }
      // In a page folder with a 404.html Cloudflare redirects such a spelling to its plain form, which is the server's.
      for (const path of ['/books/..%2fdata/vocabulary/book-1.json', '/grammar/%2e%2e%2fdata%2fgrammar%2fbook-1.json']) {
        const response = await get(url(path));
        if (response.status >= 200 && response.status < 300) throw new NonRetryableSmokeError(`${path}: ${response.status} (unauthenticated content exposed)`);
        const location = response.headers.get('location') ?? '';
        expect(response.status === 404 || (response.status === 307 && /^\/(books|grammar)\//.test(location)), `${path}: ${response.status} ${location} (expected 404, or a redirect on this site)`);
      }
    }],
    ['service worker revalidates', async () => {
      const response = await get(url('/sw.js'));
      expect(response.status === 200, `status ${response.status}`);
      expect((response.headers.get('cache-control') ?? '').includes('no-cache'), 'sw.js must be no-cache');
    }],
    ['retired grading API stays gone', async () => {
      const response = await get(url('/api/jev/grade-answer'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      expect(response.status === 404, `status ${response.status}`);
    }],
    ['study-together config', async () => {
      const response = await get(url('/api/games/config'));
      expect(response.status === 200, `status ${response.status}`);
      const body = await response.json() as { url?: string | null };
      if (body.url) expect(staging === body.url.includes('staging'), `games server ${body.url} does not match ${options.env}`);
      // The Study together server ships with each release; check it answers too.
      if (body.url) {
        const health = await get(`${body.url.replace(/\/+$/, '')}/healthz`);
        expect(health.status === 200, `games server /healthz: ${health.status}`);
      }
    }],
  ];
}

/** Static assets (served outside the Worker) can trail /healthz by a few seconds at the edge. */
async function runCheck(
  name: string,
  run: () => Promise<void>,
  verifyCommit: (() => Promise<void>) | undefined,
  suiteDeadline: number,
  attempts = 4,
  delayMs = 3_000,
): Promise<void> {
  const checkDeadline = Math.min(suiteDeadline, Date.now() + CHECK_DEADLINE_MS);
  for (let attempt = 1; ; attempt += 1) {
    try {
      if (attempt > 1 && verifyCommit) await verifyCommit();
      await run();
      return;
    } catch (error) {
      if (error instanceof NonRetryableSmokeError || attempt >= attempts || Date.now() + delayMs >= checkDeadline) throw error;
      console.warn(`retry ${name} (${attempt}/${attempts}): ${error instanceof Error ? error.message : String(error)}`);
      await sleep(delayMs);
    }
  }
}

async function main() {
  const options = parse(process.argv.slice(2));
  await waitForBuild(options);
  const suiteDeadline = Date.now() + SMOKE_DEADLINE_MS;
  const allChecks = checks(options);
  const healthRun = allChecks.find(([checkName]) => checkName === 'health')?.[1];
  let failed = 0;
  for (const [name, run] of allChecks) {
    try {
      await runCheck(name, run, name === 'health' ? undefined : healthRun, suiteDeadline);
      console.log(`ok   ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(failed ? `smoke: ${failed} check(s) failed on ${options.base}` : `smoke: all checks passed on ${options.base}`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(`smoke: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
