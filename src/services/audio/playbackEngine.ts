export interface PlayRangeOptions {
  rate?: number;
  onTime?: (time: number) => void;
}

export function playBufferSource(
  audioContext: AudioContext,
  buffer: AudioBuffer,
  playbackRate: number,
  onEnd: () => void,
): AudioBufferSourceNode {
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  source.connect(audioContext.destination);
  source.onended = () => {
    try { source.disconnect(); } catch { /* ignore */ }
    onEnd();
  };
  source.start(0);
  return source;
}

export function playHtmlAudio(
  audio: HTMLAudioElement,
  src: string,
  playbackRate: number,
  onEnd: () => void,
  onError: (err?: unknown) => void,
): void {
  try {
    audio.src = src;
    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    audio.onended = () => {
      audio.onended = null;
      audio.onerror = null;
      onEnd();
    };
    audio.onerror = () => onError();

    const playPromise = audio.play();
    playPromise?.catch(onError);
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
      } catch { /* ignore */ }
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

  if (audio.src !== src && !audio.src.endsWith(src)) {
    audio.src = src;
    if (typeof audio.addEventListener === 'function' && audio.readyState < 1) {
      audio.addEventListener('loadedmetadata', () => {
        try { audio.currentTime = start; } catch { /* ignore */ }
        audio.playbackRate = rate;
      }, { once: true });
    }
  }

  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
  try {
    if (Math.abs(audio.currentTime - start) > 0.05) {
      audio.currentTime = start;
    }
  } catch { /* ignore */ }
  audio.onerror = cleanup;
  audio.onended = cleanup;

  const raf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : null;

  audio.ontimeupdate = () => {
    if (!raf) reportTime(audio.currentTime);
    if (audio.currentTime >= end) {
      audio.pause();
      cleanup();
    }
  };

  const playPromise = audio.play();
  playPromise?.catch((err) => {
    if (err?.name !== 'AbortError') cleanup();
  });

  playPromise?.then(() => {
    if (!settled) {
      try {
        if (Math.abs(audio.currentTime - start) > 0.08) {
          audio.currentTime = start;
        }
      } catch { /* ignore */ }
      audio.playbackRate = rate;
      if (raf) {
        const tick = () => {
          if (settled) return;
          rafHandle = null;
          onRafHandle(null);
          const time = audio.currentTime;
          if (time < start - 0.15) {
            try { audio.currentTime = start; } catch { /* ignore */ }
            rafHandle = raf(tick);
            onRafHandle(rafHandle);
            return;
          }
          reportTime(time);
          if (time >= end) {
            audio.pause();
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
