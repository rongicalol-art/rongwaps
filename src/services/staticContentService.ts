import { del, keys } from 'idb-keyval';
import { timeDataRequest } from '../utils/debug/requestTiming';
import { debugLogger } from '../utils/debug/debugLogger';
import { NetworkError, PackMissError } from './errors';
import { isSupabaseConfigured, supabase } from './supabaseClient';

interface StaticJsonOptions {
  revalidate?: boolean;
  /** With `revalidate`: only the server's answer will do (e.g. a deploy removed a listed file). */
  serverOnly?: boolean;
  /** Skip the browser's saved copy of this file and replace it (the saved copy failed validation). */
  reload?: boolean;
  validate?: (data: unknown) => boolean;
}

export interface StaticJsonFetchMetadata<T> {
  data: T;
  source: 'network';
}

const CACHE_PREFIX = 'rongwaps-content:';
let persistedContentPurge: Promise<void> | null = null;

async function purgePersistedContentOnce(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  persistedContentPurge ??= (async () => {
    const prefix = CACHE_PREFIX;
    const storedKeys = await keys();
    await Promise.all(storedKeys
      .filter((key): key is string => typeof key === 'string' && key.startsWith(prefix))
      .map((key) => del(key)));
  })().catch((error) => {
    persistedContentPurge = null;
    debugLogger.warn('Cache', 'Could not remove previously cached content packs', error);
  });
  await persistedContentPurge;
}

const CONTENT_BASE_URL = (import.meta.env?.VITE_CONTENT_BASE_URL || '/data').replace(/\/+$/, '');
const PROTECTED_CONTENT = /^\/data\//;

/**
 * Single owner of where `/data/...` content is served from. Logical paths stay
 * `/data/...` (manifests, cache keys); only the outgoing URL honours
 * `VITE_CONTENT_BASE_URL` (e.g. a CDN origin). Defaults to same-origin `/data`.
 */
export function contentUrl(path: string): string {
  return path.startsWith('/data/') ? `${CONTENT_BASE_URL}${path.slice('/data'.length)}` : path;
}

/** All content packs require a school session; keep in sync with server/content.ts. */

/** Longest wait for one content file on a slow connection before the request counts as failed. */
const SERVER_WAKE_MS = 75_000;
/** The browser's saved copy of a file answers within this; slower means nothing is saved and the request went to the server. */
const SAVED_COPY_READ_MS = 1_000;
/** A check for a newer version slower than this (a sleeping server) leaves the saved copy in use. */
const FRESH_CHECK_MS = 4_000;

/**
 * A copy the server sent this recently needs no second check: with nothing saved, the read itself went to
 * the server. Short, so a late reply from another tab during a deploy is trusted for seconds at most.
 */
const RECENT_COPY_MS = 10_000;

function isRecent(response: Response): boolean {
  const age = Date.now() - Date.parse(response.headers.get('date') ?? '');
  return Math.abs(age) < RECENT_COPY_MS;
}

/** Resolves with the promise's value, or null if it takes longer than `ms`. */
function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

/** The whole body, so a reply that stalls after its headers counts as slow. */
async function readFully(response: Response): Promise<Response> {
  return new Response(await response.text(), { status: response.status, headers: response.headers });
}

