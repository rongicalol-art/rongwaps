import { useState } from 'react';
import { captureFrames, getPerformanceReport } from '../../services/performanceMetrics';

export function PerformancePanel() {
  const [report, setReport] = useState(getPerformanceReport);
  const [recording, setRecording] = useState(false);
  const [targetHz, setTargetHz] = useState(60);
  return (
    <section className="flex flex-col gap-4 text-ui-ink">
      <p>Record, switch to UI Previews, replay a transition, then return here. rAF cadence is a main-thread signal, not a GPU FPS measurement. Values stay on this device.</p>
      <div className="flex flex-wrap items-center gap-3">
        <label>Display refresh rate <select aria-label="Display refresh rate" value={targetHz} onChange={(event) => setTargetHz(Number(event.target.value))} className="rounded-control border-2 border-ui-border bg-ui-surface p-2"><option value={60}>60 Hz</option><option value={120}>120 Hz</option></select></label>
        {!recording && <button className="rounded-control border-2 border-ui-border bg-ui-surface px-3 py-2 font-bold focus-ring" onClick={() => {
          setRecording(true);
          void captureFrames(targetHz).then(() => { setReport(getPerformanceReport()); setRecording(false); });
        }}>Record 8 seconds</button>}
        <button className="rounded-control border-2 border-ui-border bg-ui-surface px-3 py-2 font-bold focus-ring" onClick={() => setReport(getPerformanceReport())}>Refresh metrics</button>
        {recording && <span role="status">Recording…</span>}
      </div>
      <p>Proposed animation gate: p95 frame gaps ≤1.5 display intervals, with no gaps above 50 ms. Aborted recordings are invalid. Missing vitals mean not yet measured.</p>
      <pre aria-label="Performance report" className="whitespace-pre-wrap break-words rounded-control bg-ui-canvas p-4 text-sm">{JSON.stringify(report, null, 2)}</pre>
    </section>
  );
}
