/**
 * Timing rule behind every "open when ready" window. Pure so it can be tested
 * without timers; `useOpenPhase` drives the stage with timers.
 *
 *   hold     nothing new is shown for up to HOLD_MS (the previous frame stays)
 *   loading  ONE loader, kept for at least MIN_LOADER_MS so it never flickers
 *   ready    content
 *
 * Ready at mount or within the hold window skips the loader entirely.
 */
export type OpenPhase = 'hold' | 'loading' | 'ready';
/** Where the timers have got to: waiting, loader on screen, loader's minimum time served. */
export type OpenStage = 'hold' | 'loader' | 'served';

export const HOLD_MS = 150;
export const MIN_LOADER_MS = 450;

export function derivePhase(ready: boolean, stage: OpenStage): OpenPhase {
  if (stage === 'loader') return 'loading';
  if (ready) return 'ready';
  return stage === 'hold' ? 'hold' : 'loading';
}

/** ms until the stage should advance, or null when nothing is pending. */
export function nextStageDelay(ready: boolean, stage: OpenStage, loaderShownFor: number, elapsed: number): number | null {
  if (stage === 'hold') return ready ? null : Math.max(0, HOLD_MS - elapsed);
  if (stage === 'loader' && ready) return Math.max(0, MIN_LOADER_MS - loaderShownFor);
  return null;
}
