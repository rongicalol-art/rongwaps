export interface FrameBudgetReport {
  targetHz: number;
  sampleCount: number;
  averageCadenceHz: number;
  p95GapMs: number;
  worstGapMs: number;
  lateFrames: number;
  longFrames: number;
  passed: boolean;
}
/** rAF cadence measures main-thread opportunity to draw, not GPU presentation. */
export function summarizeFrameBudget(gaps: readonly number[], targetHz: number): FrameBudgetReport {
  if (!Number.isFinite(targetHz) || targetHz <= 0) throw new RangeError('Display refresh rate must be positive.');
  const values = gaps.filter((gap) => Number.isFinite(gap) && gap > 0).sort((a, b) => a - b);
  const budget = 1000 / targetHz;
  const p95GapMs = values[Math.max(0, Math.ceil(values.length * 0.95) - 1)] ?? 0;
  const lateFrames = values.filter((gap) => gap > budget * 1.5).length;
  const longFrames = values.filter((gap) => gap > 50).length;
  return {
    targetHz, sampleCount: values.length,
    averageCadenceHz: values.length ? values.length * 1000 / values.reduce((sum, gap) => sum + gap, 0) : 0,
    p95GapMs, worstGapMs: values.at(-1) ?? 0, lateFrames, longFrames,
    passed: values.length > 0 && p95GapMs <= budget * 1.5 && longFrames === 0,
  };
}
