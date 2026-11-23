import { useEffect, useRef, useState } from 'react';

interface AnswerTimerProps {
  /** When the time to answer began (`Date.now()`), so the bar keeps its place if it is drawn again. */
  startedAt: number;
  durationMs: number;
  onDone: () => void;
}

/**
 * The time to answer after a recording, as on the TOCFL computer test: a bar fills, the answer can still change, and
 * when it is full the test moves on by itself. Honey, the review tone, so it never reads as the progress bar.
 */
export function AnswerTimer({ startedAt, durationMs, onDone }: AnswerTimerProps) {
  const done = useRef(onDone);
  done.current = onDone;
  const [running, setRunning] = useState(false);
  // Where the bar stands as it is drawn, and how long it still has to run.
  const [from] = useState(() => Math.min(1, Math.max(0, (Date.now() - startedAt) / durationMs)));
  const leftMs = Math.round(durationMs * (1 - from));

  useEffect(() => {
    // One frame at its starting width first, so the fill animates from there.
    const frame = window.requestAnimationFrame(() => setRunning(true));
    const timer = window.setTimeout(() => done.current(), leftMs);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [leftMs]);

  return (
    <div data-tone="review" role="timer" aria-label={`${Math.round(durationMs / 1000)} seconds to answer`} className="h-4 w-full overflow-hidden rounded-full bg-brand-primary-track">
      {/* The fill is the information here, so it also moves under reduced motion. */}
      <div
        className="h-full origin-left rounded-full bg-brand-primary transition-[scale] ease-linear"
        style={{ scale: running ? '1 1' : `${from} 1`, transitionDuration: `${leftMs}ms` }}
      />
    </div>
  );
}

/** The timer alone at the bottom of the test (the full test has no Next button during listening). */
export function AnswerTimerDock(props: AnswerTimerProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-ui-practice-canvas from-70% to-transparent px-4 pb-sheet-safe pt-6">
      <div className="mx-auto w-full max-w-md md:pb-6">
        <AnswerTimer {...props} />
      </div>
    </div>
  );
}