/** Saved copies of gated files are only for a signed-in learner; without a session the server decides. */
async function maySaveGatedCopy(path: string): Promise<boolean> {
  if (!PROTECTED_CONTENT.test(path) || !isSupabaseConfigured()) return true;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

/**
 * Gets a file that may have changed since the last visit. The browser's saved copy is read first
 * (once a server check starts, the browser holds that copy until the check ends), then the server is
 * asked for a newer version. If the server is slow (asleep), the saved copy is used and the server's
 * answer refreshes it for next time. With nothing saved, the request simply waits for the server.
 */
async function revalidateOrSavedCopy(path: string, signal: AbortSignal): Promise<Response> {
  if (!(await maySaveGatedCopy(path))) return fetchContent(path, { cache: 'no-cache', signal });
  const firstRequest = fetchContent(path, { cache: 'force-cache', signal });
  const quick = await within(firstRequest, SAVED_COPY_READ_MS).catch(() => undefined);
  if (quick === null) return firstRequest;
  if (!quick?.ok) return fetchContent(path, { cache: 'no-cache', signal });
  const saved = await readFully(quick);
  if (isRecent(saved)) return saved;
  const fresh = fetchContent(path, { cache: 'no-cache', signal }).then(readFully);
  const answered = await within(fresh, FRESH_CHECK_MS).catch(() => null);
  // A server error (e.g. while it restarts) is no reason to drop a good saved copy.
  if (answered && answered.status < 500) return answered;
  // The reply still lands in the browser cache when the server wakes.
  fresh.catch(() => {});
  return saved;
}

/**
 * `fetchContent`, falling back to the browser's saved copy when the network cannot be reached. Files without a
 * version in their address must be checked with the server, so offline a plain request fails even though the
 * browser still holds the file; this is what lets the dictionary work offline after one online use.
 */
export async function fetchContentOrSavedCopy(path: string, init: RequestInit = {}): Promise<Response> {
  if (globalThis.navigator?.onLine === false) return fetchContent(path, { ...init, cache: 'force-cache' });
  try {
    return await fetchContent(path, init);
  } catch (error) {
    if (init.signal?.aborted || !(error instanceof TypeError)) throw error;
    return fetchContent(path, { ...init, cache: 'force-cache' });
  }
}

/** `fetch` for `/data/...` content; sends the session token for the gated lesson packs (same-origin only). */
export async function fetchContent(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (PROTECTED_CONTENT.test(path)) {
    // A public content CDN would bypass the server's school-account check.
    if (!CONTENT_BASE_URL.startsWith('/') || CONTENT_BASE_URL.startsWith('//')) {
      throw new Error('Protected content must use the authenticated app origin');
    }
    if (isSupabaseConfigured()) {
      const { data } = await supabase.auth.getSession();
      if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
    }
    // Packs use the browser's private HTTP cache (the server sets the policy).
    const request = () => fetch(contentUrl(path), { ...init, headers });
    const response = await request();
    if (response.status !== 429 || init.signal?.aborted) return response;
    // One quiet retry after the server's suggested wait (capped) before surfacing an error.
    const waitMs = Math.min(Number(response.headers.get('Retry-After')) * 1000 || 1500, 5000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return init.signal?.aborted ? response : request();
  }
  return fetch(contentUrl(path), { ...init, headers });
}

interface ContentImageEntry { promise: Promise<string>; url?: string; users: number; controller: AbortController }
const blobUrls = new Map<string, ContentImageEntry>();
const MAX_CONTENT_IMAGES = 12;

function pruneContentImages(): void {
  for (const [path, entry] of blobUrls) {
    if (blobUrls.size <= MAX_CONTENT_IMAGES) break;
    if (entry.users) continue;
    if (entry.url) URL.revokeObjectURL(entry.url);
    else entry.controller.abort();
    blobUrls.delete(path);
  }
}

/** Gated image LRU. A mounted image's signal pins its URL until its effect cleans up. */
export function fetchContentBlobUrl(path: string, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  let entry = blobUrls.get(path);
  if (entry?.controller.signal.aborted && !entry.url) { blobUrls.delete(path); entry = undefined; }
  if (!entry) {
    const created: ContentImageEntry = { promise: Promise.resolve(''), users: 0, controller: new AbortController() };
    const deadline = setTimeout(() => created.controller.abort(), SERVER_WAKE_MS);
    created.promise = fetchContent(path, { signal: created.controller.signal }).then(async (response) => {
      if (!response.ok) throw new NetworkError(`${path} returned ${response.status}`, response.status);
      created.url = URL.createObjectURL(await response.blob());
      pruneContentImages();
      return created.url;
    }).finally(() => clearTimeout(deadline));
    created.promise.catch(() => { if (blobUrls.get(path) === created) blobUrls.delete(path); });
    entry = created;
  }
  blobUrls.delete(path);
  blobUrls.set(path, entry);
  if (signal) {
    const held = entry;
    held.users++;
    signal.addEventListener('abort', () => {
      held.users--;
      if (!held.users && !held.url) held.controller.abort();
      pruneContentImages();
    }, { once: true });
  }
  return entry.promise;
}


export async function fetchStaticJsonWithMetadata<T>(
  path: string,
  label: string,
  options: StaticJsonOptions = {},
): Promise<StaticJsonFetchMetadata<T>> {
  // Packs live in memory and in the browser's own saved copies. Older versions also kept them in IndexedDB:
  // remove those once.
  if (PROTECTED_CONTENT.test(path)) await purgePersistedContentOnce();

  if (typeof window === 'undefined') {
    try {
      const fsMod = 'node:fs';
      const pathMod = 'node:path';
      const fs = await import(/* @vite-ignore */ fsMod);
      const nodePath = await import(/* @vite-ignore */ pathMod);
      const diskPath = nodePath.resolve(process.cwd(), 'public', path.replace(/^\//, '').replace(/\?.*$/, ''));
      if (fs.existsSync(diskPath)) {
        const text = fs.readFileSync(diskPath, 'utf8');
        const data = JSON.parse(text) as T;
        if (options.validate && !options.validate(data)) throw new Error(`${path} failed validation`);
        return { data, source: 'network' };
      }
    } catch {
      // Fall through to standard fetch
    }
  }

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), SERVER_WAKE_MS);
  try {
  const response = await timeDataRequest(label, () => {
    const { signal } = controller;
    if (options.reload) return fetchContent(path, { cache: 'reload', signal });
    if (!options.revalidate) return fetchContent(path, { cache: 'default', signal });
    return options.serverOnly ? fetchContent(path, { cache: 'no-cache', signal }) : revalidateOrSavedCopy(path, signal);
  });
  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    if (response.status === 404) {
      throw new PackMissError(label, `${path} returned 404`);
    }
    throw new NetworkError(`${path} returned ${response.status}`, response.status);
  }
  if (!contentType?.includes('application/json')) throw new Error(`${path} did not return JSON`);
  const data = await response.json() as T;
  if (options.validate && !options.validate(data)) throw new Error(`${path} failed validation`);
  return { data, source: 'network' };
  } finally { clearTimeout(deadline); }
}

export async function fetchStaticJson<T>(
  path: string,
  label: string,
  options: StaticJsonOptions = {},
): Promise<T> {
  return (await fetchStaticJsonWithMetadata<T>(path, label, options)).data;
}
