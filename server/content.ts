import type { Context } from './env';
import { requireUser } from './auth';
import { json } from './respond';

/**
 * Files of the built site that pass through the server: the lesson content under /data (school accounts only)
 * and anything Cloudflare did not serve on its own (server/wrangler.jsonc lists what it serves directly).
 */

/** Lesson content. Keep in sync with PROTECTED_CONTENT in src/services/staticContentService.ts. */
const GATED = '/data/';
// Content-hashed build outputs, e.g. study/1001001-8989b311b07f.json, pronunciation-audio/1d770a43c180f6f8.json.
const HASHED_FILE = /[-/][a-f0-9]{12,16}\.json$/;
/** Checked with the server on every visit, so a release reaches browsers that are already open. */
export const REVALIDATED_FILES = new Set(['index.html', 'sw.js', 'registerSW.js', 'manifest.json', 'manifest.webmanifest', 'asset-manifest.json']);
/** Screens of the app, and public pages prerendered at build time (scripts/build/prerender.ts). */
const KNOWN_ROUTES = new Set(['', 'path', 'search', 'library', 'profile', 'join', 'about', 'sources', 'privacy', 'terms']);

/**
 * The one spelling of a request path: decoded, backslashes as slashes, no empty or dot segments. Encoded
 * folder names and doubled slashes must meet the same gate as the plain path. Null when it cannot be decoded.
 */
export function canonicalPath(pathname: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0')) return null;
  const segments: string[] = [];
  for (const segment of decoded.replace(/\\/g, '/').split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') segments.pop(); else segments.push(segment);
  }
  return `/${segments.join('/')}`;
}

export const isGated = (path: string) => path === GATED.slice(0, -1) || path.startsWith(GATED);

function acceptsBrotli(request: Request): boolean {
  // Cloudflare rewrites Accept-Encoding before the server sees it; `cf` keeps what the browser sent.
  const sent = (request as Request & { cf?: { clientAcceptEncoding?: string } }).cf?.clientAcceptEncoding
    ?? request.headers.get('accept-encoding') ?? '';
  return /(^|[\s,])br(\s*;\s*q=(1|0\.[1-9]))?\s*(,|$)/i.test(sent);
}

function assetRequest(request: Request, path: string, search = ''): Request {
  const headers = new Headers();
  for (const name of ['if-none-match', 'if-modified-since', 'range']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Request(new URL(encodeURI(path) + search, request.url), { method: request.method, headers });
}

function withHeaders(response: Response, headers: Record<string, string>, init: { status?: number; manualEncoding?: boolean } = {}): Response {
  const merged = new Headers(response.headers);
  for (const [name, value] of Object.entries(headers)) merged.set(name, value);
  // `encodeBody: manual` tells Cloudflare the bytes are already compressed (the build's .br files).
  return new Response(response.body, { status: init.status ?? response.status, headers: merged,
    ...(init.manualEncoding ? { encodeBody: 'manual' } : {}) } as ResponseInit);
}

const notFound = () => json({ error: 'Not found' }, 404);

async function serveGated(context: Context, request: Request, path: string, url: URL): Promise<Response> {
  const user = await requireUser(context, request, 'content');
  if (user instanceof Response) return user;
  const assets = context.env.ASSETS!;
  // Browser-only cache (`private`: never a shared cache). Hashed names never change; the rest revalidate
  // (a cheap 304). No Vary: Authorization, or every hourly token refresh would empty the browser cache.
  const immutable = HASHED_FILE.test(path) || /^[a-f0-9]{12,64}$/.test(url.searchParams.get('v') ?? '');
  const cache = { 'Cache-Control': immutable ? 'private, max-age=31536000, immutable' : 'private, no-cache' };
  // The build compresses every JSON pack at the highest level; send that file as it is.
  if (path.endsWith('.json') && !request.headers.has('range') && acceptsBrotli(request)) {
    const packed = await assets.fetch(assetRequest(request, `${path}.br`));
    if (packed.status === 200 || packed.status === 304) {
      return withHeaders(packed, { ...cache, 'Content-Type': 'application/json', 'Content-Encoding': 'br', Vary: 'Accept-Encoding' }, { manualEncoding: packed.status === 200 });
    }
  }
  const response = await assets.fetch(assetRequest(request, path));
  if (response.status === 404) return notFound();
  if (response.status >= 300 && response.status !== 304) return notFound(); // No redirects inside lesson content.
  return withHeaders(response, { ...cache, ...(path.endsWith('.json') ? { Vary: 'Accept-Encoding' } : {}) });
}

/** A file of the built site, or the app shell for a screen's address. */
export async function serveSite(context: Context, request: Request, url: URL): Promise<Response> {
  const path = canonicalPath(url.pathname);
  if (path === null) return json({ error: 'Bad request' }, 400);
  if (!context.env.ASSETS || (request.method !== 'GET' && request.method !== 'HEAD')) return notFound();
  if (isGated(path)) return serveGated(context, request, path, url);
  // The compressed copies exist for the gate above only.
  if (path.endsWith('.br')) return notFound();

  const assets = context.env.ASSETS;
  const response = await assets.fetch(assetRequest(request, path, url.search));
  if (response.status !== 404) {
    const name = path.slice(path.lastIndexOf('/') + 1);
    return withHeaders(response, path.startsWith('/assets/') ? { 'Cache-Control': 'public, max-age=31536000, immutable' }
      : REVALIDATED_FILES.has(name) || !name.includes('.') ? { 'Cache-Control': 'no-cache' } : {});
  }
  // Only extensionless navigation gets the app shell; missing files 404.
  if (/\.[^/]+$/.test(path)) return notFound();
  const shell = await assets.fetch(assetRequest(request, '/'));
  if (shell.status !== 200 && shell.status !== 304) return notFound();
  // Unknown paths still get the shell (it shows the landing or app) but answer 404 so search engines drop them.
  const known = KNOWN_ROUTES.has(path.split('/')[1] ?? '');
  return withHeaders(shell, { 'Cache-Control': 'no-cache', ...(known ? {} : { 'X-Robots-Tag': 'noindex' }) }, known ? {} : { status: shell.status === 304 ? 304 : 404 });
}
