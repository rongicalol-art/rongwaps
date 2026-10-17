import { useEffect, useRef } from 'react';

/** Active foreground time only. Loading, hidden tabs and teaching overlays pause it. */
export function useStudyClock(paused: boolean, onTick?: (ms: number) => void) {
  const elapsed = useRef(0);
  const previous = useRef(Date.now());
  const pausedRef = useRef(paused);
  const onTickRef = useRef(onTick);
  pausedRef.current = paused;
  onTickRef.current = onTick;

  useEffect(() => {
    let active = !document.hidden && document.hasFocus();
    const tick = () => {
      const now = Date.now();
      const ms = Math.max(0, Math.min(2_000, now - previous.current));
      previous.current = now;
      if (active && !pausedRef.current) {
        elapsed.current += ms;
        onTickRef.current?.(ms);
      }
    };
    const update = () => { tick(); active = !document.hidden && document.hasFocus(); };
    const timer = window.setInterval(tick, 1_000);
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      tick(); window.clearInterval(timer);
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return elapsed;
}
