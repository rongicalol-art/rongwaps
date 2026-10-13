/** Wait briefly before showing a loader; ready content always appears immediately. */
export type OpenPhase = 'hold' | 'loading' | 'ready';
export type OpenStage = 'hold' | 'loader';

export const HOLD_MS = 150;

export function derivePhase(ready: boolean, stage: OpenStage): OpenPhase {
  if (ready) return 'ready';
  return stage === 'hold' ? 'hold' : 'loading';
}

/** ms until the loader should appear, or null when nothing is pending. */
export function nextStageDelay(ready: boolean, stage: OpenStage, elapsed: number): number | null {
  return !ready && stage === 'hold' ? Math.max(0, HOLD_MS - elapsed) : null;
}
