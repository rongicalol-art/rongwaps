import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { PreloadedModule } from '../utils/browser/preloadAssets';

/** Under this, the next screen is effectively instant: no loading state flashes on the button. */
const SHOW_LOADING_AFTER_MS = 150;
/** After this the screen opens anyway and shows its own loader, so the button never feels stuck (owner: 4 s, 2026-11-01). */
const GIVE_UP_AFTER_MS = 4000;

/**
 * Press → get the next screen ready → open it. While `prepare` runs, `pendingKey` names what
 * is opening so its button can show the loading state (`ActionButton loading`). Presses while
 * one is running are ignored; nothing opens if the component unmounts first.
 */
export function useReadyAction<K = true>() {
  const [pendingKey, setPendingKey] = useState<K | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(async (prepare: () => Promise<unknown>, open: () => void, key?: K) => {
    if (running.current) return;
    running.current = true;
    const showTimer = window.setTimeout(() => setPendingKey(key ?? (true as K)), SHOW_LOADING_AFTER_MS);
    let giveUpTimer = 0;
    await Promise.race([
      prepare().catch(() => undefined),
      new Promise((resolve) => { giveUpTimer = window.setTimeout(resolve, GIVE_UP_AFTER_MS); }),
    ]);
    window.clearTimeout(showTimer);
    window.clearTimeout(giveUpTimer);
    running.current = false;
    if (!mounted.current) return;
    setPendingKey(null);
    open();
  }, []);

  return { pendingKey, run };
}

/** The module once it has loaded; starts the download if it has not (the give-up case) and re-renders on arrival. */
export function usePreloadedModule<T>(module: PreloadedModule<T>, enabled = true): T | undefined {
  const [, arrived] = useReducer((count: number) => count + 1, 0);
  const value = module.get();
  useEffect(() => {
    if (!enabled || value) return;
    let current = true;
    void module.load().then(() => { if (current) arrived(); }, () => {});
    return () => { current = false; };
  }, [enabled, module, value]);
  return value;
}
