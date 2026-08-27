export const AUDIO_BUCKET = 'vocabulary-audio';

import { authService } from './authService';

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function viteEnv(key: string): string | undefined {
  const env = (
    typeof import.meta !== 'undefined'
      ? (import.meta as { env?: Record<string, unknown> }).env
      : undefined
  );
  const value = env?.[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Audio playback service with a 3-tier fallback chain:
 *
 *   1. Web Audio API (best — zero-latency, supports playback rate)
 *   2. HTMLAudioElement (compatible — works on older browsers)
 *   3. SpeechSynthesis TTS (last resort — browser's built-in Chinese voice)
 *
 * The service pre-decodes audio into AudioBuffers for instant playback,
 * and falls back gracefully when Web Audio isn't available.
 * Words without recorded audio use neural TTS: the MP3 is fetched from the
 * browser Cache API, then the server cache, then synthesized (authenticated
 * only). Playback waits a short budget for the neural MP3 before falling
 * back to browser speech, and `preloadNeural()` warms upcoming words ahead
 * of playback so the first tap is already the good voice.
 * Call `initialize()` on first user interaction to unlock audio on iOS.
 */
export class AudioService {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private fetchPromises: Map<string, Promise<AudioBuffer>> = new Map();
  // Bounded cache for decoded buffers/object URLs; evict oldest first.
  private static readonly MAX_AUDIO_CACHE = 100;
  // How long first playback of a word waits for the neural MP3 (server cache
  // hit or fresh synthesis) before falling back to browser speech. Kept short
  // so slow networks degrade to the old behavior instead of dead air.
  private static readonly NEURAL_FIRST_PLAY_BUDGET_MS = 2500;

  // Fallbacks for older browsers
  private objectUrls: Map<string, string> = new Map();
  private blobPromises: Map<string, Promise<string>> = new Map();
  private globalAudio: HTMLAudioElement | null = null;
  
  private isInitialized = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  // Browser voices, loaded lazily: Chrome/Firefox return an empty list from
  // getVoices() until `voiceschanged` fires, so the naive synchronous lookup
  // misses installed voices like Siri Chinese and falls back to the default.
  private speechVoicesCache: SpeechSynthesisVoice[] | null = null;
  private speechVoicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
  private activePlaybackFinish: (() => void) | null = null;
  private neuralCache: Cache | null = null;
  private audioFileCache: Cache | null = null;
  // In-flight neural fetches keyed by text+voice so playback and preload
  // share the same request instead of doubling synthesis calls.
  private neuralFetches: Map<string, Promise<Blob | null>> = new Map();
  // The HTMLAudioElement currently playing a neural MP3, so stop() can cut
  // it off when the user advances to the next card.
  private activeBlobAudio: HTMLAudioElement | null = null;

  constructor() {
    // Only create browser audio primitives in a browser environment.
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext
        || (window as WindowWithWebkitAudioContext).webkitAudioContext;
      if (AudioContextClass) {
        try {
          this.audioContext = new AudioContextClass();
        } catch (error) {
          console.warn('Web Audio initialization failed; using HTML audio fallback', error);
        }
      }
      if (typeof Audio !== 'undefined') {
        try {
          this.globalAudio = new Audio();
        } catch (error) {
          console.warn('HTML audio initialization failed; using TTS fallback', error);
        }
      }
    }
  }

  // Should be called on first user click somewhere in the app to unlock the audio element on iOS
  public initialize() {
    if (this.isInitialized) return;
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        this.audioContext.resume().catch(() => {});
      } catch {
        // A later user gesture can retry the context resume.
      }
    }
    
    if (this.globalAudio) {
      try {
        this.globalAudio.src = 'data:audio/mp3;base64,//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB';
        this.globalAudio.play()?.catch(() => {});
      } catch {
        // Unlock is best-effort; regular playback still has TTS fallback.
      }
    }
    
    // Warm the voice list during the first user gesture so the first
    // utterance can already pick an installed voice (e.g. Siri Chinese)
    // instead of the browser default.
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      void this.ensureSpeechVoices();
    }

    this.isInitialized = true;
  }

  private cacheBuffer(fileName: string, audioBuffer: AudioBuffer): void {
    this.buffers.set(fileName, audioBuffer);
    while (this.buffers.size > AudioService.MAX_AUDIO_CACHE) {
      const oldest = this.buffers.keys().next().value;
      if (oldest === undefined) break;
      this.buffers.delete(oldest);
    }
  }

  private cacheObjectUrl(fileName: string, objectUrl: string): void {
    this.objectUrls.set(fileName, objectUrl);
    while (this.objectUrls.size > AudioService.MAX_AUDIO_CACHE) {
      const oldest = this.objectUrls.keys().next().value;
      if (oldest === undefined) break;
      URL.revokeObjectURL(this.objectUrls.get(oldest)!);
      this.objectUrls.delete(oldest);
    }
  }

  /**
   * Durable audio-file cache (Cache API, persisted across sessions).
   * Keyed by the canonical proxy request so playback works regardless of
   * which source URL was used to fetch the blob.
   */
  private async getAudioFileCache(): Promise<Cache | null> {
    if (this.audioFileCache) return this.audioFileCache;
    try {
      if (typeof caches !== 'undefined') {
        this.audioFileCache = await caches.open('rongwaps-audio-v1');
      }
    } catch {
      this.audioFileCache = null;
    }
    return this.audioFileCache;
  }

  /**
   * Resolve an app-relative path to an absolute URL. Required because the
   * Fetch/Cache APIs reject relative URLs outside a browser document base
   * (e.g. Node tests, SSR), and the Cache API keys requests by absolute URL.
   */
  private static resolveRequestUrl(path: string): string {
    if (typeof location !== 'undefined' && location.href) {
      return new URL(path, location.href).href;
    }
    return new URL(path, 'http://localhost').href;
  }

  private static audioFileCacheRequest(fileName: string): Request {
    return new Request(AudioService.resolveRequestUrl('/api/audio/' + fileName));
  }

  /**
   * Public Supabase Storage URL for an audio file. The 'vocabulary-audio'
   * bucket is public with CORS enabled, so browsers can fetch straight from
   * Supabase's edge/CDN — keeping Express out of the audio hot path.
   * Returns null when Supabase isn't configured so callers fall back to
   * the same-origin proxy.
   */
  private static publicAudioUrl(fileName: string): string | null {
    const supabaseUrl = viteEnv('VITE_SUPABASE_URL');
    if (supabaseUrl && /^https?:\/\//.test(supabaseUrl) && !supabaseUrl.includes('your_')) {
      return supabaseUrl.replace(/\/+$/, '') + '/storage/v1/object/public/' + AUDIO_BUCKET + '/' + fileName;
    }
    return null;
  }

  /**
   * Fetch an audio file's blob with a durable cache layer:
   *   1. Cache API (instant replay, zero network)
   *   2. Direct Supabase public URL (edge/CDN)
   *   3. Same-origin Express proxy (fallback)
   * The blob is written to the Cache API on any successful fetch.
   */
  private async fetchAudioBlob(fileName: string): Promise<Blob> {
    const cache = await this.getAudioFileCache();
    const cacheRequest = AudioService.audioFileCacheRequest(fileName);

    if (cache) {
      const cached = await cache.match(cacheRequest).catch(() => null);
      if (cached) return await cached.blob();
    }

    const sources = [
      AudioService.publicAudioUrl(fileName),
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

  /**
   * Object URL for an audio file backed by the durable cache. Creates and
   * remembers the URL so repeat playback never refetches.
   */
  private async getAudioObjectUrl(fileName: string): Promise<string> {
    const existing = this.objectUrls.get(fileName);
    if (existing) return existing;
    const blob = await this.fetchAudioBlob(fileName);
    const objectUrl = URL.createObjectURL(blob);
    this.cacheObjectUrl(fileName, objectUrl);
    return objectUrl;
  }

  async preload(audioFileNames: (string | undefined)[]) {
    if (typeof window === 'undefined') return;

    const validNames = audioFileNames.filter(Boolean) as string[];
    const maxConcurrent = 3;
    const queue = [...validNames];

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;
      const fileName = queue.shift()!;
      
      try {
        if (this.audioContext) {
          if (!this.buffers.has(fileName) && !this.fetchPromises.has(fileName)) {
            const promise = (async () => {
              const blob = await this.fetchAudioBlob(fileName);
              const arrayBuffer = await blob.arrayBuffer();
              const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
              this.cacheBuffer(fileName, audioBuffer);
              return audioBuffer;
            })();
            this.fetchPromises.set(fileName, promise);
            try {
              await promise;
            } finally {
              // The decoded buffer is now in `buffers` (bounded cache). Drop the
              // in-flight marker regardless of success/failure so a later eviction
              // can re-fetch the file instead of being pinned forever by a stale
              // promise that was only cleared on error.
              this.fetchPromises.delete(fileName);
            }
          }
        } else {
          if (!this.objectUrls.has(fileName) && !this.blobPromises.has(fileName)) {
            const promise = this.getAudioObjectUrl(fileName);
            this.blobPromises.set(fileName, promise);
            try {
              await promise;
            } finally {
              this.blobPromises.delete(fileName);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to preload audio', fileName, error);
        if (this.audioContext) {
            this.fetchPromises.delete(fileName);
        } else {
            this.blobPromises.delete(fileName);
        }
      }

      await processNext();
    };

    const initialWorkers = [];
    for (let i = 0; i < maxConcurrent && i < queue.length; i++) {
        initialWorkers.push(processNext());
    }
    
    await Promise.all(initialWorkers);
  }

  private trackPlayback(resolve: () => void): () => void {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (this.activePlaybackFinish === finish) {
        this.activePlaybackFinish = null;
      }
      resolve();
    };
    this.activePlaybackFinish = finish;
    return finish;
  }

  /**
   * Browser voices load asynchronously on Chrome/Firefox: the first
   * getVoices() call often returns an empty list until `voiceschanged`
   * fires. Wait briefly for them so even the first utterance can pick a
   * proper installed voice (e.g. Siri Chinese) instead of the default.
   */
  private ensureSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
    if (this.speechVoicesCache && this.speechVoicesCache.length > 0) {
      return Promise.resolve(this.speechVoicesCache);
    }
    if (this.speechVoicesPromise) return this.speechVoicesPromise;

    const synth = window.speechSynthesis;
    const immediate = synth.getVoices();
    if (immediate.length > 0) {
      this.speechVoicesCache = immediate;
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
          // Not a real EventTarget — nothing to detach.
        }
        this.speechVoicesCache = synth.getVoices();
        resolve(this.speechVoicesCache);
      };
      try {
        synth.addEventListener('voiceschanged', done);
      } catch {
        // Voices never change on this platform; resolve with what we have.
        done();
        return;
      }
      // Cap the wait so platforms where voiceschanged never fires don't
      // stall playback forever.
      void AudioService.wait(1200).then(done);
    });
    this.speechVoicesPromise = promise;
    return promise.finally(() => {
      if (this.speechVoicesPromise === promise) this.speechVoicesPromise = null;
    });
  }

  /**
   * Pick the best available voice for a language. Exact language match wins,
   * then any voice sharing the base language (any Chinese variant for
   * Mandarin text), with quality markers ranking within each tier. Returns
   * null when no plausible voice exists.
   */
  private static pickVoice(
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

  /**
   * Chrome on macOS sometimes silently drops utterances (notably the first
   * of a session); an immediate pause/resume after speak() is the standard
   * workaround. Scoped tightly to macOS Chrome builds so other engines keep
   * their normal behavior.
   */
  private static kickstartSpeech(): void {
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
      // Best-effort — most setups speak fine without the kickstart.
    }
  }

  private async startSpeech(
    text: string,
    language: string,
    rate: number,
    finish: () => void,
    preferAnyChineseVoice = false,
  ): Promise<void> {
    if (
      !text.trim()
      || typeof window === 'undefined'
      || !window.speechSynthesis
      || typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      finish();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      utterance.lang = language;
      utterance.rate = rate;

      const voices = await this.ensureSpeechVoices();
      // stop() may have superseded this utterance while voices were loading.
      if (this.currentUtterance !== utterance) return;

      const voice = AudioService.pickVoice(voices, language, preferAnyChineseVoice);
      if (!voice && language.toLowerCase().startsWith('zh')) {
        // No Chinese voice exists on this device — reading Chinese text with
        // the browser default (usually English) voice is garbled noise.
        // Stay silent; the neural path covers real audio.
        this.currentUtterance = null;
        finish();
        return;
      }
      utterance.voice = voice;

      utterance.onend = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        finish();
      };
      utterance.onerror = (error) => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        console.warn('SpeechSynthesis error:', error);
        finish();
      };

      window.speechSynthesis.speak(utterance);
      AudioService.kickstartSpeech();
    } catch (error) {
      this.currentUtterance = null;
      console.warn('SpeechSynthesis playback failed:', error);
      finish();
    }
  }

  public speakTTS(text: string, rate: number = 1.0): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      void this.startSpeech(text, 'zh-CN', rate, finish, true);
    });
  }

  private ttsCacheRequest(text: string, voice: string | undefined): Request {
    const voiceName = voice || 'zh-CN-XiaoxiaoNeural';
    return new Request(
      AudioService.resolveRequestUrl(`/api/tts-cache/${encodeURIComponent(text)}?voice=${voiceName}`),
      { method: 'GET' },
    );
  }

  private async getNeuralCache(): Promise<Cache | null> {
    if (this.neuralCache) return this.neuralCache;
    try {
      if (typeof caches !== 'undefined') {
        this.neuralCache = await caches.open('rongwaps-tts-v1');
      }
    } catch {
      this.neuralCache = null;
    }
    return this.neuralCache;
  }

  private playBlobAudio(blob: Blob, playbackRate: number, finish: () => void, fallback: () => void): void {
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    this.activeBlobAudio = audio;
    audio.playbackRate = playbackRate > 0 ? playbackRate : 1;
    const cleanup = () => {
      if (this.activeBlobAudio === audio) this.activeBlobAudio = null;
      URL.revokeObjectURL(objectUrl);
    };
    audio.onended = () => {
      cleanup();
      if (this.activePlaybackFinish === finish) {
        this.activePlaybackFinish = null;
      }
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
  }

  private playNeuralAudio(text: string, voice: string | undefined, playbackRate: number, finish: () => void): void {
    const language = voice?.startsWith('zh-TW') ? 'zh-TW' : 'zh-CN';
    let fallbackStarted = false;
    const fallback = () => {
      if (fallbackStarted || this.activePlaybackFinish !== finish) return;
      fallbackStarted = true;
      // Neural TTS unavailable — fall back to browser speech.
      void this.startSpeech(text, language, 0.86, finish, true);
    };

    (async () => {
      // 1. Browser Cache API — instant repeat playback, zero network.
      const cache = await this.getNeuralCache();
      const cacheRequest = this.ttsCacheRequest(text, voice);
      if (cache) {
        const cached = await cache.match(cacheRequest).catch(() => null);
        if (cached) {
          if (this.activePlaybackFinish !== finish) return;
          this.playBlobAudio(await cached.blob(), playbackRate, finish, fallback);
          return;
        }
      }

      // 2. No browser-cached MP3 yet. Wait a short budget for the neural
      //    audio (server cache hit or fresh synthesis) so the FIRST tap is
      //    already the good voice, and warm the caches in the background.
      //    Only when synthesis is slower than the budget do we fall back to
      //    browser speech — never a mid-word voice swap.
      const blob = await Promise.race([
        this.fetchNeuralBlob(text, voice),
        AudioService.wait(AudioService.NEURAL_FIRST_PLAY_BUDGET_MS).then(() => null),
      ]);
      if (this.activePlaybackFinish !== finish) return;
      if (blob) {
        this.playBlobAudio(blob, playbackRate, finish, fallback);
      } else {
        fallback();
      }
    })();
  }

  private static wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = typeof window !== 'undefined' && window.setTimeout
        ? window.setTimeout.bind(window)
        : setTimeout;
      timer(resolve, ms);
    });
  }

  /**
   * Fetch (or synthesize) the neural MP3 for a text, sharing in-flight work
   * between playback and preloading. Resolution order:
   *   1. Browser Cache API — instant replay, zero network.
   *   2. Server cache (GET /api/tts-cache) — auth-free, does not touch the
   *      paid synthesis limiter, and works for guests once any user has
   *      synthesized the text.
   *   3. Fresh synthesis (POST /api/tts) — authenticated only, so anonymous
   *      callers cannot burn the TTS provider budget.
   * Returns null when no audio can be obtained.
   */
  private async fetchNeuralBlob(text: string, voice: string | undefined): Promise<Blob | null> {
    const key = `${voice || 'zh-CN-XiaoxiaoNeural'}|${text}`;
    const inFlight = this.neuralFetches.get(key);
    if (inFlight) return inFlight;

    const promise = (async (): Promise<Blob | null> => {
      // 1. Browser Cache API — instant replay, zero network.
      const cache = await this.getNeuralCache();
      const cacheRequest = this.ttsCacheRequest(text, voice);
      if (cache) {
        const cached = await cache.match(cacheRequest).catch(() => null);
        if (cached) return await cached.blob();
      }

      // 2. Server cache — cheap and auth-free.
      const serverCached = await this.fetchTtsCacheEndpoint(text, voice);
      if (serverCached) return serverCached;

      // 3. Fresh synthesis — authenticated only.
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
          // Paid limiter exhausted this minute — another client may have
          // synthesized the text in the meantime; one last cache read.
          return await this.fetchTtsCacheEndpoint(text, voice);
        }
        if (!response.ok) return null;
        const blob = await response.blob();
        this.putNeuralCache(cacheRequest, blob);
        return blob;
      } catch {
        return null;
      }
    })();

    this.neuralFetches.set(key, promise);
    try {
      return await promise;
    } finally {
      if (this.neuralFetches.get(key) === promise) {
        this.neuralFetches.delete(key);
      }
    }
  }

  private putNeuralCache(cacheRequest: Request, blob: Blob): void {
    void this.getNeuralCache()
      .then((cache) => (
        cache
          ? cache.put(cacheRequest, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }))
          : undefined
      ))
      .catch(() => {});
  }

  private async fetchTtsCacheEndpoint(text: string, voice: string | undefined): Promise<Blob | null> {
    try {
      const voiceName = voice || 'zh-CN-XiaoxiaoNeural';
      const response = await fetch(
        AudioService.resolveRequestUrl(`/api/tts-cache/${encodeURIComponent(text)}?voice=${encodeURIComponent(voiceName)}`),
      );
      if (!response.ok) return null;
      const blob = await response.blob();
      this.putNeuralCache(this.ttsCacheRequest(text, voice), blob);
      return blob;
    } catch {
      return null;
    }
  }

  public speakNeural(text: string, voice?: string): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      this.playNeuralAudio(text, voice, 1, this.trackPlayback(resolve));
    });
  }

  /**
   * Fire-and-forget pre-warm: synthesizes texts ahead of playback and stores
   * them in the browser Cache API so first tap is instant. Best-effort.
   * Shares in-flight fetches with playback (never double-synthesizes), and
   * `options.limit` bounds how many texts one call may fetch so a deck
   * prewarm stays well under the server paidApiLimiter (10/min).
   */
  public async preloadNeural(
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

    // Cap concurrent preload fetches so a deck prewarm doesn't burst past the
    // server paidApiLimiter (10/min). Workers pull from a shared queue.
    const MAX_CONCURRENT_TTS_PRELOAD = 2;
    const worker = async () => {
      while (queue.length > 0) {
        const clean = queue.shift()!;
        await this.fetchNeuralBlob(clean, voice).catch(() => null);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENT_TTS_PRELOAD, queue.length) }, () => worker()),
    );
  }

  public speakText(text: string, language = 'zh-CN', rate = 1.0): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      void this.startSpeech(text, language, rate, finish);
    });
  }

  public stop(): void {
    const source = this.currentSource;
    this.currentSource = null;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
      try {
        source.disconnect();
      } catch {
        // The source may already be disconnected.
      }
    }

    if (this.globalAudio) {
      this.globalAudio.onended = null;
      this.globalAudio.onerror = null;
      try {
        this.globalAudio.pause();
        this.globalAudio.currentTime = 0;
      } catch {
        // Some browsers reject media operations before metadata is available.
      }
    }

    // Cut off any neural MP3 currently playing through its own element.
    const blobAudio = this.activeBlobAudio;
    this.activeBlobAudio = null;
    if (blobAudio) {
      blobAudio.onended = null;
      blobAudio.onerror = null;
      try {
        blobAudio.pause();
      } catch {
        // The element may already be done.
      }
    }

    if (this.currentUtterance) {
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance = null;
    }
    if (typeof window !== 'undefined') {
      try {
        window.speechSynthesis?.cancel();
      } catch (error) {
        console.warn('SpeechSynthesis cancellation failed:', error);
      }
    }

    const finish = this.activePlaybackFinish;
    this.activePlaybackFinish = null;
    finish?.();
  }

  /**
   * True when the value names a real audio file (or URL) rather than raw
   * text to synthesize. Callers use this to decide which cards need neural
   * TTS pre-warming.
   */
  public isAudioFileName(filename?: string): boolean {
    if (!filename) return false;
    const lowercase = filename.toLowerCase();
    return lowercase.endsWith('.mp3')
      || lowercase.endsWith('.wav')
      || lowercase.endsWith('.ogg')
      || lowercase.endsWith('.m4a')
      || lowercase.startsWith('http://')
      || lowercase.startsWith('https://');
  }

  public play(audioFileName?: string, playbackRate: number = 1.0, textFallback?: string): Promise<void> {
    this.stop();

    const textToSpeak = textFallback
      || (
        audioFileName
        && !this.isAudioFileName(audioFileName)
          ? audioFileName
          : undefined
      );

    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      const startSpeechFallback = () => {
        if (textToSpeak) {
          this.playNeuralAudio(textToSpeak, 'zh-CN-XiaoxiaoNeural', playbackRate, finish);
        } else {
          finish();
        }
      };

      if (!audioFileName || !this.isAudioFileName(audioFileName)) {
        startSpeechFallback();
        return;
      }

      // 1. Play using Web Audio API (zero latency) when a decoded buffer exists.
      if (this.audioContext && this.buffers.has(audioFileName)) {
        try {
          const buffer = this.buffers.get(audioFileName)!;
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
          }

          const source = this.audioContext.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = playbackRate;
          source.connect(this.audioContext.destination);
          source.onended = () => {
            if (this.currentSource === source) {
              this.currentSource = null;
            }
            try {
              source.disconnect();
            } catch {
              // The source may already be disconnected.
            }
            finish();
          };
          this.currentSource = source;
          source.start(0);
          return;
        } catch (error) {
          this.currentSource = null;
          console.warn('Web Audio playback failed, trying HTML audio', error);
        }
      }

      // 2. Fall back to one shared HTMLAudioElement.
      const audio = this.globalAudio;
      if (!audio) {
        startSpeechFallback();
        return;
      }

      let fallbackStarted = false;
      const handleAudioFailure = (error?: unknown) => {
        if (fallbackStarted || this.activePlaybackFinish !== finish) return;
        fallbackStarted = true;
        audio.onended = null;
        audio.onerror = null;
        try {
          audio.pause();
        } catch {
          // Continue to TTS even if the media element cannot be paused.
        }
        if (error) {
          console.warn('HTML audio playback failed, trying TTS fallback', error);
        }
        startSpeechFallback();
      };

      // Start playback from a given source URL. Handlers are attached only
      // here so double-settlement is impossible whatever path we take.
      const startHtmlPlayback = (src: string) => {
        try {
          audio.src = src;
          audio.playbackRate = playbackRate;
          audio.currentTime = 0;
          audio.onended = () => {
            if (this.activePlaybackFinish !== finish) return;
            audio.onended = null;
            audio.onerror = null;
            finish();
          };
          audio.onerror = () => handleAudioFailure();

          const playPromise = audio.play();
          playPromise?.catch(handleAudioFailure);
        } catch (error) {
          handleAudioFailure(error);
        }
      };

      const isRemoteUrl = /^https?:\/\//i.test(audioFileName);
      if (isRemoteUrl) {
        startHtmlPlayback(audioFileName);
      } else {
        // Local bucket file: play from the durable-cache-backed object URL so
        // repeat and offline playback never touches the network again.
        const existingUrl = this.objectUrls.get(audioFileName);
        if (existingUrl) {
          startHtmlPlayback(existingUrl);
        } else {
          this.getAudioObjectUrl(audioFileName)
            .then(startHtmlPlayback)
            .catch(handleAudioFailure);
        }
      }
    });
  }
}

export const audioService = new AudioService();
