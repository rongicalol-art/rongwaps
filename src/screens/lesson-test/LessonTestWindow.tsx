import { useRef } from 'react';
import { ActionButton, LoadingScreen, WorkspaceWindow } from '../../lib/widgets';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useLessonTestData } from '../../hooks/useLessonTestData';
import { LessonTestScreen } from './LessonTestScreen';

interface LessonTestWindowProps {
  bookId: number;
  lessonId: number;
  onClose: () => void;
}

/** The lesson test over the lesson window. Closing mid-test keeps the run; opening again resumes it. */
export function LessonTestWindow({ bookId, lessonId, onClose }: LessonTestWindowProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Focus starts on the window itself, not its Close button: Space belongs to the test's own action.
  const modalFocus = useModalFocus({ containerRef: ref, initialFocusRef: ref, isActive: true, onEscape: onClose });
  const { data, isLoading, error, retry } = useLessonTestData(bookId, lessonId);
  return (
    <WorkspaceWindow
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Lesson ${lessonId} test`}
      tabIndex={-1}
      onKeyDown={modalFocus.onKeyDown}
      tone="practice"
      layer="window"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <LoadingScreen tone="practice" message="Loading test" />
        ) : data ? (
          <LessonTestScreen key={data.lesson.key} lesson={data.lesson} sounds={data.sounds} onClose={onClose} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-lg font-black text-ui-ink-strong">{error ? 'The test didn’t load.' : 'This lesson has no test yet.'}</p>
            <div className="flex w-full max-w-xs flex-col gap-2">
              {error && <ActionButton size="lg" fullWidth onClick={retry}>Try again</ActionButton>}
              <ActionButton variant="secondary" size="lg" fullWidth edgeColor="var(--color-ui-border)" onClick={onClose}>Back to lesson</ActionButton>
            </div>
          </div>
        )}
      </div>
    </WorkspaceWindow>
  );
}
