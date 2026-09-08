import { authService } from '../authService';
import { resolveRequestUrl } from './audioCache';

let speechVoicesCache: SpeechSynthesisVoice[] | null = null;
let speechVoicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let neuralCacheInstance: Cache | null = null;

const neuralFetches: Map<string, Promise<Blob | null>> = new Map();

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
      } catch {
        // Not a real EventTarget on some engines
      }
      speechVoicesCache = synth.getVoices();
      resolve(speechVoicesCache);
    };
    try {
      synth.addEventListener('voiceschanged', done);
    } catch {
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
  } catch {
    // Best-effort
  }
}

export async function getNeuralCache(): Promise<Cache | null> {
  if (neuralCacheInstance) return neuralCacheInstance;
  try {
    if (typeof caches !== 'undefined') {
      neuralCacheInstance = await caches.open('rongwaps-tts-v1');
    }
  } catch {
    neuralCacheInstance = null;
  }
  return neuralCacheInstance;
}

export function ttsCacheRequest(text: string, voice: string | undefined): Request {
  const voiceName = voice || 'zh-CN-XiaoxiaoNeural';
  return new Request(
    resolveRequestUrl(`/api/tts-cache/${encodeURIComponent(text)}?voice=${voiceName}`),
    { method: 'GET' },
  );
}

export function putNeuralCache(cacheRequest: Request, blob: Blob): void {
  void getNeuralCache()
    .then((cache) => (
      cache
        ? cache.put(cacheRequest, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }))
        : undefined
    ))
    .catch(() => {});
}

export async function fetchTtsCacheEndpoint(text: string, voice: string | undefined): Promise<Blob | null> {
  try {
    const voiceName = voice || 'zh-CN-XiaoxiaoNeural';
    const response = await fetch(
      resolveRequestUrl(`/api/tts-cache/${encodeURIComponent(text)}?voice=${encodeURIComponent(voiceName)}`),
    );
    if (!response.ok) return null;
    const blob = await response.blob();
    putNeuralCache(ttsCacheRequest(text, voice), blob);
    return blob;
  } catch {
    return null;
  }
}

export async function fetchNeuralBlob(text: string, voice: string | undefined): Promise<Blob | null> {
  const key = `${voice || 'zh-CN-XiaoxiaoNeural'}|${text}`;
  const inFlight = neuralFetches.get(key);
  if (inFlight) return inFlight;

  const promise = (async (): Promise<Blob | null> => {
    const cache = await getNeuralCache();
    const cacheReq = ttsCacheRequest(text, voice);
    if (cache) {
      const cached = await cache.match(cacheReq).catch(() => null);
      if (cached) return await cached.blob();
    }

    const serverCached = await fetchTtsCacheEndpoint(text, voice);
    if (serverCached) return serverCached;

    let token: string | null;
    try {
      token = await authService.getAccessToken();
    } catch {
      token = null;
    }
    if (!token) return null;
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, voice }),
      });
      if (response.status === 429) {
        return await fetchTtsCacheEndpoint(text, voice);
      }
      if (!response.ok) return null;
      const blob = await response.blob();
      putNeuralCache(cacheReq, blob);
      return blob;
    } catch {
      return null;
    }
  })();

  neuralFetches.set(key, promise);
  try {
    return await promise;
  } finally {
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
  const queue = texts
    .map((text) => text?.trim())
    .filter((text): text is string => Boolean(text))
    .slice(0, limit);
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
): HTMLAudioElement {
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  onActiveAudio?.(audio);
  audio.playbackRate = playbackRate > 0 ? playbackRate : 1;
  const cleanup = () => {
    onActiveAudio?.(null);
    URL.revokeObjectURL(objectUrl);
  };
  audio.onended = () => {
    cleanup();
    finish();
  };
  audio.onerror = () => {
    cleanup();
    fallback();
  };
  audio.play().catch(() => {
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
): void {
  let fallbackStarted = false;
  const fallback = () => {
    if (fallbackStarted || !isPlaybackActive()) return;
    fallbackStarted = true;
    fallbackToBrowserSpeech();
  };

  (async () => {
    const cache = await getNeuralCache();
    const cacheReq = ttsCacheRequest(text, voice);
    if (cache) {
      const cached = await cache.match(cacheReq).catch(() => null);
      if (cached) {
        if (!isPlaybackActive()) return;
        playBlobAudio(await cached.blob(), playbackRate, finish, fallback, onActiveAudio);
        return;
      }
    }

    const blob = await Promise.race([
      fetchNeuralBlob(text, voice),
      wait(2500).then(() => null),
    ]);
    if (!isPlaybackActive()) return;
    if (blob) {
      playBlobAudio(blob, playbackRate, finish, fallback, onActiveAudio);
    } else {
      fallback();
    }
  })();
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
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    onUtteranceChange(utterance);
    utterance.lang = language;
    utterance.rate = rate;

    const voices = await ensureSpeechVoices();
    if (!isPlaybackActive(utterance)) return;

    const voice = pickVoice(voices, language, preferAnyChineseVoice);
    if (!voice && language.toLowerCase().startsWith('zh')) {
      onUtteranceChange(null);
      finish();
      return;
    }
    utterance.voice = voice;
    utterance.onend = () => {
      onUtteranceChange(null);
      finish();
    };
    utterance.onerror = (error) => {
      onUtteranceChange(null);
      console.warn('SpeechSynthesis error:', error);
      finish();
    };
    window.speechSynthesis.speak(utterance);
    kickstartSpeech();
  } catch (error) {
    onUtteranceChange(null);
    console.warn('SpeechSynthesis playback failed:', error);
    finish();
  }
}
