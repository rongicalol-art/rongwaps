import { del, get, keys, set } from 'idb-keyval';
import { timeDataRequest } from '../utils/requestTiming';

interface StaticJsonOptions {
  persistentKey?: string;
  revalidate?: boolean;
}

const CACHE_PREFIX = 'rongwaps-content:';
const prunedVersions = new Set<string>();

function canUsePersistentCache(): boolean {
  return typeof indexedDB !== 'undefined';
}

function toCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

export async function fetchStaticJson<T>(
  path: string,
  label: string,
  options: StaticJsonOptions = {},
): Promise<T> {
  const cacheKey = options.persistentKey ? toCacheKey(options.persistentKey) : null;
  if (cacheKey && canUsePersistentCache()) {
    try {
      const cached = await get<T>(cacheKey);
      if (cached !== undefined) return cached;
    } catch {
      // A browser may block IndexedDB; network loading remains available.
    }
  }

  const response = await timeDataRequest(
    label,
    () => fetch(path, { cache: options.revalidate ? 'no-cache' : 'default' }),
  );
  const contentType = response.headers.get('content-type');

  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  if (!contentType?.includes('application/json')) {
    throw new Error(`${path} did not return JSON`);
  }

  const data = await response.json() as T;

  if (cacheKey && canUsePersistentCache()) {
    try {
      await set(cacheKey, data);
    } catch {
      // Cache writes are optional and must never block content delivery.
    }
  }

  return data;
}

export async function removeStaticJsonCache(key: string): Promise<void> {
  if (!canUsePersistentCache()) return;
  try {
    await del(toCacheKey(key));
  } catch {
    // Ignore browsers where persistent storage is unavailable.
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
  } catch {
    prunedVersions.delete(pruneKey);
  }
}
