import { debugLogger } from '../../utils/debug/debugLogger';
import { del, get, getMany, set } from 'idb-keyval';

export const AUDIO_BUCKET = 'vocabulary-audio';

/** Caps on retained recording object URLs per map. */
export const MAX_AUDIO_CACHE = 48;
export const MAX_AUDIO_MEMORY_BYTES = 8 * 1024 * 1024;

/**
 * Cap on persistent Cache Storage bytes. Evicted least-recently-used first.
 * 150MB default: large enough for meaningful offline audio, small enough to
 * keep Safari/iOS quota pressure low.
 */
export const MAX_AUDIO_CACHE_BYTES = 150 * 1024 * 1024;

/** IndexedDB meta namespace for the LRU byte index. */
const AUDIO_META_PREFIX = 'rongwaps-audio-meta:';
const IMMUTABLE_AUDIO_FILE = /-[a-f0-9]{12}\.mp3(?:$|[?#])/;

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
let audioFileCacheOpening: Promise<Cache | null> | null = null;

export async function getAudioFileCache(): Promise<Cache | null> {
  if (audioFileCacheInstance) return audioFileCacheInstance;
  if (typeof caches === 'undefined') return null;
  if (audioFileCacheOpening) return audioFileCacheOpening;
  audioFileCacheOpening = Promise.resolve().then(() => caches.open('rongwaps-audio-v7'))
    .then((cache) => { audioFileCacheInstance = cache; return cache; }, (error) => {
      debugLogger.warn('Audio', 'CacheStorage open failed, proceeding without persistent audio cache', error);
      return null;
    }).finally(() => { audioFileCacheOpening = null; });
  return audioFileCacheOpening;
}

function metaKey(fileName: string): string {
  return `${AUDIO_META_PREFIX}${fileName}`;
}

export async function touchAudioMeta(fileName: string, size?: number): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const key = metaKey(fileName);
  try {
    const bytes = size ?? (await get<AudioMeta>(key))?.size ?? 0;
    await set(key, { size: bytes, lastAccessed: Date.now() });
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
    const requests = await cache.keys();
    const names = requests.map((request) => decodeURIComponent(new URL(request.url).pathname.slice('/api/audio/'.length)));
    // Count the actual cache, including legacy entries and writes whose IDB metadata failed.
    const metadata = typeof indexedDB === 'undefined' ? []
      : await getMany<AudioMeta>(names.map(metaKey)).catch(() => []);
    const indexed: Array<{ request: Request; fileName: string; size: number; lastAccessed: number }> = [];
    for (const [i, request] of requests.entries()) {
      // Known entries need no MP3 reads. Previously each batch reread up to
      // 150 MB of recordings even when the cache was below its byte cap.
      let size = metadata[i]?.size;
      if (!Number.isFinite(size) || size <= 0) {
        const response = await cache.match(request);
        size = Number(response?.headers.get('Content-Length')) || (response ? (await response.blob()).size : 0);
        if (typeof indexedDB !== 'undefined') await set(metaKey(names[i]), { size, lastAccessed: metadata[i]?.lastAccessed ?? 0 });
      }
      indexed.push({ request, fileName: names[i], size, lastAccessed: metadata[i]?.lastAccessed ?? 0 });
    }
    let total = indexed.reduce((sum, entry) => sum + entry.size, 0);
    indexed.sort((a, b) => a.lastAccessed - b.lastAccessed);
    for (const entry of indexed) {
      if (total <= MAX_AUDIO_CACHE_BYTES) break;
      if (await cache.delete(entry.request)) {
        total -= entry.size;
        if (typeof indexedDB !== 'undefined') await removeAudioMeta(entry.fileName);
      }
    }
  } catch (error) {
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
  // Use a same-origin synthetic key for Cache Storage. Absolute and signed
  // URLs are encoded as data so their query strings cannot change the key.
  return new Request(resolveRequestUrl('/api/audio/' + encodeURIComponent(fileName)));
}

export function publicAudioUrl(fileName: string): string | null {
  // Card data may contain a complete public URL, including a temporary or
  // signed HTTPS link. Preserve it as-is instead of prefixing the CDN domain.
  if (/^https?:\/\//i.test(fileName)) return fileName;

  const encodedPath = fileName.split('/').map(encodeURIComponent).join('/');
  const customCdn = viteEnv('VITE_AUDIO_BASE_URL');
  if (customCdn && /^https?:\/\//.test(customCdn)) {
    // Quieter R2 copies preserve timing; versioned paths bypass loud CDN copies.
    const prefix = /^(?:B1-\d{2}-[1-3]-[1-3]|modernchinese-B1L\d{2}-\d-\d+|vocabulary-trimmed\/v1\/B1L\d{2}-\d-\d+-[a-f0-9]{12})\.mp3$/.test(fileName)
      ? 'normalized/book1-v1/' : '';
    return customCdn.replace(/\/+$/, '') + '/' + prefix + encodedPath;
  }
  const supabaseUrl = viteEnv('VITE_SUPABASE_URL');
  if (supabaseUrl && /^https?:\/\//.test(supabaseUrl) && !supabaseUrl.includes('your_')) {
    return supabaseUrl.replace(/\/+$/, '') + '/storage/v1/object/public/' + AUDIO_BUCKET + '/' + encodedPath;
  }
  return null;
}

const blobCachedAt = new WeakMap<Blob, number>();
export const audioBlobCachedAt = (blob: Blob): number => blobCachedAt.get(blob) ?? Date.now();

const inFlightBlobFetches = new Map<string, {
  promise: Promise<Blob>; controller: AbortController; users: number; settled: boolean;
}>();

/** Reject error pages and empty files before they can poison either audio cache. */
export function isUsableAudioBlob(blob: Blob): boolean {
  return blob.size > 0 && (!blob.type || /^(audio\/|application\/(octet-stream|ogg)(?:;|$))/i.test(blob.type));
}

/** Cache-only lookup: a miss must keep first playback streaming from the CDN. */
export async function readCachedAudioBlob(fileName: string, allowStale = true): Promise<Blob | null> {
  // Keep a longer disk budget offline; a stalled cache must not hold online audio.
  const cacheWaitMs = typeof navigator !== 'undefined' && navigator.onLine === false ? 1000 : 100;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), cacheWaitMs); });
  const read = (async () => {
    try {
      const cache = await getAudioFileCache();
      const response = await cache?.match(audioFileCacheRequest(fileName));
      if (!response) return null;
      const savedAt = Number(response.headers?.get('X-Audio-Cached-At'));
      if (Number(response.headers?.get('Content-Length')) > MAX_AUDIO_MEMORY_BYTES) return null;
      const immutable = IMMUTABLE_AUDIO_FILE.test(fileName);
      if (!allowStale && !immutable && typeof navigator !== 'undefined' && navigator.onLine === true
        && (!savedAt || Date.now() - savedAt > 86400_000)) return null;
      const blob = await response.blob();
      if (!isUsableAudioBlob(blob)) return null;
      blobCachedAt.set(blob, savedAt);
      void touchAudioMeta(fileName, blob.size);
      return blob;
    } catch { return null; }
  })();
  try { return await Promise.race([read, deadline]); } finally { clearTimeout(timer!); }
}

