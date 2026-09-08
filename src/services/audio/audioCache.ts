export const AUDIO_BUCKET = 'vocabulary-audio';
export const MAX_AUDIO_CACHE = 100;

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
  } catch {
    audioFileCacheInstance = null;
  }
  return audioFileCacheInstance;
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
  const supabaseUrl = viteEnv('VITE_SUPABASE_URL');
  if (supabaseUrl && /^https?:\/\//.test(supabaseUrl) && !supabaseUrl.includes('your_')) {
    return supabaseUrl.replace(/\/+$/, '') + '/storage/v1/object/public/' + AUDIO_BUCKET + '/' + fileName;
  }
  return null;
}

export async function fetchAudioBlob(fileName: string): Promise<Blob> {
  const cache = await getAudioFileCache();
  const cacheRequest = audioFileCacheRequest(fileName);

  if (cache) {
    const cached = await cache.match(cacheRequest).catch(() => null);
    if (cached) return await cached.blob();
  }

  const sources = [
    publicAudioUrl(fileName),
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
}

export function cacheBuffer(
  buffers: Map<string, AudioBuffer>,
  fileName: string,
  audioBuffer: AudioBuffer,
): void {
  buffers.set(fileName, audioBuffer);
  while (buffers.size > MAX_AUDIO_CACHE) {
    const oldest = buffers.keys().next().value;
    if (oldest === undefined) break;
    buffers.delete(oldest);
  }
}

export function cacheObjectUrl(
  objectUrls: Map<string, string>,
  fileName: string,
  objectUrl: string,
): void {
  objectUrls.set(fileName, objectUrl);
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
      if (audioContext) {
        if (!buffers.has(fileName) && !fetchPromises.has(fileName)) {
          const promise = (async () => {
            const blob = await fetchAudioBlob(fileName);
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            cacheBuffer(buffers, fileName, audioBuffer);
            return audioBuffer;
          })();
          fetchPromises.set(fileName, promise);
          try { await promise; } finally { fetchPromises.delete(fileName); }
        }
        await getAudioObjectUrl(fileName).catch(() => {});
      } else {
        if (!objectUrls.has(fileName) && !blobPromises.has(fileName)) {
          const promise = getAudioObjectUrl(fileName);
          blobPromises.set(fileName, promise);
          try { await promise; } finally { blobPromises.delete(fileName); }
        }
      }
    } catch (error) {
      console.warn('Failed to preload audio', fileName, error);
      if (audioContext) fetchPromises.delete(fileName);
      else blobPromises.delete(fileName);
    }
    await processNext();
  };

  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, () => processNext()));
}
