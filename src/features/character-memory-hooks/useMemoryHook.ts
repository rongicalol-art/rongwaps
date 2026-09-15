import { useEffect, useRef, useState } from 'react';
import { getCachedMnemonic } from '../../services/mnemonicCache';
import { normalizeMnemonic } from './hookText';

export interface MemoryHookState {
  /** undefined while loading, null when no hook exists. */
  hook: string | null | undefined;
  loaded: boolean;
}

/**
 * Reads one pre-generated memory hook from the cache (pack-first, database
 * fallback). Nothing is generated on the spot. `enabled` gates the fetch so
 * callers can prefetch on intent (hover/focus) or on mount.
 */
export function useMemoryHook(cacheKey: string, enabled: boolean): MemoryHookState {
  const [hook, setHook] = useState<string | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const requestedRef = useRef<string | null>(null);

  useEffect(() => {
    setHook(undefined);
    setLoaded(false);
    requestedRef.current = null;
  }, [cacheKey]);

  useEffect(() => {
    if (!enabled) return;
    if (requestedRef.current === cacheKey) return;
    requestedRef.current = cacheKey;
    let cancelled = false;
    void getCachedMnemonic(cacheKey).then((raw) => {
      if (cancelled) return;
      setHook(normalizeMnemonic(raw));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, cacheKey]);

  return { hook, loaded };
}
