import { debugLogger } from '../../utils/debugLogger';
import { del, get, keys, set } from 'idb-keyval';

export const AUDIO_BUCKET = 'vocabulary-audio';

/** Cap on in-memory decoded buffers and object URLs per map (FIFO/LRU count). */
export const MAX_AUDIO_CACHE = 100;

/**
 * Cap on persistent Cache Storage bytes. Evicted least-recently-used first.
 * 150MB default: large enough for meaningful offline audio, small enough to
 * keep Safari/iOS quota pressure low.
 */
export const MAX_AUDIO_CACHE_BYTES = 150 * 1024 * 1024;

/** IndexedDB meta namespace for the LRU byte index. */
const AUDIO_META_PREFIX = 'rongwaps-audio-meta:';

interface AudioMeta {
  size: number;
  lastAccessed: number;
}

function viteEnv(key: string): string | undefined {
  const env = (
    typeof import.meta !== 'undefined'
      ? (import.meta as { env?: Record<string, unknown> }).env
      : undefined
  );
  const value = env?.[key];
  return typeof value === 'string' ? value : undefined;
}

let audioFileCacheInstance: Cache | null = null;

export async function getAudioFileCache(): Promise<Cache | null> {
  if (audioFileCacheInstance) return audioFileCacheInstance;
  try {
    if (typeof caches !== 'undefined') {
      audioFileCacheInstance = await caches.open('rongwaps-audio-v6');
    }
  } catch (error) {
    // Graceful degradation: CacheStorage unavailable in private mode or non-secure contexts
    debugLogger.warn('Audio', 'CacheStorage open failed, proceeding without persistent audio cache', error);
    audioFileCacheInstance = null;
  }
  return audioFileCacheInstance;
}

function metaKey(fileName: string): string {
  return `${AUDIO_META_PREFIX}${fileName}`;
}

export async function touchAudioMeta(fileName: string, size?: number): Promise<void> {
  const key = metaKey(fileName);
  try {
    const existing = await get<AudioMeta>(key);
    await set(key, { size: size ?? existing?.size ?? 0, lastAccessed: Date.now() });
  } catch (error) {
    // Graceful degradation: IndexedDB may be blocked; the byte cap simply becomes best-effort
    debugLogger.warn('Audio', 'Failed to update audio cache metadata', error);
  }
}

export async function removeAudioMeta(fileName: string): Promise<void> {
  try {
    await del(metaKey(fileName));
  } catch (error) {
    // Graceful degradation: best-effort IndexedDB cleanup
    debugLogger.warn('Audio', 'Failed to remove audio cache metadata', error);
  }
}

/**
 * Enforce the byte cap on the persistent audio cache. Called after a put.
 * Evicts least-recently-accessed entries until the estimated total is under
 * MAX_AUDIO_CACHE_BYTES. All errors are swallowed so caching never blocks
 * playback.
 */
export async function pruneAudioCacheToLimit(): Promise<void> {
  const cache = await getAudioFileCache();
  if (!cache) return;
  try {
    if (typeof indexedDB === 'undefined') return;
    const allKeys = await keys();
    let total = 0;
    const indexed: { fileName: string; size: number; lastAccessed: number }[] = [];
    for (const key of allKeys) {
      if (typeof key !== 'string' || !key.startsWith(AUDIO_META_PREFIX)) continue;
      const meta = await get<AudioMeta>(key);
      if (!meta) continue;
      const fileName = key.slice(AUDIO_META_PREFIX.length);
      indexed.push({ fileName, size: meta.size, lastAccessed: meta.lastAccessed });
      total += meta.size;
    }
    if (total <= MAX_AUDIO_CACHE_BYTES) return;

    indexed.sort((a, b) => a.lastAccessed - b.lastAccessed);
    for (const entry of indexed) {
      if (total <= MAX_AUDIO_CACHE_BYTES) break;
      await cache.delete(audioFileCacheRequest(entry.fileName)).catch(() => {});
      await removeAudioMeta(entry.fileName);
      total -= entry.size;
    }
  } catch (error) {
    // Graceful degradation: cache pruning failed; never fail playback
    debugLogger.warn('Audio', 'Audio cache pruning failed', error);
  }
}

let pruneTimeout: ReturnType<typeof setTimeout> | null = null;
export function schedulePruneAudioCache(): void {
  if (pruneTimeout) return;
  pruneTimeout = setTimeout(() => {
    pruneTimeout = null;
    void pruneAudioCacheToLimit();
  }, 4000);
}

