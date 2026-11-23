import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The reading part's clock. It runs only while `running` (a reading question is on screen), starts from the time
 * already used, and calls `onUp` once when the limit is reached. `usedMs()` is the time used right now, for saving.
 */
export function useReadingClock(running: boolean, startMs: number, limitMs: number, onUp: (usedMs: number) => void) {
  const base = useRef(startMs);
  const since = useRef<number | null>(null);
  const up = useRef(onUp);
  up.current = onUp;
  const [leftMs, setLeftMs] = useState(Math.max(0, limitMs - startMs));
  const usedMs = () => base.current + (since.current === null ? 0 : Date.now() - since.current);
  const used = useRef(usedMs);
  used.current = usedMs;

  useEffect(() => {
    if (!running) return undefined;
    since.current = Date.now();
    const tick = () => {
      const left = limitMs - used.current();
      setLeftMs(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(timer);
        up.current(limitMs);
      }
    };
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(timer);
      base.current = used.current();
      since.current = null;
    };
  }, [limitMs, running]);

  return { leftMs, usedMs: useCallback(() => used.current(), []) };
}

/** "58:07". */
export function clockText(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
