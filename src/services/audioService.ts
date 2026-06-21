import { supabase } from './supabaseClient';

export const AUDIO_BUCKET = 'vocabulary-audio';

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
class AudioService {
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
  private activeFallbackResolve: (() => void) | null = null;

  constructor() {
    // Only create Audio in browser environment
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      } else {
        this.globalAudio = new Audio();
      }
    }
  }

  // Should be called on first user click somewhere in the app to unlock the audio element on iOS
  public initialize() {
    if (this.isInitialized) return;
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    if (this.globalAudio) {
      this.globalAudio.src = 'data:audio/mp3;base64,//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB//OkwAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAB';
      this.globalAudio.play().catch(() => {});
    }
    
    this.isInitialized = true;
  }

  async preload(audioFileNames: (string | undefined)[]) {
    if (typeof window === 'undefined') return;

    const validNames = audioFileNames.filter(Boolean) as string[];
    const maxConcurrent = 3;
    const queue = [...validNames];

    const fetchAudioBlob = async (fileName: string): Promise<Blob> => {
      // Use the Supabase client's download method which handles auth properly
      const { data, error } = await supabase.storage.from(AUDIO_BUCKET).download(fileName);
      if (error || !data) {
        // Fallback to public URL fetch
        const { data: pubData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(fileName);
        const response = await fetch(pubData.publicUrl);
        if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
        return await response.blob();
      }
      return data;
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

  public speakTTS(text: string, rate: number = 1.0): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        return resolve();
      }

      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('speechSynthesis cancel failed', e);
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance; // Prevent GC
      utterance.lang = 'zh-CN';
      utterance.rate = rate;

      // Find best Chinese voice
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.startsWith('zh') || v.lang.includes('CN') || v.lang.includes('TW'));
      if (zhVoice) {
        utterance.voice = zhVoice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };
      
      utterance.onerror = (err) => {
        this.currentUtterance = null;
        console.warn('SpeechSynthesis error:', err);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  play(audioFileName?: string, playbackRate: number = 1.0, textFallback?: string): Promise<void> {
    const isChineseText = (text: string): boolean => {
      return /[\u4e00-\u9fa5]/.test(text);
    };

    const isProperAudioFile = (filename?: string): boolean => {
      if (!filename) return false;
      const lowercase = filename.toLowerCase();
      return lowercase.endsWith('.mp3') || 
             lowercase.endsWith('.wav') || 
             lowercase.endsWith('.ogg') || 
             lowercase.endsWith('.m4a') ||
             lowercase.startsWith('http://') ||
             lowercase.startsWith('https://');
    };

    const textToSpeak = textFallback || (audioFileName && isChineseText(audioFileName) && !isProperAudioFile(audioFileName) ? audioFileName : undefined);

    return new Promise(async (resolve) => {
      const handleTTSFallback = async () => {
        if (textToSpeak) {
          await this.speakTTS(textToSpeak, playbackRate);
        }
        resolve();
      };

      if (!audioFileName || !isProperAudioFile(audioFileName)) {
        return handleTTSFallback();
      }

      // 1. Play using Web Audio API (Zero Latency)
      if (this.audioContext) {
        if (this.currentSource) {
          try { this.currentSource.stop(); } catch (e) {}
        }
        
        const doWebAudioPlay = (buffer: AudioBuffer) => {
          if (!this.audioContext) return handleTTSFallback();
          // Ensure context is running (iOS interaction requirement)
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
          }
          
          const source = this.audioContext.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = playbackRate;
          source.connect(this.audioContext.destination);
          
          source.onended = () => resolve();
          source.start(0);
          this.currentSource = source;
        };

        if (this.buffers.has(audioFileName)) {
          doWebAudioPlay(this.buffers.get(audioFileName)!);
        } else if (this.fetchPromises.has(audioFileName)) {
          try {
            const buffer = await this.fetchPromises.get(audioFileName)!;
            doWebAudioPlay(buffer);
          } catch(err) {
            handleTTSFallback();
          }
        } else {
          // Fetch, decode, play using download() to avoid CORS issues
          const promise = (async () => {
            const { data, error } = await supabase.storage.from(AUDIO_BUCKET).download(audioFileName);
            if (error || !data) {
              // Fallback to public URL
              const { data: pubData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioFileName);
              const res = await fetch(pubData.publicUrl);
              if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
              const arrayBuffer = await res.arrayBuffer();
              const buffer = await this.audioContext!.decodeAudioData(arrayBuffer);
              this.buffers.set(audioFileName, buffer);
              return buffer;
            }
            const arrayBuffer = await data.arrayBuffer();
            const buffer = await this.audioContext!.decodeAudioData(arrayBuffer);
            this.buffers.set(audioFileName, buffer);
            return buffer;
          })();
          this.fetchPromises.set(audioFileName, promise);
          
          promise.then(buffer => doWebAudioPlay(buffer))
                 .catch(err => {
                    console.warn('Web Audio playback failed, trying TTS fallback', err);
                    this.fetchPromises.delete(audioFileName);
                    handleTTSFallback();
                 });
        }
        return;
      }

      // 2. Play using HTMLAudioElement Fallback
      if (!this.globalAudio) return handleTTSFallback();

      if (this.activeFallbackResolve) {
        this.activeFallbackResolve();
        this.activeFallbackResolve = null;
      }
      this.activeFallbackResolve = resolve;

      this.globalAudio.pause();
      this.globalAudio.onended = null;
      this.globalAudio.onerror = null;

      let src = this.objectUrls.get(audioFileName);

      const doPlay = (sourceUrl: string) => {
        if (!this.globalAudio) return handleTTSFallback();
        this.globalAudio.src = sourceUrl;
        this.globalAudio.playbackRate = playbackRate;
        this.globalAudio.currentTime = 0;
        
        this.globalAudio.onended = () => {
          if (this.activeFallbackResolve) {
            this.activeFallbackResolve();
            this.activeFallbackResolve = null;
          }
        };
        this.globalAudio.onerror = () => {
          console.warn('HTML Audio Element error, trying TTS');
          if (this.activeFallbackResolve) {
            this.activeFallbackResolve();
            this.activeFallbackResolve = null;
          }
          handleTTSFallback();
        };

        this.globalAudio.play().catch(err => {
          console.warn('Audio fallback playback failed, trying TTS fallback', err);
          if (this.activeFallbackResolve) {
            this.activeFallbackResolve();
            this.activeFallbackResolve = null;
          }
          handleTTSFallback();
        });
      };

      if (src) {
        doPlay(src);
      } else if (this.blobPromises.has(audioFileName)) {
        try {
          const resolvedSrc = await this.blobPromises.get(audioFileName)!;
          doPlay(resolvedSrc);
        } catch (err) {
          handleTTSFallback();
        }
      } else {
        // Use download() to avoid CORS issues, then create object URL
        const promise = (async () => {
          const { data, error } = await supabase.storage.from(AUDIO_BUCKET).download(audioFileName);
          if (error || !data) {
            // Fallback: use public URL directly (may fail due to CORS)
            const { data: pubData } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(audioFileName);
            return pubData.publicUrl;
          }
          const objectUrl = URL.createObjectURL(data);
          
          if (this.objectUrls.size > 50) {
            const firstKey = this.objectUrls.keys().next().value;
            if (firstKey) {
              const oldUrl = this.objectUrls.get(firstKey);
              if (oldUrl) URL.revokeObjectURL(oldUrl);
              this.objectUrls.delete(firstKey);
            }
          }
          
          this.objectUrls.set(audioFileName, objectUrl);
          return objectUrl;
        })();
        
        this.blobPromises.set(audioFileName, promise);
        
        // Try to play immediately while we cache
        promise.then(cachedSrc => doPlay(cachedSrc))
               .catch(() => {
                 this.blobPromises.delete(audioFileName);
                 handleTTSFallback();
               });
      }
    });
  }
}

export const audioService = new AudioService();
