import { debugLogger } from '../../utils/debugLogger';

export interface PlayRangeOptions {
  rate?: number;
  onTime?: (time: number) => void;
}

export function playHtmlAudio(
  audio: HTMLAudioElement,
  src: string,
  playbackRate: number,
  onEnd: () => void,
  onError: (err?: unknown) => void,
  startTime = 0,
): void {
  try {
    // Preserve pitch across all browsers for natural Mandarin tone contour
    audio.preservesPitch = true;
    (audio as unknown as { mozPreservesPitch?: boolean }).mozPreservesPitch = true;
    (audio as unknown as { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;

    if (audio.src !== src && !audio.src.endsWith(src)) {
      audio.src = src;
    }
    audio.defaultPlaybackRate = playbackRate;
    audio.playbackRate = playbackRate;
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
      audio.onended = null;
      audio.onerror = null;
      onEnd();
    };
    audio.onerror = () => onError();

    const playPromise = audio.play();
    playPromise?.catch((err: unknown) => {
      // Interrupted play (pause or subsequent play) is normal lifecycle, not an error
      if ((err as Error)?.name === 'AbortError') {
        return;
      }
      onError(err);
    });
  } catch (error) {
    onError(error);
  }
}

export function playRangeOnAudioElement(
  audio: HTMLAudioElement,
  src: string,
  startSec: number,
  endSec: number,
  options: PlayRangeOptions | undefined,
  onFinish: () => void,
  onRafHandle: (handle: number | null) => void,
): () => void {
  const start = Math.max(0, startSec);
  const end = Math.max(start + 0.05, endSec);
  const rate = options?.rate && options.rate > 0 ? options.rate : 1;
  const onTime = options?.onTime;

  let settled = false;
  let rafHandle: number | null = null;

  const cleanup = () => {
    if (settled) return;
    settled = true;
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
    onFinish();
  };

  let lastReportedTime = -1;
  let lastReportedTimestamp = 0;

  const reportTime = (time: number) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Report only if time shifted significantly (>40ms) or at least 50ms passed, to avoid 60fps React render storms
    if (Math.abs(time - lastReportedTime) >= 0.04 || now - lastReportedTimestamp >= 50) {
      lastReportedTime = time;
      lastReportedTimestamp = now;
      onTime?.(time);
    }
  };

  // Only assign src if changing, to avoid dumping decoded audio buffer
  if (audio.src !== src && !audio.src.endsWith(src)) {
    audio.src = src;
    if (typeof audio.addEventListener === 'function' && audio.readyState < 1) {
      audio.addEventListener('loadedmetadata', () => {
        try {
          audio.currentTime = start;
        } catch (err) {
          // Graceful degradation: loadedmetadata seek failed
          debugLogger.warn('Audio', 'loadedmetadata currentTime assignment failed', err);
        }
        audio.playbackRate = rate;
      }, { once: true });
    }
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

  audio.onerror = cleanup;
  audio.onended = cleanup;

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
      cleanup();
    }
  };

  const playPromise = audio.play();
  playPromise?.catch((err) => {
    if (err?.name !== 'AbortError') cleanup();
  });

  playPromise?.then(() => {
    if (!settled) {
      audio.playbackRate = rate;
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
            cleanup();
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

  return cleanup;
}
