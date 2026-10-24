import { debugLogger } from '../../utils/debug/debugLogger';

export interface PlayRangeOptions {
  rate?: number;
  onTime?: (time: number) => void;
  onUnavailable?: () => void;
  onComplete?: () => void;
  /** Set false when the range source is a large track that should stream only. */
  cacheOnComplete?: boolean;
}

const AUDIO_START_TIMEOUT_MS = 2500;
const AUDIO_STALL_TIMEOUT_MS = 2500;

/** Decode the current cached clip during visible preparation, before the learner taps Play. */
export function prepareAudioElement(audio: HTMLAudioElement, src: string, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  if (audio.src === src && audio.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      audio.removeEventListener('canplay', ready);
      audio.removeEventListener('error', fail);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve();
    };
    const ready = () => { if (audio.readyState >= 2) finish(); };
    const fail = () => finish(new Error('Recording could not be decoded'));
    const abort = () => finish(new DOMException('Aborted', 'AbortError'));
    const deadline = setTimeout(() => finish(new Error('Recording preparation timed out')), 2000);
    audio.addEventListener('canplay', ready);
    audio.addEventListener('error', fail);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      audio.preload = 'auto';
      if (audio.src !== src) { audio.src = src; audio.load?.(); }
      ready();
    } catch { fail(); }
    if (signal?.aborted) abort();
  });
}

interface AudioProgressWatch {
  markStarted: () => void;
  stop: () => void;
}

/** Give remote audio a short chance to start, then release the caller to fallback audio. */
function watchAudioProgress(
  audio: HTMLAudioElement,
  onTimeout: () => void,
  startTimeoutMs = AUDIO_START_TIMEOUT_MS,
  stallTimeoutMs = AUDIO_STALL_TIMEOUT_MS,
): AudioProgressWatch {
  let started = false;
  let waiting = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  function markPlaying() {
    if (stopped) return;
    waiting = false;
    started = true;
    clearTimer();
  }
  function markStarted() {
    if (stopped) return;
    started = true;
    clearTimer();
    if (waiting) {
      timer = setTimeout(timeout, stallTimeoutMs);
    }
  }
  function markWaiting() {
    if (stopped) return;
    waiting = true;
    if (!started || timer !== null) return;
    timer = setTimeout(timeout, stallTimeoutMs);
  }
  function detach() {
    if (typeof audio.removeEventListener !== 'function') return;
    audio.removeEventListener('playing', markPlaying);
    audio.removeEventListener('waiting', markWaiting);
    audio.removeEventListener('stalled', markWaiting);
  }
  function stop() {
    stopped = true;
    clearTimer();
    detach();
  }
  function timeout() {
    if (stopped) return;
    stop();
    onTimeout();
  }

  if (typeof audio.addEventListener === 'function') {
    audio.addEventListener('playing', markPlaying);
    audio.addEventListener('waiting', markWaiting);
    audio.addEventListener('stalled', markWaiting);
  }
  timer = setTimeout(timeout, startTimeoutMs);
  return { markStarted, stop };
}

function playbackTimeoutError(): Error {
  const error = new Error('Audio did not start in time');
  error.name = 'TimeoutError';
  return error;
}

/**
 * Runs `start` once the current frame is painted. iOS Safari loads and starts a clip synchronously, so starting it
 * inside a tap held the tap's visual response until the audio began. Hidden pages (no frames) start at once.
 */
export function afterPaint(start: () => void): void {
  if (typeof requestAnimationFrame !== 'function' || typeof document === 'undefined' || document.visibilityState !== 'visible') {
    start();
    return;
  }
  requestAnimationFrame(() => { setTimeout(start, 0); });
}

export function silenceAudio(audio: HTMLAudioElement): void {
  audio.onended = null;
  audio.onerror = null;
  audio.ontimeupdate = null;
  try {
    if (!audio.paused) audio.pause();
  } catch (err) {
    debugLogger.warn('Audio', 'Audio pause failed', err);
  }
}

