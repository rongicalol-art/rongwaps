import { debugLogger } from '../../utils/debug/debugLogger';
import { authService } from '../authService';
import { isUsableAudioBlob, resolveRequestUrl, MAX_AUDIO_CACHE, MAX_AUDIO_MEMORY_BYTES } from './audioCache';
import { playHtmlAudio, silenceAudio } from './playbackEngine';

let speechVoicesCache: SpeechSynthesisVoice[] | null = null;
let speechVoicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let neuralCacheInstance: Cache | null = null;

const neuralFetches: Map<string, Promise<Blob | null>> = new Map();
const neuralMemory = new Map<string, { blob: Blob; url: string }>();
const neuralUrls = new WeakMap<Blob, string>();
let neuralRetryAfter = 0;
const blobCleanups = new WeakMap<HTMLAudioElement, () => void>();
const speechCleanups = new WeakMap<SpeechSynthesisUtterance, () => void>();

/** Retain compressed clips and stable URLs for replay, within the recording memory budget. */
function rememberNeuralBlob(key: string, blob: Blob): void {
  if (blob.size > MAX_AUDIO_MEMORY_BYTES || neuralMemory.get(key)?.blob === blob) return;
  const previous = neuralMemory.get(key);
  if (previous) {
    URL.revokeObjectURL(previous.url);
    neuralUrls.delete(previous.blob);
    neuralMemory.delete(key);
  }
  const url = URL.createObjectURL(blob);
  neuralUrls.set(blob, url);
  neuralMemory.set(key, { blob, url });
  let bytes = [...neuralMemory.values()].reduce((sum, entry) => sum + entry.blob.size, 0);
  while (neuralMemory.size > MAX_AUDIO_CACHE || bytes > MAX_AUDIO_MEMORY_BYTES) {
    const oldest = neuralMemory.entries().next().value;
    if (!oldest) break;
    const [oldKey, entry] = oldest;
    URL.revokeObjectURL(entry.url);
    neuralUrls.delete(entry.blob);
    neuralMemory.delete(oldKey);
    bytes -= entry.blob.size;
  }
}

export function releaseSpeechUtterance(utterance: SpeechSynthesisUtterance): void {
  speechCleanups.get(utterance)?.();
}

/** Release interrupted neural clips as well as clips that finish normally. */
export function releaseBlobAudio(audio: HTMLAudioElement): void {
  blobCleanups.get(audio)?.();
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = typeof window !== 'undefined' && window.setTimeout
      ? window.setTimeout.bind(window)
      : setTimeout;
    timer(resolve, ms);
  });
}

