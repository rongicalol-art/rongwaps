import { debugLogger } from '../../utils/debug/debugLogger';

let speechVoicesCache: SpeechSynthesisVoice[] | null = null;
let speechVoicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
const speechCleanups = new WeakMap<SpeechSynthesisUtterance, () => void>();

export function releaseSpeechUtterance(utterance: SpeechSynthesisUtterance): void {
  speechCleanups.get(utterance)?.();
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
    // Never pause()/resume() to "kickstart" speech: it crashes Mac Chrome (TTSExecutor assert).
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    if (utterance) releaseSpeechUtterance(utterance);
    onUtteranceChange(null);
    debugLogger.warn('Audio', 'SpeechSynthesis playback failed:', error);
    finish();
  }
}
