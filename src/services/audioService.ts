import { debugLogger } from '../utils/debug/debugLogger';
export { AUDIO_BUCKET } from './audio/audioCache';
import {
  cacheObjectUrl,
  audioBlobCachedAt,
  getCachedObjectUrl,
  fetchAudioBlob,
  preloadAudioFiles,
  publicAudioUrl,
  readCachedAudioBlob,
  MAX_AUDIO_MEMORY_BYTES,
  type AudioPreloadProgress,
} from './audio/audioCache';
import {
  ensureSpeechVoices,
  playNeuralAudio,
  preloadNeuralTexts,
  speakUtterance,
  releaseBlobAudio,
  releaseSpeechUtterance,
  wait,
} from './audio/speechEngine';
import {
  playHtmlAudio,
  playRangeOnAudioElement,
  silenceAudio,
  type PlayRangeOptions,
} from './audio/playbackEngine';
import type { Flashcard } from '../data/flashcards';
import { getCharacterAudio } from './pronunciationAudio';

type PlayOptions = { overlap?: boolean; fallback?: 'none'; onUnavailable?: () => void };
export class AudioService {
  private objectUrls: Map<string, string> = new Map();
  private globalAudio: HTMLAudioElement | null = null;
  private spareAudio: HTMLAudioElement | null = null; // pre-unlocked; hosts the next overlapped clip
  private isInitialized = false;
  private rangeRafHandle: number | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activePlaybackFinish: (() => void) | null = null;
  private activePlaybackCleanup: (() => void) | null = null;
  private activeBlobAudio: HTMLAudioElement | null = null;
  constructor() {
    if (typeof window !== 'undefined') {
      if (typeof Audio !== 'undefined') {
        try {
          this.globalAudio = new Audio();
        } catch (error) {
          debugLogger.warn('Audio', 'HTML audio initialization failed; using TTS fallback', error);
        }
      }
    }
  }
  public initialize(): void {
    if (this.isInitialized) return;
    try { if (this.globalAudio && typeof Audio !== 'undefined') this.spareAudio ??= new Audio(); }
    catch (error) { debugLogger.warn('Audio', 'Spare audio initialization failed', error); }
    for (const audio of [this.globalAudio, this.spareAudio]) {
      if (!audio) continue;
      if (audio === this.globalAudio && this.activePlaybackFinish) continue;
      try {
        audio.src = 'data:audio/mp3;base64,//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB';
        audio.play()?.catch(() => {});
      } catch (e) { debugLogger.warn('Audio', 'Silent unlock play failed', e); }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      void ensureSpeechVoices();
    }
    // Best-effort: request persistent storage so the browser is less likely to evict audio cache
    try {
      void navigator.storage?.persist?.();
    } catch (e) { debugLogger.warn('Audio', 'Storage persist request failed', e); }
    this.isInitialized = true;
  }
  private async getAudioObjectUrl(fileName: string, signal?: AbortSignal): Promise<string> {
    const existing = getCachedObjectUrl(this.objectUrls, fileName);
    if (existing) { cacheObjectUrl(this.objectUrls, fileName, existing); return existing; }
    const blob = await fetchAudioBlob(fileName, signal);
    signal?.throwIfAborted();
    const shared = this.objectUrls.get(fileName);
    if (shared) return shared;
    if (blob.size > MAX_AUDIO_MEMORY_BYTES) throw new Error('Audio exceeds memory preload limit');
    const objectUrl = URL.createObjectURL(blob);
    cacheObjectUrl(this.objectUrls, fileName, objectUrl, blob.size, audioBlobCachedAt(blob));
    return objectUrl;
  }
  public async preload(audioFileNames: (string | undefined)[], signal?: AbortSignal, onProgress?: (progress: AudioPreloadProgress) => void): Promise<void> {
    return preloadAudioFiles(audioFileNames, this.objectUrls,
      (fileName) => this.getAudioObjectUrl(fileName, signal), signal, onProgress);
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
  ): Promise<void> {
    return speakUtterance(
      text,
      language,
      rate,
      (utt) => this.currentUtterance === utt,
      (utt) => { this.currentUtterance = utt; },
      finish,
      preferAnyChineseVoice,
    );
  }
  public speakTTS(text: string, rate = 1.0): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      void this.startSpeech(text, 'zh-CN', rate, finish, true);
    });
  }
  public speakNeural(text: string, voice?: string): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      const language = voice?.startsWith('zh-TW') ? 'zh-TW' : 'zh-CN';
      playNeuralAudio(
        text,
        voice,
        1,
        () => this.activePlaybackFinish === finish,
        finish,
        () => void this.startSpeech(text, language, 0.86, finish, true),
        (audio) => { if (this.activePlaybackFinish === finish) this.activeBlobAudio = audio; },
        this.globalAudio ?? undefined,
      );
    });
  }
  public async preloadNeural(texts: string[], voice?: string, options?: { limit?: number }): Promise<void> {
    return preloadNeuralTexts(texts, voice, options);
  }
  public speakText(text: string, language = 'zh-CN', rate = 1.0): Promise<void> {
    this.stop();
    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      void this.startSpeech(text, language, rate, finish);
    });
  }
  // With `overlap`, a playing clip rings out on its element while the new one uses the spare.
  private beginPlayback(overlap: boolean): void {
    const { globalAudio: tail, spareAudio: spare } = this;
    if (!overlap || !tail || !spare || this.rangeRafHandle !== null || this.currentUtterance || this.activeBlobAudio) {
      this.pause();
      return;
    }
    if (!tail.paused && !tail.ended) {
      silenceAudio(spare);
      [this.globalAudio, this.spareAudio] = [spare, tail];
    }
    this.activePlaybackCleanup?.();
    this.activePlaybackCleanup = null;
    this.activeBlobAudio = null;
    this.activePlaybackFinish?.();
    this.activePlaybackFinish = null;
  }
  public pause(): void {
    this.activePlaybackCleanup?.();
    this.activePlaybackCleanup = null;
    if (this.spareAudio) silenceAudio(this.spareAudio);
    if (this.rangeRafHandle !== null) {
      try { cancelAnimationFrame(this.rangeRafHandle); } catch (e) { debugLogger.warn('Audio', 'cancelAnimationFrame failed', e); }
      this.rangeRafHandle = null;
    }
    if (this.globalAudio) {
      this.globalAudio.onended = null;
      this.globalAudio.onerror = null;
      this.globalAudio.ontimeupdate = null;
      try {
        this.globalAudio.pause();
      } catch (e) { debugLogger.warn('Audio', 'Global audio pause failed', e); }
    }
    const blobAudio = this.activeBlobAudio;
    this.activeBlobAudio = null;
    if (blobAudio) {
      releaseBlobAudio(blobAudio);
      blobAudio.onended = null;
      blobAudio.onerror = null;
      try { blobAudio.pause(); } catch (e) { debugLogger.warn('Audio', 'Blob audio pause failed', e); }
    }

    if (this.currentUtterance) {
      releaseSpeechUtterance(this.currentUtterance);
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance = null;
    }
    if (typeof window !== 'undefined') {
      try { window.speechSynthesis?.cancel(); } catch (e) { debugLogger.warn('Audio', 'SpeechSynthesis cancel failed', e); }
    }

    const finish = this.activePlaybackFinish;
    this.activePlaybackFinish = null;
    finish?.();
  }

  public stop(): void {
    this.pause();
    if (this.globalAudio) {
      try {
        this.globalAudio.currentTime = 0;
      } catch (e) { debugLogger.warn('Audio', 'Reset currentTime failed', e); }
    }
  }
  public getGlobalAudio(): HTMLAudioElement | null {
    return this.globalAudio;
  }
  public getCurrentTime(): number {
    return this.globalAudio?.currentTime ?? 0;
  }

  public isAudioFileName(filename?: string): boolean {
    if (!filename) return false;
    return /\.(mp3|wav|ogg|m4a)(?:$|[?#])|^https?:\/\//i.test(filename);
  }

  public play(
    audioFileName?: string,
    playbackRate = 1.0,
    textFallback?: string,
    preferredVoice?: string,
    startTime = 0,
    options?: PlayOptions,
  ): Promise<void> {
    this.beginPlayback(options?.overlap === true);
    const textToSpeak = textFallback
      || (audioFileName && !this.isAudioFileName(audioFileName) ? audioFileName : undefined);

    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      const startSpeechFallback = () => {
        if (this.activePlaybackFinish !== finish) return;
        if (options?.fallback === 'none') {
          options.onUnavailable?.();
          finish();
          return;
        }
        if (textToSpeak) {
          const fallbackVoice = preferredVoice || 'zh-CN-XiaoxiaoNeural';
          const fallbackLocale = fallbackVoice.startsWith('zh-TW') ? 'zh-TW' : 'zh-CN';
          playNeuralAudio(
            textToSpeak,
            fallbackVoice,
            playbackRate,
            () => this.activePlaybackFinish === finish,
            finish,
            () => void this.startSpeech(textToSpeak, fallbackLocale, 0.86 * playbackRate, finish, true),
            (audio) => { if (this.activePlaybackFinish === finish) this.activeBlobAudio = audio; },
            this.globalAudio ?? undefined,
          );
        } else {
          finish();
        }
      };

      if (!audioFileName || !this.isAudioFileName(audioFileName)) {
        startSpeechFallback();
        return;
      }

      const audio = this.globalAudio;
      if (!audio) {
        startSpeechFallback();
        return;
      }

      let fallbackStarted = false;
      const handleAudioFailure = (error?: unknown) => {
        if (fallbackStarted || this.activePlaybackFinish !== finish) return;
        fallbackStarted = true;
        try {
          audio.pause();
          audio.src = '';
          audio.load?.();
        } catch (e) { debugLogger.warn('Audio', 'Pause on audio failure failed', e); }
        if (options?.fallback !== 'none' && error instanceof Error && error.name === 'TimeoutError' && textToSpeak) {
          const locale = (preferredVoice || '').startsWith('zh-TW') ? 'zh-TW' : 'zh-CN';
          void this.startSpeech(textToSpeak, locale, 0.86 * playbackRate, finish, true);
        } else startSpeechFallback();
      };

      const playUrl = (url: string) => {
        if (this.activePlaybackFinish !== finish) return;
        this.activePlaybackCleanup = playHtmlAudio(audio, url, playbackRate, () => {
          // Cache explicitly completed recordings without delaying first sound.
          if (typeof caches !== 'undefined') void fetchAudioBlob(audioFileName).catch(() => {});
          finish();
        }, handleAudioFailure, startTime);
      };
      this.playRecordedSource(audioFileName, playUrl, finish, handleAudioFailure);
    });
  }

  /** Reading-checked dictionary/custom cards must never guess their reading with TTS. */
  public playCard(card: Pick<Flashcard, 'audio' | 'front' | 'source'> & { pinyin?: string }, rate = 1, options?: PlayOptions): Promise<void> {
    if (card.source === 'dictionary' && !this.isAudioFileName(card.audio) && /^[\u3400-\u9fff]$/u.test(card.front) && card.pinyin) {
      this.beginPlayback(options?.overlap === true);
      return new Promise((resolve) => {
        const finish = this.trackPlayback(resolve);
        void Promise.race([getCharacterAudio(card.front, card.pinyin), wait(2500).then(() => undefined)]).then((audio) => {
          if (this.activePlaybackFinish !== finish) return;
          this.activePlaybackFinish = null; // Transfer cancellation ownership to recorded playback.
          void this.play(audio, rate, undefined, undefined, 0, { ...options, fallback: 'none' }).then(finish, finish);
        }, () => { if (this.activePlaybackFinish === finish) { options?.onUnavailable?.(); finish(); } });
      });
    }
    return this.play(card.audio, rate, card.front, undefined, 0, {
      ...options, ...(card.source === 'dictionary' ? { fallback: 'none' as const } : {}),
    });
  }

  public playRange(
    audioFileName: string,
    startSec: number,
    endSec: number,
    options?: PlayRangeOptions,
  ): Promise<void> {
    this.pause();
    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      const audio = this.globalAudio;
      if (!audio) {
        options?.onUnavailable?.();
        finish();
        return;
      }

      const runRange = (src: string) => {
        if (this.activePlaybackFinish !== finish) return;
        this.activePlaybackCleanup = playRangeOnAudioElement(audio, src, startSec, endSec, options, (ended) => {
          if (ended) {
            options?.onComplete?.();
            if (typeof caches !== 'undefined') void fetchAudioBlob(audioFileName).catch(() => {});
          }
          finish();
        }, (handle) => { this.rangeRafHandle = handle; });
      };

      this.playRecordedSource(audioFileName, runRange, finish, () => { options?.onUnavailable?.(); finish(); });
    });
  }

  /** One source policy for whole words and reader ranges; cold files keep streaming. */
  private playRecordedSource(fileName: string, run: (src: string) => void, finish: () => void, fail: (error?: unknown) => void): void {
    const existing = getCachedObjectUrl(this.objectUrls, fileName);
    if (existing) { cacheObjectUrl(this.objectUrls, fileName, existing); run(existing); return; }
    const stream = publicAudioUrl(fileName);
    if (typeof caches !== 'undefined') {
      void readCachedAudioBlob(fileName).then((blob) => {
        if (this.activePlaybackFinish !== finish) return;
        if (blob && blob.size <= MAX_AUDIO_MEMORY_BYTES) {
          const url = URL.createObjectURL(blob);
          cacheObjectUrl(this.objectUrls, fileName, url, blob.size, audioBlobCachedAt(blob));
          run(url);
        } else if (stream) run(stream);
        else fail();
      }).catch(fail);
    } else if (stream) run(stream);
    else void this.getAudioObjectUrl(fileName).then(run).catch(fail);
  }

  public setPlaybackRate(rate: number): void {
    const validRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
    for (const audio of [this.globalAudio, this.activeBlobAudio]) {
      if (!audio) continue;
      const pitchAudio = audio as unknown as Record<string, boolean>;
      audio.preservesPitch = true;
      pitchAudio.mozPreservesPitch = true;
      pitchAudio.webkitPreservesPitch = true;
      audio.defaultPlaybackRate = validRate;
      audio.playbackRate = validRate;
    }
  }
}

export const audioService = new AudioService();
