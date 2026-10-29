import { debugLogger } from '../utils/debug/debugLogger';
export { AUDIO_BUCKET } from './audio/audioCache';
import {
  cacheObjectUrl,
  invalidateCachedAudio,
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
  speakUtterance,
  releaseSpeechUtterance,
  wait,
} from './audio/speechEngine';
import {
  afterPaint,
  playHtmlAudio,
  prepareAudioElement,
  playRangeOnAudioElement,
  silenceAudio,
  type PlayRangeOptions,
} from './audio/playbackEngine';
import type { Flashcard } from '../data/flashcards';
import { getCharacterAudio } from './pronunciationAudio';
import { ShortAudioClips } from './audio/shortAudioClips';
import { reportAudioFailure } from './errorReporting';
import { playbackWaiting } from './audio/playbackWaiting';

type PlayOptions = { overlap?: boolean; fallback?: 'none'; onUnavailable?: () => void };
export class AudioService {
  private defaultRate = 1.0;
  private shortClips = new ShortAudioClips();
  private objectUrls: Map<string, string> = new Map();
  private globalAudio: HTMLAudioElement | null = null;
  private spareAudio: HTMLAudioElement | null = null; // pre-unlocked; hosts the next overlapped clip
  private isInitialized = false;
  private rangeRafHandle: number | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activePlaybackFinish: (() => void) | null = null;
  private activePlaybackCleanup: (() => void) | null = null;
  constructor() {
    if (typeof window !== 'undefined') {
      if (typeof Audio !== 'undefined') {
        try {
          this.globalAudio = new Audio();
          this.watchFirstSound(this.globalAudio);
        } catch (error) {
          debugLogger.warn('Audio', 'HTML audio initialization failed; using browser speech fallback', error);
        }
      }
    }
  }
  public initialize(): void {
    this.shortClips.unlock();
    if (this.isInitialized) return;
    try { if (this.globalAudio && typeof Audio !== 'undefined' && !this.spareAudio) this.watchFirstSound(this.spareAudio = new Audio()); }
    catch (error) { debugLogger.warn('Audio', 'Spare audio initialization failed', error); }
    for (const audio of [this.globalAudio, this.spareAudio]) {
      if (!audio) continue;
      if (audio === this.globalAudio && this.activePlaybackFinish) continue;
      try {
        audio.src = 'data:audio/mp3;base64,//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB';
        audio.play()?.catch(() => {});
      } catch (e) { debugLogger.warn('Audio', 'Silent unlock play failed', e); }
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
  public async prepareRecording(fileName: string | undefined, signal?: AbortSignal, primeMedia = true): Promise<void> {
    const src = fileName && getCachedObjectUrl(this.objectUrls, fileName);
    if (!src) return;
    if (await this.shortClips.prepare(src, signal) && this.defaultRate === 1) return;
    if (primeMedia && this.globalAudio && !this.activePlaybackFinish) {
      try { await prepareAudioElement(this.globalAudio, src, signal); }
      catch (error) { if (error instanceof Error && error.name === 'EncodingError') await invalidateCachedAudio(this.objectUrls, fileName!); throw error; }
    }
  }
  /** Real sound (not the silent unlock clip) ends a playback's wait. */
  private watchFirstSound(audio: HTMLAudioElement): void {
    audio.addEventListener?.('playing', () => { if (!audio.src.startsWith('data:')) playbackWaiting.started(); });
  }
  private trackPlayback(resolve: () => void): () => void {
    let settled = false;
    const seq = playbackWaiting.begin();
    const finish = () => {
      if (settled) return;
      settled = true;
      playbackWaiting.end(seq);
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
      (utt) => { this.currentUtterance = utt; utt?.addEventListener?.('start', () => playbackWaiting.started()); },
      finish,
      preferAnyChineseVoice,
    );
  }
  public speakTTS(text: string, rate?: number): Promise<void> {
    const effectiveRate = rate ?? this.defaultRate;
    this.stop();
    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      void this.startSpeech(text, 'zh-CN', effectiveRate, finish, true);
    });
  }
  public speakText(text: string, language = 'zh-CN', rate?: number): Promise<void> {
    const effectiveRate = rate ?? this.defaultRate;
    this.stop();
    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      void this.startSpeech(text, language, effectiveRate, finish);
    });
  }
  // With `overlap`, a playing clip rings out on its element while the new one uses the spare.
  private beginPlayback(overlap: boolean, fileName?: string): void {
    const { globalAudio: tail, spareAudio: spare } = this;
    // Replaying the same clip should seek the decoded resource, not reload it
    // on the spare element just because the previous play is still ringing.
    const replay = fileName && tail?.readyState && tail.readyState >= 2
      && (tail.src === publicAudioUrl(fileName) || tail.src === this.objectUrls.get(fileName));
    if (!overlap || replay || !tail || !spare || this.rangeRafHandle !== null || this.currentUtterance) {
      this.pause();
      return;
    }
    if (!tail.paused && !tail.ended) {
      silenceAudio(spare);
      [this.globalAudio, this.spareAudio] = [spare, tail];
    }
    this.activePlaybackCleanup?.();
    this.activePlaybackCleanup = null;
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
      if (!this.globalAudio.paused) {
        try {
          this.globalAudio.pause();
        } catch (e) { debugLogger.warn('Audio', 'Global audio pause failed', e); }
      }
    }
    if (this.currentUtterance) {
      releaseSpeechUtterance(this.currentUtterance);
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance = null;
      if (typeof window !== 'undefined') {
        try { window.speechSynthesis?.cancel(); } catch (e) { debugLogger.warn('Audio', 'SpeechSynthesis cancel failed', e); }
      }
    }

    const finish = this.activePlaybackFinish;
    this.activePlaybackFinish = null;
    finish?.();
  }
  public stop(): void {
    this.pause();
    if (this.globalAudio) {
      try {
        if (this.globalAudio.currentTime !== 0) this.globalAudio.currentTime = 0;
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
    playbackRate?: number,
    textFallback?: string,
    fallbackLanguage = 'zh-CN',
    startTime = 0,
    options?: PlayOptions,
  ): Promise<void> {
    const effectiveRate = playbackRate ?? this.defaultRate;
    this.beginPlayback(options?.overlap === true, audioFileName);
    const textToSpeak = textFallback
      || (audioFileName && !this.isAudioFileName(audioFileName) ? audioFileName : undefined);

    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      const startSpeechFallback = () => {
        if (this.activePlaybackFinish !== finish) return;
        if (options?.fallback === 'none' || !textToSpeak) {
          options?.onUnavailable?.();
          finish();
          return;
        }
        void this.startSpeech(textToSpeak, fallbackLanguage, 0.86 * effectiveRate, finish, true);
      };

      if (!audioFileName || !this.isAudioFileName(audioFileName) || !this.globalAudio) {
        startSpeechFallback();
        return;
      }

      const audio = this.globalAudio;
      let fallbackStarted = false;
      const handleAudioFailure = (error?: unknown) => {
        if (fallbackStarted || this.activePlaybackFinish !== finish) return;
        fallbackStarted = true;
        if (!(error instanceof Error && error.name === 'AbortError')) reportAudioFailure(error, {
          stage: 'play',
          context: this.shortClips.state(),
          standalone: String(typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches),
          visible: typeof document === 'undefined' ? 'unknown' : document.visibilityState,
        });
        if (error instanceof Error && error.name === 'EncodingError') void invalidateCachedAudio(this.objectUrls, audioFileName);
        if (error instanceof Error && (error.name === 'AbortError' || error.name === 'NotAllowedError')) {
          options?.onUnavailable?.();
          finish();
          return;
        }
        try { audio.pause(); audio.src = ''; audio.load?.(); } catch (e) { debugLogger.warn('Audio', 'Pause on audio failure failed', e); }
        startSpeechFallback();
      };

      const playUrl = (url: string) => afterPaint(() => {
        // Stopped or replaced before the frame painted: nothing to start.
        if (this.activePlaybackFinish !== finish) return;
        const playNative = () => {
          if (this.activePlaybackFinish !== finish) return;
          this.activePlaybackCleanup = playHtmlAudio(audio, url, effectiveRate, () => {
            // Cache explicitly completed recordings without delaying first sound.
            if (typeof caches !== 'undefined') void this.getAudioObjectUrl(audioFileName).then((src) => this.shortClips.prepare(src)).catch(() => {});
            finish();
          }, handleAudioFailure, startTime);
        };
        this.activePlaybackCleanup = this.shortClips.play(this.objectUrls.get(audioFileName) ?? url, effectiveRate, startTime, finish, playNative) ?? null;
        if (this.activePlaybackCleanup) playbackWaiting.started();
        else playNative();
      });
      this.playRecordedSource(audioFileName, playUrl, finish, handleAudioFailure);
    });
  }

  /** Reading-checked dictionary/custom cards must never guess their reading with TTS. */
  public playCard(card: Pick<Flashcard, 'audio' | 'front' | 'source'> & { pinyin?: string }, rate?: number, options?: PlayOptions): Promise<void> {
    const effectiveRate = rate ?? this.defaultRate;
    if (card.source === 'dictionary' && !this.isAudioFileName(card.audio) && /^[\u3400-\u9fff]$/u.test(card.front) && card.pinyin) {
      this.beginPlayback(options?.overlap === true);
      return new Promise((resolve) => {
        const finish = this.trackPlayback(resolve);
        void Promise.race([getCharacterAudio(card.front, card.pinyin), wait(2500).then(() => undefined)]).then((audio) => {
          if (this.activePlaybackFinish !== finish) return;
          this.activePlaybackFinish = null; // Transfer cancellation ownership to recorded playback.
          playbackWaiting.carryOwner();
          void this.play(audio, effectiveRate, undefined, undefined, 0, { ...options, fallback: 'none' }).then(finish, finish);
        }, () => { if (this.activePlaybackFinish === finish) { options?.onUnavailable?.(); finish(); } });
      });
    }
    return this.play(card.audio, effectiveRate, card.front, undefined, 0, {
      ...options, ...(card.source === 'dictionary' ? { fallback: 'none' as const } : {}),
    });
  }
  public playRange(
    audioFileName: string,
    startSec: number,
    endSec: number,
    options?: PlayRangeOptions,
  ): Promise<void> {
    const rangeOptions = {
      ...options,
      rate: options?.rate ?? this.defaultRate,
    };
    this.pause();
    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      const audio = this.globalAudio;
      if (!audio) {
        rangeOptions?.onUnavailable?.();
        finish();
        return;
      }

      const runRange = (src: string) => {
        if (this.activePlaybackFinish !== finish) return;
        this.activePlaybackCleanup = playRangeOnAudioElement(audio, src, startSec, endSec, rangeOptions, (ended) => {
          if (ended) {
            rangeOptions?.onComplete?.();
            if (rangeOptions?.cacheOnComplete !== false && typeof caches !== 'undefined') {
              void this.getAudioObjectUrl(audioFileName).catch(() => {});
            }
          }
          finish();
        }, (handle) => { this.rangeRafHandle = handle; });
      };

      this.playRecordedSource(audioFileName, runRange, finish, () => { rangeOptions?.onUnavailable?.(); finish(); });
    });
  }

  /** One source policy for whole words and reader ranges; cold files keep streaming. */
  private playRecordedSource(fileName: string, run: (src: string) => void, finish: () => void, fail: (error?: unknown) => void): void {
    const stream = publicAudioUrl(fileName);
    // Reuse loaded streams AND offline blobs before checking cache expiry.
    // Replacing a buffered stale blob forces decoding again on every replay.
    const loaded = this.globalAudio;
    if (loaded && loaded.readyState >= 2 && (loaded.src === stream || loaded.src === this.objectUrls.get(fileName))) { run(loaded.src); return; }
    const existing = getCachedObjectUrl(this.objectUrls, fileName);
    if (existing) { cacheObjectUrl(this.objectUrls, fileName, existing); run(existing); return; }
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
  public setDefaultRate(rate: number): void {
    if (Number.isFinite(rate) && rate > 0) this.defaultRate = rate;
  }
  public getDefaultRate(): number {
    return this.defaultRate;
  }
  public setPlaybackRate(rate: number): void {
    const validRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
    const audio = this.globalAudio;
    if (!audio) return;
    const pitchAudio = audio as unknown as Record<string, boolean>;
    audio.preservesPitch = true;
    pitchAudio.mozPreservesPitch = true;
    pitchAudio.webkitPreservesPitch = true;
    audio.defaultPlaybackRate = validRate;
    audio.playbackRate = validRate;
  }
}

export const audioService = new AudioService();
