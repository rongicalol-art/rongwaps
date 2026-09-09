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
  playBufferSource,
  playHtmlAudio,
  playRangeOnAudioElement,
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

  public initialize(): void {
    if (this.isInitialized) return;
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try { this.audioContext.resume().catch(() => {}); } catch { /* ignore */ }
    }
    if (this.globalAudio) {
      try {
        this.globalAudio.src = 'data:audio/mp3;base64,//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB';
        this.globalAudio.play()?.catch(() => {});
      } catch { /* ignore */ }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      void ensureSpeechVoices();
    }
    this.isInitialized = true;
  }

  private async getAudioObjectUrl(fileName: string): Promise<string> {
    const existing = this.objectUrls.get(fileName);
    if (existing) return existing;
    const blob = await fetchAudioBlob(fileName);
    const objectUrl = URL.createObjectURL(blob);
    cacheObjectUrl(this.objectUrls, fileName, objectUrl);
    return objectUrl;
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

  public stop(): void {
    if (this.rangeRafHandle !== null) {
      try { cancelAnimationFrame(this.rangeRafHandle); } catch { /* ignore */ }
      this.rangeRafHandle = null;
    }
    const source = this.currentSource;
    this.currentSource = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch { /* ignore */ }
      try { source.disconnect(); } catch { /* ignore */ }
    }

    if (this.globalAudio) {
      this.globalAudio.onended = null;
      this.globalAudio.onerror = null;
      this.globalAudio.ontimeupdate = null;
      try {
        this.globalAudio.pause();
        this.globalAudio.currentTime = 0;
      } catch { /* ignore */ }
    }

    const blobAudio = this.activeBlobAudio;
    this.activeBlobAudio = null;
    if (blobAudio) {
      blobAudio.onended = null;
      blobAudio.onerror = null;
      try { blobAudio.pause(); } catch { /* ignore */ }
    }

    if (this.currentUtterance) {
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance = null;
    }
    if (typeof window !== 'undefined') {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    }

    const finish = this.activePlaybackFinish;
    this.activePlaybackFinish = null;
    finish?.();
  }

  public getGlobalAudio(): HTMLAudioElement | null {
    return this.globalAudio;
  }

  public getCurrentTime(): number {
    if (this.globalAudio && !this.globalAudio.paused) {
      return this.globalAudio.currentTime;
    }
    return 0; // Or whatever fallback
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

  public play(audioFileName?: string, playbackRate = 1.0, textFallback?: string): Promise<void> {
    this.stop();
    const textToSpeak = textFallback
      || (audioFileName && !this.isAudioFileName(audioFileName) ? audioFileName : undefined);

    return new Promise((resolve) => {
      const finish = this.trackPlayback(resolve);
      const startSpeechFallback = () => {
        if (textToSpeak) {
          playNeuralAudio(
            textToSpeak,
            'zh-CN-XiaoxiaoNeural',
            playbackRate,
            () => this.activePlaybackFinish === finish,
            finish,
            () => void this.startSpeech(textToSpeak, 'zh-CN', 0.86, finish, true),
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

      if (this.audioContext && this.buffers.has(audioFileName)) {
        try {
          this.currentSource = playBufferSource(
            this.audioContext,
            this.buffers.get(audioFileName)!,
            playbackRate,
            () => {
              this.currentSource = null;
              finish();
            },
          );
          return;
        } catch (error) {
          this.currentSource = null;
          console.warn('Web Audio playback failed, trying HTML audio', error);
        }
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
        try { audio.pause(); } catch { /* ignore */ }
        startSpeechFallback();
      };

      const isRemoteUrl = /^https?:\/\//i.test(audioFileName);
      if (isRemoteUrl) {
        playHtmlAudio(audio, audioFileName, playbackRate, finish, handleAudioFailure);
      } else {
        const existingUrl = this.objectUrls.get(audioFileName);
        if (existingUrl) {
          playHtmlAudio(audio, existingUrl, playbackRate, finish, handleAudioFailure);
        } else {
          this.getAudioObjectUrl(audioFileName)
            .then((url) => playHtmlAudio(audio, url, playbackRate, finish, handleAudioFailure))
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
    this.stop();
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
    if (this.globalAudio) {
      this.globalAudio.defaultPlaybackRate = validRate;
      this.globalAudio.playbackRate = validRate;
    }
    if (this.activeBlobAudio) {
      this.activeBlobAudio.defaultPlaybackRate = validRate;
      this.activeBlobAudio.playbackRate = validRate;
    }
  }
}

export const audioService = new AudioService();
