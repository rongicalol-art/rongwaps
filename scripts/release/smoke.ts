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

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(90_000), ...init, headers: { 'User-Agent': 'rongwaps-release-smoke', ...init.headers } });
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
      const body = await response.json() as { ok: boolean; env?: string };
      expect(body.ok === true, 'ok is not true');
      expect(!body.env || body.env === options.env, `reports env ${body.env}`);
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
      for (const path of ['/privacy', '/terms', '/about']) {
        const response = await get(url(path));
        expect(response.status === 200 && (response.headers.get('content-type') ?? '').includes('text/html'), `${path}: ${response.status}`);
      }
    }],
    ['lesson content needs sign-in', async () => {
      for (const path of ['/data/vocabulary/book-1.json', '/data/dictionary/manifest.json', '/%64ata/grammar/book-1.json', '//data/grammar/book-1.json']) {
        const response = await get(url(path));
        expect(response.status === 401, `${path}: ${response.status} (expected 401)`);
      }
      // Other spellings may be refused or simply not exist; they must never hand over a file.
      for (const path of ['/data/vocabulary/book-1.json.br', '/assets/..%2fdata/vocabulary/book-1.json', '/assets/..%5Cdata/vocabulary/book-1.json', '/fonts/%2e%2e%2fdata%2fvocabulary%2fbook-1.json']) {
        const response = await get(url(path));
        expect(response.status === 401 || response.status === 404, `${path}: ${response.status} (expected 401 or 404)`);
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

async function main() {
  const options = parse(process.argv.slice(2));
  await waitForBuild(options);
  let failed = 0;
  for (const [name, run] of checks(options)) {
    try {
      await run();
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
