import { del, get, keys, set } from 'idb-keyval';
import { timeDataRequest } from '../utils/debug/requestTiming';
import { debugLogger } from '../utils/debug/debugLogger';
import { NetworkError, PackMissError } from './errors';
import { isSupabaseConfigured, supabase } from './supabaseClient';

interface StaticJsonOptions {
  persistentKey?: string;
  revalidate?: boolean;
  fallbackToPersistent?: boolean;
  validate?: (data: unknown) => boolean;
}

export interface StaticJsonFetchMetadata<T> {
  data: T;
  source: 'persistent-cache' | 'network';
}

const CACHE_PREFIX = 'rongwaps-content:';
const prunedVersions = new Set<string>();
let persistedContentPurge: Promise<void> | null = null;

async function purgePersistedContentOnce(): Promise<void> {
  if (!canUsePersistentCache()) return;
  persistedContentPurge ??= (async () => {
    const prefix = toCacheKey('');
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

/** All content packs require a school session; keep in sync with server/index.ts. */

/** `fetch` for `/data/...` content; sends the session token for the gated lesson packs (same-origin only). */
export async function fetchContent(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (PROTECTED_CONTENT.test(path)) {
    // A public content CDN would bypass Express's school-account check.
    if (!CONTENT_BASE_URL.startsWith('/') || CONTENT_BASE_URL.startsWith('//')) {
      throw new Error('Protected content must use the authenticated app origin');
    }
    if (isSupabaseConfigured()) {
      const { data } = await supabase.auth.getSession();
      if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
    }
    return fetch(contentUrl(path), { ...init, cache: 'no-store', headers });
  }
  return fetch(contentUrl(path), { ...init, headers });
}

const blobUrls = new Map<string, Promise<string>>();

/** An object URL for a gated image (an `<img>` cannot send the token itself). Cached for the session. */
export function fetchContentBlobUrl(path: string): Promise<string> {
  let url = blobUrls.get(path);
  if (!url) {
    url = fetchContent(path).then(async (response) => {
      if (!response.ok) throw new NetworkError(`${path} returned ${response.status}`, response.status);
      return URL.createObjectURL(await response.blob());
    });
    url.catch(() => blobUrls.delete(path));
    blobUrls.set(path, url);
  }
  return url;
}

function canUsePersistentCache(): boolean {
  return typeof indexedDB !== 'undefined';
}

function toCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

export async function fetchStaticJsonWithMetadata<T>(
  path: string,
  label: string,
  options: StaticJsonOptions = {},
): Promise<StaticJsonFetchMetadata<T>> {
  const protectedContent = PROTECTED_CONTENT.test(path);
  if (protectedContent) await purgePersistedContentOnce();
  // Protected packs stay in memory only; IndexedDB would make them available offline
  // as full reusable JSON files on the user's device.
  const cacheKey = !protectedContent && options.persistentKey ? toCacheKey(options.persistentKey) : null;
  let fallback: T | undefined;
  if (cacheKey && canUsePersistentCache()) {
    try {
      const cached = await get<T>(cacheKey);
      if (cached !== undefined && (!options.validate || options.validate(cached))) {
        if (!options.fallbackToPersistent) return { data: cached, source: 'persistent-cache' };
        fallback = cached;
      }
    } catch (error) {
      // Graceful degradation: IndexedDB blocked; network loading remains available
      debugLogger.warn('Cache', `Persistent cache read failed for "${cacheKey}"`, error);
    }
  }

  if (typeof window === 'undefined') {
    try {
      const fsMod = 'node:fs';
      const pathMod = 'node:path';
      const fs = await import(/* @vite-ignore */ fsMod);
      const nodePath = await import(/* @vite-ignore */ pathMod);
      const diskPath = nodePath.resolve(process.cwd(), 'public', path.replace(/^\//, ''));
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

  let response: Response;
  try {
    response = await timeDataRequest(label, () => fetchContent(path, { cache: protectedContent ? 'no-store' : options.revalidate ? 'no-cache' : 'default' }));
  } catch (error) {
    if (fallback !== undefined) return { data: fallback, source: 'persistent-cache' };
    throw error;
  }
  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    if (fallback !== undefined) return { data: fallback, source: 'persistent-cache' };
    if (response.status === 404) {
      throw new PackMissError(label, `${path} returned 404`);
    }
    throw new NetworkError(`${path} returned ${response.status}`, response.status);
  }
  let data: T;
  try {
    if (!contentType?.includes('application/json')) throw new Error(`${path} did not return JSON`);
    data = await response.json() as T;
    if (options.validate && !options.validate(data)) throw new Error(`${path} failed validation`);
  } catch (error) {
    if (fallback !== undefined) return { data: fallback, source: 'persistent-cache' };
    throw error;
  }

  if (cacheKey && canUsePersistentCache()) {
    try {
      await set(cacheKey, data);
    } catch (error) {
      // Graceful degradation: cache writes are optional and must never block content delivery
      debugLogger.warn('Cache', `Persistent cache write failed for "${cacheKey}"`, error);
    }
  }

  return { data, source: 'network' };
}

export async function fetchStaticJson<T>(
  path: string,
  label: string,
  options: StaticJsonOptions = {},
): Promise<T> {
  return (await fetchStaticJsonWithMetadata<T>(path, label, options)).data;
}

export async function removeStaticJsonCache(key: string): Promise<void> {
  if (!canUsePersistentCache()) return;
  try {
    await del(toCacheKey(key));
  } catch (error) {
    // Graceful degradation: persistent storage unavailable during cache deletion
    debugLogger.warn('Cache', `Persistent cache delete failed for "${key}"`, error);
  }
}

export async function pruneStaticJsonCache(namespace: string, activeVersion: string): Promise<void> {
  if (!canUsePersistentCache()) return;

  const pruneKey = `${namespace}:${activeVersion}`;
  if (prunedVersions.has(pruneKey)) return;
  prunedVersions.add(pruneKey);

  try {
    const namespacePrefix = toCacheKey(`${namespace}:`);
    const activePrefix = toCacheKey(`${namespace}:${activeVersion}:`);
    const staleKeys = (await keys()).filter((key) => (
      typeof key === 'string'
      && key.startsWith(namespacePrefix)
      && !key.startsWith(activePrefix)
    ));
    await Promise.all(staleKeys.map((key) => del(key)));
  } catch (error) {
    // Graceful degradation: cache pruning failure resets tracking set
    debugLogger.warn('Cache', `Persistent cache pruning failed for "${pruneKey}"`, error);
    prunedVersions.delete(pruneKey);
  }
}