export function playHtmlAudio(
  audio: HTMLAudioElement,
  src: string,
  playbackRate: number,
  onEnd: () => void,
  onError: (err?: unknown) => void,
  startTime = 0,
): () => void {
  let settled = false;
  let progressWatch: AudioProgressWatch | null = null;
  let metadataSeek: (() => void) | null = null;
  const cleanup = () => {
    if (settled) return;
    settled = true;
    progressWatch?.stop();
    if (metadataSeek) audio.removeEventListener?.('loadedmetadata', metadataSeek);
    metadataSeek = null;
    audio.onended = null;
    audio.onerror = null;
  };
  const fail = (error?: unknown) => {
    if (settled) return;
    cleanup();
    onError(error);
  };

  try {
    // Preserve pitch across all browsers for natural Mandarin tone contour
    audio.preservesPitch = true;
    (audio as unknown as { mozPreservesPitch?: boolean }).mozPreservesPitch = true;
    (audio as unknown as { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;

    if (audio.src !== src && !audio.src.endsWith(src)) {
      audio.src = src;
    }
    const rate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1;
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
    startTime = Number.isFinite(startTime) ? Math.max(0, startTime) : 0;
    if (audio.readyState < 1 && startTime > 0) {
      metadataSeek = () => {
        metadataSeek = null;
        try { audio.currentTime = startTime; } catch (error) { fail(error); }
      };
      audio.addEventListener?.('loadedmetadata', metadataSeek, { once: true });
    }
    if (startTime > 0 && Math.abs(audio.currentTime - startTime) > 0.05) {
      try {
        audio.currentTime = startTime;
      } catch (err) {
        // Graceful degradation: seek before metadata loaded is tolerated
        debugLogger.warn('Audio', 'HTMLAudioElement seek to startTime failed', err);
      }
    } else if (startTime === 0 && Math.abs(audio.currentTime) > 0.05) {
      try {
        audio.currentTime = 0;
      } catch (err) {
        // Graceful degradation: seek to origin before metadata loaded is tolerated
        debugLogger.warn('Audio', 'HTMLAudioElement reset to 0 failed', err);
      }
    }
    audio.onended = () => {
      if (settled) return;
      cleanup();
      onEnd();
    };
    audio.onerror = () => fail(new Error('Audio could not be loaded'));
    // Replacing src queues abort/emptied for the previous resource. Those
    // events are not failures of this play; actual cancellation rejects play().

    progressWatch = watchAudioProgress(audio, () => fail(playbackTimeoutError()));

    const playPromise = audio.play();
    playPromise?.then(() => progressWatch?.markStarted()).catch((err: unknown) => {
      fail(err);
    });
  } catch (error) {
    fail(error);
  }

  return cleanup;
}

export function playRangeOnAudioElement(
  audio: HTMLAudioElement,
  src: string,
  startSec: number,
  endSec: number,
  options: PlayRangeOptions | undefined,
  onFinish: (ended?: boolean) => void,
  onRafHandle: (handle: number | null) => void,
): () => void {
  const start = Math.max(0, startSec);
  const end = Math.max(start + 0.05, endSec);
  const rate = options?.rate && Number.isFinite(options.rate) && options.rate > 0 ? options.rate : 1;
  const onTime = options?.onTime;

  let settled = false;
  let rafHandle: number | null = null;
  let progressWatch: AudioProgressWatch | null = null;
  let loadedMetadataListener: (() => void) | null = null;

  const cleanup = (ended = false) => {
    if (settled) return;
    settled = true;
    progressWatch?.stop();
    if (loadedMetadataListener) {
      audio.removeEventListener?.('loadedmetadata', loadedMetadataListener);
      loadedMetadataListener = null;
    }
    audio.ontimeupdate = null;
    audio.onended = null;
    audio.onerror = null;
    if (rafHandle !== null) {
      try {
        if (typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(rafHandle);
        }
      } catch (err) {
        // Graceful degradation: RAF handle already cancelled or window unavailable
        debugLogger.warn('Audio', 'cancelAnimationFrame failed during audio cleanup', err);
      }
      rafHandle = null;
      onRafHandle(null);
    }
    onFinish(ended);
  };
  const fail = () => {
    if (settled) return;
    options?.onUnavailable?.();
    try { audio.pause(); } catch { /* playback is already unavailable */ }
    cleanup();
  };
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec <= start) {
    fail();
    return cleanup;
  }

  let lastReportedTime = -1;
  let lastReportedTimestamp = -Infinity;

  const reportTime = (time: number) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Keep exact range-end checks on every frame, but publish React time at most
    // ten times per second. A seek is reported immediately.
    if (Math.abs(time - lastReportedTime) >= 0.5 || (time !== lastReportedTime && now - lastReportedTimestamp >= 100)) {
      lastReportedTime = time;
      lastReportedTimestamp = now;
      onTime?.(time);
    }
  };

  try {
    // Only assign src if changing, to avoid dumping decoded audio buffer
    if (audio.src !== src && !audio.src.endsWith(src)) {
      audio.src = src;
    }
    if (typeof audio.addEventListener === 'function' && audio.readyState < 1) {
      loadedMetadataListener = () => {
        loadedMetadataListener = null;
        try {
          audio.currentTime = start;
        } catch (err) {
          // Graceful degradation: loadedmetadata seek failed
          debugLogger.warn('Audio', 'loadedmetadata currentTime assignment failed', err);
        }
      };
      audio.addEventListener('loadedmetadata', loadedMetadataListener, { once: true });
    }

    audio.preservesPitch = true;
    (audio as unknown as { mozPreservesPitch?: boolean }).mozPreservesPitch = true;
    (audio as unknown as { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;

    if (Math.abs(audio.currentTime - start) > 0.04) {
      try {
        audio.currentTime = start;
      } catch (err) {
        // Graceful degradation: immediate seek failed, handled by loadedmetadata listener
        debugLogger.warn('Audio', 'Immediate currentTime assignment failed', err);
      }
    }

    audio.onerror = fail;
    audio.onended = () => cleanup(true);

    // Long official book tracks may have a slow first byte over CDN/mobile
    // networks; vocabulary clips keep the shorter fallback deadline.
    progressWatch = watchAudioProgress(audio, () => {
      try {
        audio.pause();
        audio.src = '';
        audio.load?.();
      } catch (err) {
        debugLogger.warn('Audio', 'Could not cancel stalled range audio', err);
      }
      fail();
    }, 10_000, 10_000);

    const raf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : null;

    audio.ontimeupdate = () => {
      if (audio.seeking) return;
      if (!raf) reportTime(audio.currentTime);
      if (audio.currentTime >= end) {
        try {
          audio.pause();
        } catch (err) {
          // Graceful degradation: pause after range end
          debugLogger.warn('Audio', 'Pause at range end failed', err);
        }
        cleanup(true);
      }
    };

    const playPromise = audio.play();
    playPromise?.catch((err) => {
      if (err) fail();
    });

    playPromise?.then(() => {
      if (!settled) {
        progressWatch?.markStarted();
        if (raf) {
          const tick = () => {
            if (settled) return;
            rafHandle = null;
            onRafHandle(null);

            if (audio.seeking) {
              rafHandle = raf(tick);
              onRafHandle(rafHandle);
              return;
            }

            const time = audio.currentTime;
            reportTime(time);
            if (time >= end) {
              try {
                audio.pause();
              } catch (err) {
                // Graceful degradation: pause in RAF loop after range end
                debugLogger.warn('Audio', 'Pause at range end in RAF loop failed', err);
              }
              cleanup(true);
              return;
            }
            rafHandle = raf(tick);
            onRafHandle(rafHandle);
          };
          rafHandle = raf(tick);
          onRafHandle(rafHandle);
        }
      }
    }).catch(() => {});
  } catch {
    fail();
  }

  return cleanup;
}