export function resolveRequestUrl(path: string): string {
  if (typeof location !== 'undefined' && location.href) {
    return new URL(path, location.href).href;
  }
  return new URL(path, 'http://localhost').href;
}

export function audioFileCacheRequest(fileName: string): Request {
  return new Request(resolveRequestUrl('/api/audio/' + fileName));
}

export function publicAudioUrl(fileName: string): string | null {
  const customCdn = viteEnv('VITE_AUDIO_BASE_URL');
  if (customCdn && /^https?:\/\//.test(customCdn)) {
    return customCdn.replace(/\/+$/, '') + '/' + fileName;
  }
  const supabaseUrl = viteEnv('VITE_SUPABASE_URL');
  if (supabaseUrl && /^https?:\/\//.test(supabaseUrl) && !supabaseUrl.includes('your_')) {
    return supabaseUrl.replace(/\/+$/, '') + '/storage/v1/object/public/' + AUDIO_BUCKET + '/' + fileName;
  }
  return null;
}

const inFlightBlobFetches = new Map<string, Promise<Blob>>();

export async function fetchAudioBlob(fileName: string): Promise<Blob> {
  const existing = inFlightBlobFetches.get(fileName);
  if (existing) return existing;

  const promise = (async () => {
    const cache = await getAudioFileCache();
    const cacheRequest = audioFileCacheRequest(fileName);

    if (cache) {
      const cached = await cache.match(cacheRequest).catch(() => null);
      if (cached) {
        void touchAudioMeta(fileName);
        return await cached.blob();
      }
    }

    const directUrl = publicAudioUrl(fileName);
    const sources = [
      directUrl,
      '/api/audio/' + fileName,
    ].filter((source): source is string => source !== null);

    let lastError: unknown;
    for (const source of sources) {
      try {
        const response = await fetch(source);
        if (!response.ok) throw new Error('Failed to fetch audio: ' + response.statusText);
        const blob = await response.blob();
        if (cache) {
          cache
            .put(cacheRequest, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }))
            .then(() => touchAudioMeta(fileName, blob.size))
            .then(() => schedulePruneAudioCache())
            .catch(() => {});
        }
        return blob;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Failed to fetch audio: ' + fileName);
  })();

  inFlightBlobFetches.set(fileName, promise);
  try {
    return await promise;
  } finally {
    inFlightBlobFetches.delete(fileName);
  }
}

/**
 * Set/replace a map entry, moving it to the most-recently-used end so the
 * leading keys are the least-recently-used (evicted first). Returns the new
 * value so callers can both set and keep it.
 */
function setLru<T>(map: Map<string, T>, key: string, value: T): T {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  return value;
}

export function cacheObjectUrl(
  objectUrls: Map<string, string>,
  fileName: string,
  objectUrl: string,
): void {
  const oldUrl = objectUrls.get(fileName);
  setLru(objectUrls, fileName, objectUrl);
  if (oldUrl !== undefined && oldUrl !== objectUrl) URL.revokeObjectURL(oldUrl);
  while (objectUrls.size > MAX_AUDIO_CACHE) {
    const oldest = objectUrls.keys().next().value;
    if (oldest === undefined) break;
    URL.revokeObjectURL(objectUrls.get(oldest)!);
    objectUrls.delete(oldest);
  }
}

export async function preloadAudioFiles(
  audioFileNames: (string | undefined)[],
  audioContext: AudioContext | null,
  buffers: Map<string, AudioBuffer>,
  fetchPromises: Map<string, Promise<AudioBuffer>>,
  objectUrls: Map<string, string>,
  blobPromises: Map<string, Promise<string>>,
  getAudioObjectUrl: (fileName: string) => Promise<string>,
): Promise<void> {
  if (typeof window === 'undefined') return;
  const validNames = audioFileNames.filter(Boolean) as string[];
  const queue = [...validNames];

  const processNext = async (): Promise<void> => {
    if (queue.length === 0) return;
    const fileName = queue.shift()!;
    try {
      if (!objectUrls.has(fileName) && !blobPromises.has(fileName)) {
        const promise = getAudioObjectUrl(fileName);
        blobPromises.set(fileName, promise);
        try { await promise; } finally { blobPromises.delete(fileName); }
      }
    } catch (error) {
      debugLogger.warn('Audio', 'Failed to preload audio', { fileName, error });
      blobPromises.delete(fileName);
    }
    await processNext();
  };

  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, () => processNext()));
}