export function ensureSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (speechVoicesCache && speechVoicesCache.length > 0) {
    return Promise.resolve(speechVoicesCache);
  }
  if (speechVoicesPromise) return speechVoicesPromise;

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  const synth = window.speechSynthesis;
  const immediate = synth.getVoices();
  if (immediate.length > 0) {
    speechVoicesCache = immediate;
    return Promise.resolve(immediate);
  }

  const promise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      try {
        synth.removeEventListener('voiceschanged', done);
      } catch (err) {
        // Graceful degradation: not a standard EventTarget on some browser speech synthesis engines
        debugLogger.warn('Audio', 'removeEventListener failed on speechSynthesis', err);
      }
      speechVoicesCache = synth.getVoices();
      resolve(speechVoicesCache);
    };
    try {
      synth.addEventListener('voiceschanged', done);
    } catch (err) {
      // Graceful degradation: addEventListener not supported; proceed immediately
      debugLogger.warn('Audio', 'addEventListener failed on speechSynthesis', err);
      done();
      return;
    }
    void wait(1200).then(done);
  });
  speechVoicesPromise = promise;
  return promise.finally(() => {
    if (speechVoicesPromise === promise) speechVoicesPromise = null;
  });
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  language: string,
  preferAnyChineseVoice: boolean,
): SpeechSynthesisVoice | null {
  const exactLang = language.toLowerCase();
  const baseLang = exactLang.split('-')[0];
  const ranked = voices
    .map((voice, index) => {
      const lang = voice.lang.toLowerCase();
      let score = 0;
      if (lang === exactLang) score += 100;
      else if (lang.startsWith(baseLang)) score += 50;
      else if (preferAnyChineseVoice && baseLang === 'zh' && lang.startsWith('zh')) score += 50;
      if (score === 0) return { voice, index, score };

      const name = voice.name.toLowerCase();
      if (name.includes('neural')) score += 20;
      if (name.includes('enhanced')) score += 10;
      if (name.includes('premium')) score += 10;
      if (name.includes('natural')) score += 10;
      if (voice.localService) score += 5;
      return { voice, index, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked[0]?.voice ?? null;
}

export function kickstartSpeech(): void {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMacChrome = ua.includes('Macintosh')
      && ua.includes('Chrome')
      && !ua.includes('Edg/')
      && !ua.includes('OPR/');
    if (!isMacChrome || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  } catch (err) {
    // Graceful degradation: best-effort speech synthesis kickstart on Chromium
    debugLogger.warn('Audio', 'kickstartSpeech failed', err);
  }
}

export async function getNeuralCache(): Promise<Cache | null> {
  if (neuralCacheInstance) return neuralCacheInstance;
  try {
    if (typeof caches !== 'undefined') {
      neuralCacheInstance = await caches.open('rongwaps-tts-v1');
      void pruneNeuralCache(neuralCacheInstance).catch(() => {});
    }
  } catch (err) {
    // Graceful degradation: caches unavailable in private browsing mode
    debugLogger.warn('Audio', 'CacheStorage open failed for TTS cache', err);
    neuralCacheInstance = null;
  }
  return neuralCacheInstance;
}

export function ttsCacheRequest(text: string, voice: string | undefined): Request {
  const voiceName = voice || 'zh-CN-XiaoxiaoNeural';
  return new Request(
    resolveRequestUrl(`/api/tts-cache/${encodeURIComponent(text)}?voice=${encodeURIComponent(voiceName)}`),
    { method: 'GET' },
  );
}

export function putNeuralCache(cacheRequest: Request, blob: Blob): void {
  void getNeuralCache()
    .then(async (cache) => {
      if (!cache || !isUsableAudioBlob(blob) || blob.size > 25 * 1024 * 1024) return;
      await cache.put(cacheRequest, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(blob.size) } }));
      await pruneNeuralCache(cache);
    })
    .catch(() => {});
}

/** FIFO bounds; old cache entries without size headers are measured once. */
export async function pruneNeuralCache(cache: Cache): Promise<void> {
  const requests = await cache.keys();
  const sizes: number[] = [];
  for (const request of requests) {
    const response = await cache.match(request);
    sizes.push(Number(response?.headers.get('Content-Length')) || (response ? (await response.blob()).size : 0));
  }
  let total = sizes.reduce((sum, size) => sum + size, 0);
  for (let i = 0; i < requests.length && (requests.length - i > 100 || total > 25 * 1024 * 1024); i++) {
    await cache.delete(requests[i]);
    total -= sizes[i];
  }
}