export async function fetchAudioBlob(fileName: string, signal?: AbortSignal): Promise<Blob> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  let flight = inFlightBlobFetches.get(fileName);
  if (!flight) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const aborted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    const work = (async () => {
      const cached = await readCachedAudioBlob(fileName, false);
      if (cached) return cached;
      controller.signal.throwIfAborted();
      const directUrl = publicAudioUrl(fileName);
      if (!directUrl) throw new Error('No public audio URL configured');
      // A streaming response in the HTTP cache may lack CORS headers.
      const response = await fetch(directUrl, { signal: controller.signal, cache: 'reload' });
      if (!response.ok || response.status === 206) throw new Error(`Failed to fetch complete audio: ${response.status}`);
      if (Number(response.headers.get('Content-Length')) > MAX_AUDIO_MEMORY_BYTES) throw new Error('Recording exceeds download limit');
      const blob = await response.blob();
      if (!isUsableAudioBlob(blob) || blob.size > MAX_AUDIO_MEMORY_BYTES) throw new Error('Invalid audio response');
      blobCachedAt.set(blob, Date.now());
      void getAudioFileCache().then((cache) => {
        if (!cache) return;
        return cache.put(audioFileCacheRequest(fileName), new Response(blob, { headers: {
          'Content-Type': blob.type || 'audio/mpeg', 'Content-Length': String(blob.size), 'X-Audio-Cached-At': String(Date.now()),
        } })).then(() => touchAudioMeta(fileName, blob.size)).then(schedulePruneAudioCache);
      }).catch(() => {});
      return blob;
    })();
    const promise = Promise.race([work, aborted]);
    flight = { promise, controller, users: 0, settled: false };
    const created = flight;
    inFlightBlobFetches.set(fileName, created);
    const done = () => {
      clearTimeout(timeout);
      created.settled = true;
      if (inFlightBlobFetches.get(fileName) === created) inFlightBlobFetches.delete(fileName);
    };
    void promise.then(done, done);
  }
  const shared = flight;
  shared.users++;
  // Each caller owns its cancellation; cancel the transport only when nobody still needs it.
  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const release = () => {
      if (settled) return false;
      settled = true;
      signal?.removeEventListener('abort', abort);
      shared.users--;
      if (!shared.users && !shared.settled) {
        if (inFlightBlobFetches.get(fileName) === shared) inFlightBlobFetches.delete(fileName);
        shared.controller.abort();
      }
      return true;
    };
    const abort = () => { if (release()) reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    shared.promise.then((blob) => { if (release()) resolve(blob); }, (error) => { if (release()) reject(error); });
    if (signal?.aborted) abort();
  });
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

