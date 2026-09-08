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

  if (audio.src !== src) {
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
  try { audio.currentTime = start; } catch { /* ignore */ }
  audio.onerror = cleanup;
  audio.onended = cleanup;

  const raf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame.bind(window)
    : null;

  audio.ontimeupdate = () => {
    if (!raf) onTime?.(audio.currentTime);
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
      audio.currentTime = start;
      audio.playbackRate = rate;
      if (raf) {
        const tick = () => {
          if (settled) return;
          rafHandle = null;
          onRafHandle(null);
          const time = audio.currentTime;
          if (time < start - 0.05) {
            try { audio.currentTime = start; } catch { /* ignore */ }
            rafHandle = raf(tick);
            onRafHandle(rafHandle);
            return;
          }
          onTime?.(time);
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