export async function fetchTtsCacheEndpoint(text: string, voice: string | undefined, signal?: AbortSignal): Promise<Blob | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const voiceName = voice || 'zh-CN-XiaoxiaoNeural';
    const response = await fetch(
      resolveRequestUrl(`/api/tts-cache/${encodeURIComponent(text)}?voice=${encodeURIComponent(voiceName)}`),
      { signal: signal ?? controller.signal },
    );
    if ([429, 502, 503].includes(response.status)) neuralRetryAfter = Date.now() + 30_000;
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!isUsableAudioBlob(blob)) return null;
    putNeuralCache(ttsCacheRequest(text, voice), blob);
    return blob;
  } catch (err) {
    // Graceful degradation: TTS cache endpoint fetch failed; caller tries on-demand generation
    debugLogger.warn('Audio', 'fetchTtsCacheEndpoint request failed', err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchNeuralBlob(text: string, voice: string | undefined): Promise<Blob | null> {
  text = text.trim();
  // Preserve long readings with browser speech rather than silently truncating them.
  if (!text || Array.from(text).length > 500) return null;
  const key = `${voice || 'zh-CN-XiaoxiaoNeural'}|${text}`;
  const memory = neuralMemory.get(key);
  if (memory) {
    neuralMemory.delete(key);
    neuralMemory.set(key, memory);
    return memory.blob;
  }
  const inFlight = neuralFetches.get(key);
  if (inFlight) return inFlight;

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<null>((resolve) => {
    timeout = setTimeout(() => { controller.abort(); resolve(null); }, 10_000);
  });
  const work = (async (): Promise<Blob | null> => {
    const cacheReq = ttsCacheRequest(text, voice);
    // As with recordings, slow browser storage must not hold up online audio.
    const cacheWaitMs = typeof navigator !== 'undefined' && navigator.onLine === false ? 1000 : 100;
    let cacheTimer: ReturnType<typeof setTimeout>;
    const cachedBlob = await Promise.race([
      (async () => {
        const cache = await getNeuralCache();
        const cached = await cache?.match(cacheReq);
        return cached ? cached.blob() : null;
      })().catch(() => null),
      new Promise<null>((resolve) => { cacheTimer = setTimeout(() => resolve(null), cacheWaitMs); }),
    ]).finally(() => clearTimeout(cacheTimer));
    if (cachedBlob && isUsableAudioBlob(cachedBlob)) return cachedBlob;

    if (Date.now() < neuralRetryAfter) return null;
    const serverCached = await fetchTtsCacheEndpoint(text, voice, controller.signal);
    if (serverCached) return serverCached;
    if (controller.signal.aborted || Date.now() < neuralRetryAfter) return null;

    let token: string | null;
    try {
      token = await authService.getAccessToken();
    } catch (err) {
      // Graceful degradation: auth token unavailable; browser-speech fallback
      debugLogger.warn('Audio', 'authService.getAccessToken failed for neural TTS', err);
      token = null;
    }
    if (!token || controller.signal.aborted) return null;
    try {
      const response = await fetch(resolveRequestUrl('/api/tts'), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, voice }),
      });
      if ([429, 502, 503].includes(response.status)) neuralRetryAfter = Date.now() + 30_000;
      if (!response.ok) return null;
      const blob = await response.blob();
      if (!isUsableAudioBlob(blob)) return null;
      putNeuralCache(cacheReq, blob);
      return blob;
    } catch (err) {
      // Graceful degradation: neural TTS synthesis endpoint failed; falls back to browser voice
      debugLogger.warn('Audio', 'Neural TTS synthesis request failed', err);
      return null;
    }
  })();

  const promise = Promise.race([work, deadline]);
  neuralFetches.set(key, promise);
  try {
    const blob = await promise;
    if (blob) rememberNeuralBlob(key, blob);
    return blob;
  } finally {
    clearTimeout(timeout!);
    if (neuralFetches.get(key) === promise) {
      neuralFetches.delete(key);
    }
  }
}

export async function preloadNeuralTexts(
  texts: string[],
  voice?: string,
  options?: { limit?: number },
): Promise<void> {
  if (!texts || texts.length === 0) return;
  const limit = options?.limit ?? texts.length;
  const queue = [...new Set(texts.map((text) => text?.trim()).filter(Boolean))].slice(0, limit);
  if (queue.length === 0) return;

  const MAX_CONCURRENT_TTS_PRELOAD = 2;
  const worker = async () => {
    while (queue.length > 0) {
      const clean = queue.shift()!;
      await fetchNeuralBlob(clean, voice).catch(() => null);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENT_TTS_PRELOAD, queue.length) }, () => worker()),
  );
}

export function playBlobAudio(
  blob: Blob,
  playbackRate: number,
  finish: () => void,
  fallback: () => void,
  onActiveAudio?: (audio: HTMLAudioElement | null) => void,
  unlockedAudio?: HTMLAudioElement,
): HTMLAudioElement {
  const retainedUrl = neuralUrls.get(blob);
  const objectUrl = retainedUrl ?? URL.createObjectURL(blob);
  let audio: HTMLAudioElement;
  try { audio = unlockedAudio ?? new Audio(); } catch (error) { if (!retainedUrl) URL.revokeObjectURL(objectUrl); throw error; }
  let released = false;
  let stopPlayback = () => {};
  const cleanup = () => {
    if (released) return;
    released = true;
    stopPlayback();
    blobCleanups.delete(audio);
    silenceAudio(audio);
    onActiveAudio?.(null);
    if (!retainedUrl) URL.revokeObjectURL(objectUrl);
  };
  blobCleanups.set(audio, cleanup);
  onActiveAudio?.(audio);
  stopPlayback = playHtmlAudio(audio, objectUrl, playbackRate, () => {
    if (released) return;
    cleanup();
    finish();
  }, () => {
    if (released) return;
    cleanup();
    fallback();
  });
  return audio;
}

