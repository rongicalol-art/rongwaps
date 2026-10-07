import { del, get, keys, set } from 'idb-keyval';
import { timeDataRequest } from '../utils/requestTiming';
import { debugLogger } from '../utils/debugLogger';
import { NetworkError, PackMissError } from './errors';

interface StaticJsonOptions {
  persistentKey?: string;
  revalidate?: boolean;
}

export interface StaticJsonFetchMetadata<T> {
  data: T;
  source: 'persistent-cache' | 'network';
}

const CACHE_PREFIX = 'rongwaps-content:';
const prunedVersions = new Set<string>();

const CONTENT_BASE_URL = (import.meta.env?.VITE_CONTENT_BASE_URL || '/data').replace(/\/+$/, '');

/**
 * Single owner of where `/data/...` content is served from. Logical paths stay
 * `/data/...` (manifests, cache keys); only the outgoing URL honours
 * `VITE_CONTENT_BASE_URL` (e.g. a CDN origin). Defaults to same-origin `/data`.
 */
export function contentUrl(path: string): string {
  return path.startsWith('/data/') ? `${CONTENT_BASE_URL}${path.slice('/data'.length)}` : path;
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
  const cacheKey = options.persistentKey ? toCacheKey(options.persistentKey) : null;
  if (cacheKey && canUsePersistentCache()) {
    try {
      const cached = await get<T>(cacheKey);
      if (cached !== undefined) return { data: cached, source: 'persistent-cache' };
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
        return { data, source: 'network' };
      }
    } catch {
      // Fall through to standard fetch
    }
  }

  const response = await timeDataRequest(
    label,
    () => fetch(contentUrl(path), { cache: options.revalidate ? 'no-cache' : 'default' }),
  );
  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    if (response.status === 404) {
      throw new PackMissError(label, `${path} returned 404`);
    }
    throw new NetworkError(`${path} returned ${response.status}`, response.status);
  }
  if (!contentType?.includes('application/json')) {
    throw new Error(`${path} did not return JSON`);
  }

  const data = await response.json() as T;

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
