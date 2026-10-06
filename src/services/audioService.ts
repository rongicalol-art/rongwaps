import { debugLogger } from '../utils/debugLogger';
export { AUDIO_BUCKET } from './audio/audioCache';
import {
  cacheObjectUrl,
  fetchAudioBlob,
  preloadAudioFiles,
} from './audio/audioCache';
import {
  ensureSpeechVoices,
  playNeuralAudio,
  preloadNeuralTexts,
  speakUtterance,
} from './audio/speechEngine';
import {
  playHtmlAudio,
  playRangeOnAudioElement,
  silenceAudio,
  type PlayRangeOptions,
} from './audio/playbackEngine';

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class AudioService {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private fetchPromises: Map<string, Promise<AudioBuffer>> = new Map();
  private objectUrls: Map<string, string> = new Map();
  private blobPromises: Map<string, Promise<string>> = new Map();
  private globalAudio: HTMLAudioElement | null = null;
  private spareAudio: HTMLAudioElement | null = null; // pre-unlocked; hosts the next overlapped clip

  private isInitialized = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private rangeRafHandle: number | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activePlaybackFinish: (() => void) | null = null;
  private activeBlobAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext
        || (window as WindowWithWebkitAudioContext).webkitAudioContext;
      if (AudioContextClass) {
        try {
          this.audioContext = new AudioContextClass();
        } catch (error) {
          debugLogger.warn('Audio', 'Web Audio initialization failed; using HTML audio fallback', error);
        }
      }
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
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try { this.audioContext.resume().catch(() => {}); } catch (e) { debugLogger.warn('Audio', 'AudioContext resume failed', e); }
    }
    if (this.globalAudio && typeof Audio !== 'undefined') this.spareAudio ??= new Audio();
    for (const audio of [this.globalAudio, this.spareAudio]) {
      if (!audio) continue;
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

  private async getAudioObjectUrl(fileName: string): Promise<string> {
    const existing = this.objectUrls.get(fileName);
    if (existing) return existing;
    const inflight = this.blobPromises.get(fileName);
    if (inflight) return inflight;

    const promise = (async () => {
      const blob = await fetchAudioBlob(fileName);
      const objectUrl = URL.createObjectURL(blob);
      cacheObjectUrl(this.objectUrls, fileName, objectUrl);
      return objectUrl;
    })();

    this.blobPromises.set(fileName, promise);
    try {
      return await promise;
    } finally {
      this.blobPromises.delete(fileName);
    }
  }

  public async preload(audioFileNames: (string | undefined)[]): Promise<void> {
    return preloadAudioFiles(
      audioFileNames,
      this.audioContext,
      this.buffers,
      this.fetchPromises,
      this.objectUrls,
      this.blobPromises,
      (fileName) => this.getAudioObjectUrl(fileName),
    );
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
        (audio) => { this.activeBlobAudio = audio; },
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
    if (!overlap || !tail || !spare || this.rangeRafHandle !== null || this.currentSource || this.currentUtterance) {
      this.pause();
      return;
    }
    if (!tail.paused && !tail.ended) {
      silenceAudio(spare);
      [this.globalAudio, this.spareAudio] = [spare, tail];
    }
    this.activeBlobAudio = null;
    this.activePlaybackFinish?.();
    this.activePlaybackFinish = null;
  }

  public pause(): void {
    if (this.spareAudio) silenceAudio(this.spareAudio);
    if (this.rangeRafHandle !== null) {
      try { cancelAnimationFrame(this.rangeRafHandle); } catch (e) { debugLogger.warn('Audio', 'cancelAnimationFrame failed', e); }
      this.rangeRafHandle = null;
    }
    const source = this.currentSource;
    this.currentSource = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch (e) { debugLogger.warn('Audio', 'AudioBufferSourceNode stop failed', e); }
      try { source.disconnect(); } catch (e) { debugLogger.warn('Audio', 'AudioBufferSourceNode disconnect failed', e); }
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
      blobAudio.onended = null;
      blobAudio.onerror = null;
      try { blobAudio.pause(); } catch (e) { debugLogger.warn('Audio', 'Blob audio pause failed', e); }
    }

    if (this.currentUtterance) {
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
    if (this.globalAudio) {
      return this.globalAudio.currentTime;
    }
    return 0;
  }

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

  public play(
    audioFileName?: string,
    playbackRate = 1.0,
    textFallback?: string,
    preferredVoice?: string,
    startTime = 0,
    options?: { overlap?: boolean },
  ): Promise<void> {
    this.beginPlayback(options?.overlap === true);
    const textToSpeak = textFallback
      || (audioFileName && !this.isAudioFileName(audioFileName) ? audioFileName : undefined);

    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      const startSpeechFallback = () => {
        if (textToSpeak) {
          const fallbackVoice = preferredVoice || 'zh-CN-XiaoxiaoNeural';
          const fallbackLocale = fallbackVoice.startsWith('zh-TW') ? 'zh-TW' : 'zh-CN';
          playNeuralAudio(
            textToSpeak,
            fallbackVoice,
            playbackRate,
            () => this.activePlaybackFinish === finish,
            finish,
            () => void this.startSpeech(textToSpeak, fallbackLocale, 0.86, finish, true),
            (audio) => { this.activeBlobAudio = audio; },
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
      const handleAudioFailure = () => {
        if (fallbackStarted || this.activePlaybackFinish !== finish) return;
        fallbackStarted = true;
        try { audio.pause(); } catch (e) { debugLogger.warn('Audio', 'Pause on audio failure failed', e); }
        startSpeechFallback();
      };

      const isRemoteUrl = /^https?:\/\//i.test(audioFileName);
      if (isRemoteUrl) {
        playHtmlAudio(audio, audioFileName, playbackRate, finish, handleAudioFailure, startTime);
      } else {
        const existingUrl = this.objectUrls.get(audioFileName);
        if (existingUrl) {
          playHtmlAudio(audio, existingUrl, playbackRate, finish, handleAudioFailure, startTime);
        } else {
          this.getAudioObjectUrl(audioFileName)
            .then((url) => playHtmlAudio(audio, url, playbackRate, finish, handleAudioFailure, startTime))
            .catch(handleAudioFailure);
        }
      }
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
        finish();
        return;
      }

      const runRange = (src: string) => {
        playRangeOnAudioElement(
          audio,
          src,
          startSec,
          endSec,
          options,
          finish,
          (handle) => { this.rangeRafHandle = handle; },
        );
      };

      const existingUrl = this.objectUrls.get(audioFileName);
      if (existingUrl) {
        runRange(existingUrl);
      } else {
        this.getAudioObjectUrl(audioFileName)
          .then(runRange)
          .catch(() => finish());
      }
    });
  }

  public setPlaybackRate(rate: number): void {
    const validRate = rate > 0 ? rate : 1;
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