export function playNeuralAudio(
  text: string,
  voice: string | undefined,
  playbackRate: number,
  isPlaybackActive: () => boolean,
  finish: () => void,
  fallbackToBrowserSpeech: () => void,
  onActiveAudio?: (audio: HTMLAudioElement | null) => void,
  unlockedAudio?: HTMLAudioElement,
): void {
  let fallbackStarted = false;
  const fallback = () => {
    if (fallbackStarted || !isPlaybackActive()) return;
    fallbackStarted = true;
    fallbackToBrowserSpeech();
  };
  (async () => {
    // Include local cache reads in the playback deadline as well as network requests.
    const blob = await Promise.race([fetchNeuralBlob(text, voice), wait(2500).then(() => null)]);
    if (!isPlaybackActive()) return;
    if (blob) playBlobAudio(blob, playbackRate, finish, fallback, onActiveAudio, unlockedAudio);
    else fallback();
  })().catch(fallback);
}

export async function speakUtterance(
  text: string,
  language: string,
  rate: number,
  isPlaybackActive: (utterance: SpeechSynthesisUtterance) => boolean,
  onUtteranceChange: (utterance: SpeechSynthesisUtterance | null) => void,
  finish: () => void,
  preferAnyChineseVoice = false,
): Promise<void> {
  if (!text.trim() || typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
    finish();
    return;
  }
  let utterance: SpeechSynthesisUtterance | null = null;
  try {
    utterance = new SpeechSynthesisUtterance(text);
    const activeUtterance = utterance;
    onUtteranceChange(utterance);
    utterance.lang = language;
    utterance.rate = Number.isFinite(rate) && rate > 0 ? Math.min(10, Math.max(0.1, rate)) : 1;

    const voices = await ensureSpeechVoices();
    if (!isPlaybackActive(utterance)) return;

    const voice = pickVoice(voices, language, preferAnyChineseVoice);
    if (!voice && language.toLowerCase().startsWith('zh')) {
      onUtteranceChange(null);
      finish();
      return;
    }
    utterance.voice = voice;
    const cleanup = () => {
      clearTimeout(startupTimer);
      clearTimeout(lifetimeTimer);
      activeUtterance.onstart = null;
      activeUtterance.onend = null;
      activeUtterance.onerror = null;
      speechCleanups.delete(activeUtterance);
    };
    const timeout = () => {
      if (!isPlaybackActive(activeUtterance)) { cleanup(); return; }
      cleanup();
      onUtteranceChange(null);
      try { window.speechSynthesis.cancel(); } finally { finish(); }
    };
    speechCleanups.set(utterance, cleanup);
    const startupTimer = setTimeout(timeout, 2500);
    // Generous speech-length allowance; a broken voice must not hold auto-flow forever.
    const lifetimeTimer = setTimeout(timeout, Math.max(10_000, Array.from(text).length * 1000 / utterance.rate));
    utterance.onstart = () => clearTimeout(startupTimer);
    utterance.onend = () => {
      if (!isPlaybackActive(activeUtterance)) return;
      cleanup();
      onUtteranceChange(null);
      finish();
    };
    utterance.onerror = (error) => {
      if (!isPlaybackActive(activeUtterance)) return;
      cleanup();
      onUtteranceChange(null);
      debugLogger.warn('Audio', 'SpeechSynthesis error:', error);
      finish();
    };
    window.speechSynthesis.speak(utterance);
    kickstartSpeech();
  } catch (error) {
    if (utterance) releaseSpeechUtterance(utterance);
    onUtteranceChange(null);
    debugLogger.warn('Audio', 'SpeechSynthesis playback failed:', error);
    finish();
  }
}
