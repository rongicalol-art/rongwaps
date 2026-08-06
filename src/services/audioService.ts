export const AUDIO_BUCKET = 'vocabulary-audio';

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

/**
 * Audio playback service with a 3-tier fallback chain:
 *
 *   1. Web Audio API (best — zero-latency, supports playback rate)
 *   2. HTMLAudioElement (compatible — works on older browsers)
 *   3. SpeechSynthesis TTS (last resort — browser's built-in Chinese voice)
 *
 * The service pre-decodes audio into AudioBuffers for instant playback,
 * and falls back gracefully when Web Audio isn't available.
 * Call `initialize()` on first user interaction to unlock audio on iOS.
 */
export class AudioService {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private fetchPromises: Map<string, Promise<AudioBuffer>> = new Map();
  
  // Fallbacks for older browsers
  private objectUrls: Map<string, string> = new Map();
  private blobPromises: Map<string, Promise<string>> = new Map();
  private globalAudio: HTMLAudioElement | null = null;
  
  private isInitialized = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activePlaybackFinish: (() => void) | null = null;
  private neuralCache: Cache | null = null;

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
    
    this.isInitialized = true;
  }

  async preload(audioFileNames: (string | undefined)[]) {
    if (typeof window === 'undefined') return;

    const validNames = audioFileNames.filter(Boolean) as string[];
    const maxConcurrent = 3;
    const queue = [...validNames];

    const fetchAudioBlob = async (fileName: string): Promise<Blob> => {
      // Use our own server proxy to avoid CORS issues on all browsers
      const response = await fetch(`/api/audio/${fileName}`);
      if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
      return await response.blob();
    };

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;
      const fileName = queue.shift()!;
      
      try {
        if (this.audioContext) {
          if (!this.buffers.has(fileName) && !this.fetchPromises.has(fileName)) {
            const promise = (async () => {
              const blob = await fetchAudioBlob(fileName);
              const arrayBuffer = await blob.arrayBuffer();
              const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
              this.buffers.set(fileName, audioBuffer);
              return audioBuffer;
            })();
            this.fetchPromises.set(fileName, promise);
            await promise;
          }
        } else {
          if (!this.objectUrls.has(fileName) && !this.blobPromises.has(fileName)) {
            const promise = (async () => {
               const blob = await fetchAudioBlob(fileName);
               const objectUrl = URL.createObjectURL(blob);
               this.objectUrls.set(fileName, objectUrl);
               return objectUrl;
            })();
            this.blobPromises.set(fileName, promise);
            await promise;
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

  private startSpeech(
    text: string,
    language: string,
    rate: number,
    finish: () => void,
    preferAnyChineseVoice = false,
  ): void {
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

      const voices = window.speechSynthesis.getVoices();
      utterance.voice = preferAnyChineseVoice
        ? voices.find((voice) => (
            voice.lang.startsWith('zh')
            || voice.lang.includes('CN')
            || voice.lang.includes('TW')
          )) ?? null
        : voices.find((voice) => voice.lang === language)
          ?? voices.find((voice) => voice.lang.startsWith(language.split('-')[0]))
          ?? null;

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
      this.startSpeech(text, 'zh-CN', rate, finish, true);
    });
  }

  private ttsCacheRequest(text: string, voice: string | undefined): Request {
    const voiceName = voice || 'zh-CN-XiaoxiaoNeural';
    return new Request(`/api/tts-cache/${encodeURIComponent(text)}?voice=${voiceName}`, { method: 'GET' });
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
    audio.playbackRate = playbackRate > 0 ? playbackRate : 1;
    audio.onended = () => {
      URL.revokeObjectURL(objectUrl);
      if (this.activePlaybackFinish === finish) {
        this.activePlaybackFinish = null;
      }
      finish();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      fallback();
    };
    audio.play().catch(fallback);
  }

  private playNeuralAudio(text: string, voice: string | undefined, playbackRate: number, finish: () => void): void {
    const language = voice?.startsWith('zh-TW') ? 'zh-TW' : 'zh-CN';
    const fallback = () => {
      // Neural TTS unavailable — fall back to browser speech.
      this.startSpeech(text, language, 0.86, finish, true);
    };

    const cacheRequest = this.ttsCacheRequest(text, voice);

    // Play a cached neural MP3 if one exists (browser Cache API).
    const playNeuralIfCached = async (): Promise<boolean> => {
      if (typeof window === 'undefined') return false;
      const cache = await this.getNeuralCache();
      if (!cache) return false;
      const cached = await cache.match(cacheRequest).catch(() => null);
      if (!cached) return false;
      const blob = await cached.blob();
      this.playBlobAudio(blob, playbackRate, finish, fallback);
      return true;
    };

    (async () => {
      // 1. Browser Cache API — instant repeat playback, zero network.
      if (await playNeuralIfCached()) return;

      // 2. No cached neural audio yet: start the default (browser) speech
      //    immediately so there's no dead air while the neural MP3
      //    synthesizes, and warm the caches in the background. The next
      //    playback of this text will be instant neural audio; we never
      //    swap voices mid-word.
      let finalized = false;
      const speechFinish = () => {
        if (finalized) return;
        finalized = true;
        finish();
      };

      this.startSpeech(text, language, 0.86, speechFinish, true);
      void this.warmNeuralCache(text, voice, cacheRequest);
    })();
  }

  /**
   * Best-effort: synthesize the neural MP3 and store it in the browser
   * Cache API and Supabase storage so the next playback is instant.
   * Never blocks or interrupts the browser speech already playing.
   */
  private async warmNeuralCache(
    text: string,
    voice: string | undefined,
    cacheRequest: Request,
  ): Promise<void> {
    try {
      const cache = await this.getNeuralCache();
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      });
      if (!response.ok) throw new Error(`TTS failed: ${response.status}`);
      const blob = await response.blob();
      if (cache) {
        cache
          .put(cacheRequest, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }))
          .catch(() => {});
      }
    } catch {
      // Best-effort — keep the browser speech that is already playing.
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
   */
  public async preloadNeural(texts: string[], voice?: string): Promise<void> {
    if (!texts || texts.length === 0) return;
    const cache = await this.getNeuralCache();
    // Cap concurrent preload fetches so a deck prewarm doesn't burst past the
    // server paidApiLimiter (10/min). Workers pull from a shared queue.
    const MAX_CONCURRENT_TTS_PRELOAD = 2;
    const queue = texts.map((text) => text?.trim()).filter(Boolean);
    const worker = async () => {
      while (queue.length > 0) {
        const clean = queue.shift()!;
        const cacheRequest = this.ttsCacheRequest(clean, voice);
        if (cache) {
          try {
            if (await cache.match(cacheRequest)) continue;
          } catch {
            // fall through and synth anyway
          }
        }
        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: clean, voice }),
          });
          if (!response.ok) continue;
          const blob = await response.blob();
          if (cache) {
            cache
              .put(cacheRequest, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }))
              .catch(() => {});
          }
        } catch {
          // best-effort — never block card save/render
        }
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
      this.startSpeech(text, language, rate, finish);
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

  public play(audioFileName?: string, playbackRate: number = 1.0, textFallback?: string): Promise<void> {
    const isProperAudioFile = (filename?: string): boolean => {
      if (!filename) return false;
      const lowercase = filename.toLowerCase();
      return lowercase.endsWith('.mp3')
        || lowercase.endsWith('.wav')
        || lowercase.endsWith('.ogg')
        || lowercase.endsWith('.m4a')
        || lowercase.startsWith('http://')
        || lowercase.startsWith('https://');
    };

    this.stop();

    const textToSpeak = textFallback
      || (
        audioFileName
        && !isProperAudioFile(audioFileName)
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

      if (!audioFileName || !isProperAudioFile(audioFileName)) {
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

      const isRemoteUrl = /^https?:\/\//i.test(audioFileName);
      try {
        audio.src = isRemoteUrl
          ? audioFileName
          : this.objectUrls.get(audioFileName) ?? `/api/audio/${audioFileName}`;
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
    });
  }
}

export const audioService = new AudioService();
