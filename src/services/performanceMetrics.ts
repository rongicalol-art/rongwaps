import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { summarizeFrameBudget, type FrameBudgetReport } from '../utils/browser/frameBudget';

type VitalName = 'LCP' | 'INP' | 'CLS';
const vitals: Partial<Record<VitalName, { value: number; rating: string }>> = {};
let started = false;
export function startVitalsMonitoring(): void {
  if (started) return;
  started = true;
  const record = (metric: Metric) => { vitals[metric.name as VitalName] = { value: metric.value, rating: metric.rating }; };
  // Aggregate values only: no identifiers or entries. A single anonymous "poor" note goes out below.
  onLCP(record, { reportAllChanges: true });
  onINP(record, { reportAllChanges: true });
  onCLS(record, { reportAllChanges: true });
  // When the page is left, report once if any vital was "poor": the signal for real slow phones.
  let reported = false;
  document.addEventListener('visibilitychange', () => {
    if (reported || document.visibilityState !== 'hidden') return;
    const poor = (Object.entries(vitals) as Array<[VitalName, { value: number; rating: string }]>).filter(([, vital]) => vital.rating === 'poor');
    if (!poor.length) return;
    reported = true;
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? 'unknown';
    const summary = poor.map(([name, vital]) => `${name} ${Math.round(vital.value)}`).join(', ');
    void import('./errorReporting').then((m) => m.reportPoorPerformance(summary, { connection, ...Object.fromEntries(poor.map(([name]) => [`poor_${name}`, 'true'])) }));
  });
}

export interface FrameCapture extends FrameBudgetReport {
  aborted: boolean;
  elapsedMs: number;
  blockingMs: number | null;
  forcedLayoutMs: number | null;
  observerType: string | null;
}
let lastCapture: FrameCapture | null = null;
let activeCapture: Promise<FrameCapture> | null = null;
export const getPerformanceReport = () => ({ vitals: { ...vitals }, frameCapture: lastCapture });

/** Sampling runs only during an explicit diagnostic recording, never at idle. */
export function captureFrames(targetHz = 60, durationMs = 8000): Promise<FrameCapture> {
  if (activeCapture) return activeCapture;
  activeCapture = new Promise<FrameCapture>((resolve) => {
    const gaps: number[] = [];
    const start = performance.now();
    let previous: number | null = null;
    let frame = 0;
    let done = false;
    let blockingMs = 0;
    let forcedLayoutMs = 0;
    const observerType = PerformanceObserver.supportedEntryTypes.includes('long-animation-frame') ? 'long-animation-frame'
      : PerformanceObserver.supportedEntryTypes.includes('longtask') ? 'longtask' : null;
    const consume = (entries: PerformanceEntry[]) => {
      for (const entry of entries) {
        const detail = entry as PerformanceEntry & { blockingDuration?: number; scripts?: Array<{ forcedStyleAndLayoutDuration?: number }> };
        blockingMs += detail.blockingDuration ?? Math.max(0, entry.duration - 50);
        forcedLayoutMs += detail.scripts?.reduce((sum, script) => sum + (script.forcedStyleAndLayoutDuration ?? 0), 0) ?? 0;
      }
    };
    const observer = observerType ? new PerformanceObserver((list) => consume(list.getEntries())) : null;
    observer?.observe({ type: observerType!, buffered: false });
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      if (observer) { consume(observer.takeRecords()); observer.disconnect(); }
      const summary = summarizeFrameBudget(gaps, targetHz);
      lastCapture = {
        ...summary, passed: summary.passed && !document.hidden, aborted: document.hidden,
        elapsedMs: performance.now() - start, observerType,
        blockingMs: observerType ? blockingMs : null,
        forcedLayoutMs: observerType === 'long-animation-frame' ? forcedLayoutMs : null,
      };
      resolve(lastCapture);
    };
    const onVisibility = () => { if (document.hidden) finish(); };
    const tick = (now: number) => {
      if (previous !== null && gaps.length < 4096) gaps.push(now - previous);
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = setTimeout(finish, Math.min(10000, Math.max(1000, durationMs)));
    if (document.hidden) finish();
    else frame = requestAnimationFrame(tick);
  }).finally(() => { activeCapture = null; });
  return activeCapture;
}
