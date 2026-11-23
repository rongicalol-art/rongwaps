import { useMemo, useRef, useState } from 'react';
import { useModalFocus } from '../../../hooks/useModalFocus';
import { useMockTestPool } from '../../../hooks/useMockTestPool';
import { ActionButton, LoadingScreen, WorkspaceWindow } from '../../../lib/widgets';
import type { MockTestAttempt } from '../../../store/slices/mockTestSlice';
import { useAppStore } from '../../../store/useAppStore';
import type { MockConfig, MockKind } from '../../../utils/mockTest/mockRun';
import { RECIPE_BANDS, bandOpen } from '../../../utils/mockTest/recipes';
import { MockTestScreen } from './MockTestScreen';
import { MockTestStart } from './MockTestStart';
import { newMockAttempt, savedMockAttempt } from './useMockTestRun';

/**
 * The TOCFL mock test: the three-step start, then the test, then the score. Closing mid-test keeps the run, and the
 * start screen offers to continue it.
 */
export function MockTestWindow({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const modalFocus = useModalFocus({ containerRef: ref, initialFocusRef: ref, isActive: true, onEscape: onClose });
  const { data, isLoading, error, retry } = useMockTestPool();
  const [attempt, setAttempt] = useState<MockTestAttempt | null>(null);
  const last = useAppStore((state) => state.mockTests[0] ?? null);
  // Read when the start screen shows: a test in progress is saved as it goes.
  const saved = useMemo(() => (data && !attempt ? savedMockAttempt(data) : null), [attempt, data]);
  const kinds = useMemo<MockKind[]>(() => (data?.pool.length ? ['adaptive', ...RECIPE_BANDS.filter((band) => bandOpen(data.pool, band))] : []), [data]);
  const start = (config: MockConfig) => {
    if (!data) return;
    const next = newMockAttempt(data, config);
    if (!next) return;
    useAppStore.getState().saveMockTestAttempt(next);
    setAttempt(next);
  };

  return (
    <WorkspaceWindow
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="TOCFL mock test"
      tabIndex={-1}
      onKeyDown={modalFocus.onKeyDown}
      tone="practice"
      layer="window"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <LoadingScreen tone="practice" message="Loading test" />
        ) : !data || kinds.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-lg font-black text-ui-ink-strong">{error ? 'The test didn’t load.' : 'No test yet.'}</p>
            <div className="flex w-full max-w-xs flex-col gap-2">
              {error && <ActionButton size="lg" fullWidth onClick={retry}>Try again</ActionButton>}
              <ActionButton variant="secondary" size="lg" fullWidth edgeColor="var(--color-ui-border)" onClick={onClose}>Close</ActionButton>
            </div>
          </div>
        ) : attempt ? (
          <MockTestScreen key={`${attempt.plan.key}:${attempt.plan.seed}`} data={data} attempt={attempt} onClose={() => setAttempt(null)} />
        ) : (
          <MockTestStart kinds={kinds} saved={saved} last={last} onStart={start} onContinue={() => setAttempt(saved)} onClose={onClose} />
        )}
      </div>
    </WorkspaceWindow>
  );
}
