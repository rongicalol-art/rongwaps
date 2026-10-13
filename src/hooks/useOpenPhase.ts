import { useEffect, useMemo, useRef, useState } from 'react';
import { whenFontReady } from '../utils/browser/fontWarmup';
import { derivePhase, nextStageDelay, type OpenPhase, type OpenStage } from '../utils/browser/openPhase';

/** Extra async readiness (fonts, chunks) a window waits for besides `ready`. Pass stable promises. */
type ReadyGate = Promise<unknown>;
const NO_GATES: readonly ReadyGate[] = [];

/** True once every gate in this exact `gates` array has settled; a new array starts waiting again. */
function useGatesSettled(gates: readonly ReadyGate[]): boolean {
  const [settledFor, setSettledFor] = useState<readonly ReadyGate[] | null>(null);
  useEffect(() => {
    if (gates.length === 0) return;
    let live = true;
    void Promise.allSettled(gates).then(() => { if (live) setSettledFor(gates); });
    return () => { live = false; };
  }, [gates]);
  return gates.length === 0 || settledFor === gates;
}

/** A stable gate that waits (max 300ms) for the Chinese font slices `text` needs; none while `text` is empty. */
export function useFontGate(text: string): readonly ReadyGate[] {
  return useMemo(() => (text ? [whenFontReady(text)] : NO_GATES), [text]);
}

/**
 * The single "open when ready" rule: hold briefly, then at most one loader shown
 * only while waiting, then content (see `utils/browser/openPhase`).
 * `ready` true at first render yields 'ready' synchronously: no hold frame, no effect round-trip.
 * `resetKey` starts a fresh open (e.g. a different window target).
 */
export function useOpenPhase(ready: boolean, gates: readonly ReadyGate[] = NO_GATES, resetKey: string | number = 0): OpenPhase {
  const gatesSettled = useGatesSettled(gates);
  const effectiveReady = ready && gatesSettled;
  const [state, setState] = useState<{ key: string | number; stage: OpenStage }>({ key: resetKey, stage: 'hold' });
  if (state.key !== resetKey) setState({ key: resetKey, stage: 'hold' });
  const stage = state.key === resetKey ? state.stage : 'hold';

  const startedAt = useRef(0);
  useEffect(() => { startedAt.current = performance.now(); }, [resetKey]);

  useEffect(() => {
    const now = performance.now();
    const delay = nextStageDelay(effectiveReady, stage, now - startedAt.current);
    if (delay === null) return;
    const timer = setTimeout(() => setState({ key: resetKey, stage: 'loader' }), delay);
    return () => clearTimeout(timer);
  }, [effectiveReady, stage, resetKey]);

  return derivePhase(effectiveReady, stage);
}