const objectUrlSizes = new WeakMap<Map<string, string>, Map<string, { size: number; createdAt: number }>>();

export function getCachedObjectUrl(objectUrls: Map<string, string>, fileName: string): string | undefined {
  const url = objectUrls.get(fileName);
  const metadata = objectUrlSizes.get(objectUrls);
  const entry = metadata?.get(fileName);
  if (url && entry && !IMMUTABLE_AUDIO_FILE.test(fileName) && typeof navigator !== 'undefined'
    && navigator.onLine === true && Date.now() - entry.createdAt > 86400_000) {
    URL.revokeObjectURL(url);
    objectUrls.delete(fileName);
    metadata?.delete(fileName);
    return undefined;
  }
  return url;
}

export function cacheObjectUrl(
  objectUrls: Map<string, string>,
  fileName: string,
  objectUrl: string,
  size?: number,
  cachedAt = Date.now(),
): void {
  const sizes = objectUrlSizes.get(objectUrls) || new Map<string, { size: number; createdAt: number }>();
  objectUrlSizes.set(objectUrls, sizes);
  const oldUrl = objectUrls.get(fileName);
  const previous = sizes.get(fileName);
  sizes.set(fileName, { size: size ?? previous?.size ?? 0, createdAt: oldUrl === objectUrl ? previous?.createdAt ?? cachedAt : cachedAt });
  setLru(objectUrls, fileName, objectUrl);
  if (oldUrl !== undefined && oldUrl !== objectUrl) URL.revokeObjectURL(oldUrl);
  let total = [...sizes.values()].reduce((sum, entry) => sum + entry.size, 0);
  while (objectUrls.size > MAX_AUDIO_CACHE || (total > MAX_AUDIO_MEMORY_BYTES && objectUrls.size > 1)) {
    const oldest = objectUrls.keys().next().value;
    if (oldest === undefined) break;
    URL.revokeObjectURL(objectUrls.get(oldest)!);
    objectUrls.delete(oldest);
    total -= sizes.get(oldest)?.size || 0;
    sizes.delete(oldest);
  }
}

export interface AudioPreloadProgress { ready: number; failed: number; total: number; blocked?: boolean; bytes?: number }

export async function preloadAudioFiles(
  audioFileNames: (string | undefined)[],
  objectUrls: Map<string, string>,
  getAudioObjectUrl: (fileName: string) => Promise<string>,
  signal?: AbortSignal,
  onProgress?: (progress: AudioPreloadProgress) => void,
): Promise<void> {
  if (typeof window === 'undefined') return;
  const validNames = [...new Set(audioFileNames.filter((name) => name && /\.(mp3|wav|ogg|m4a)(?:$|[?#])|^https?:\/\//i.test(name)))] as string[];
  const queue = [...validNames];
  const progress: AudioPreloadProgress = { ready: 0, failed: 0, total: queue.length, bytes: 0 };
  onProgress?.({ ...progress });

  const processNext = async (): Promise<void> => {
    while (queue.length > 0 && !signal?.aborted) {
      const fileName = queue.shift()!;
      try {
        if (!getCachedObjectUrl(objectUrls, fileName)) await getAudioObjectUrl(fileName);
        if (!signal?.aborted) {
          progress.ready++;
          progress.bytes! += objectUrlSizes.get(objectUrls)?.get(fileName)?.size ?? 0;
        }
      } catch (error) {
        if (!signal?.aborted) { progress.failed++; debugLogger.warn('Audio', 'Failed to preload audio', { fileName: fileName.split('?')[0], error }); }
        // fetch TypeError means transport/CORS failure, not a missing recording.
        if (!signal?.aborted && (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError'))) { progress.blocked = true; queue.length = 0; }
      }
      if (!signal?.aborted) onProgress?.({ ...progress });
    }
  };

  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, processNext));
}
