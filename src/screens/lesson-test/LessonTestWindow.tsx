import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { lessonKey } from '../../store/slices/socialSlice';
import { ActionButton, LoadingScreen, WorkspaceWindow } from '../../lib/widgets';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useLessonTestData } from '../../hooks/useLessonTestData';
import { LessonTestScreen } from './LessonTestScreen';
import { TestBooklet } from './components/TestBooklet';
import { lessonItemIndex, planFitsLesson } from '../../utils/lesson/lessonTestPlan';

interface LessonTestWindowProps {
  bookId: number;
  lessonId: number;
  /** Open on Scripts & answers of the last finished test instead of a new test. */
  review?: boolean;
  onClose: () => void;
}

/**
 * The lesson test over the lesson window. Closing mid-test keeps the run; opening again resumes it. From the Test
 * tab's Scripts & answers (`review`) it shows the last finished test's booklet instead.
 */
export function LessonTestWindow({ bookId, lessonId, review = false, onClose }: LessonTestWindowProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Focus starts on the window itself, not its Close button: Space belongs to the test's own action.
  const modalFocus = useModalFocus({ containerRef: ref, initialFocusRef: ref, isActive: true, onEscape: onClose });
  const { data, isLoading, error, retry } = useLessonTestData(bookId, lessonId);
  const last = useAppStore((state) => (review && data ? state.lessonTestLast[data.lesson.key] : undefined));
  // Study together shows "Mock test" while this window is open.
  useEffect(() => {
    useAppStore.getState().setSocial({ socialStudying: { a: 'test', lesson: lessonKey(bookId, lessonId) } });
    return () => useAppStore.getState().setSocial({ socialStudying: null });
  }, [bookId, lessonId]);
  return (
    <WorkspaceWindow
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={review ? `Lesson ${lessonId} test: scripts and answers` : `Lesson ${lessonId} test`}
      tabIndex={-1}
      onKeyDown={modalFocus.onKeyDown}
      tone="practice"
      layer="window"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <LoadingScreen tone="practice" message="Loading test" />
        ) : data && review ? (
          last && planFitsLesson(data.lesson, last.plan) ? (
            <TestBooklet items={lessonItemIndex(data.lesson)} title={`Lesson ${lessonId} test`} words={data.lesson.allowWords} plan={last.plan} answers={last.answers ?? {}} onClose={onClose} />
          ) : (
            // Never a new test from Scripts & answers: the saved one is gone or no longer matches the questions.
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-lg font-black text-ui-ink-strong">This test’s answers aren’t available any more.</p>
              <div className="w-full max-w-xs">
                <ActionButton variant="secondary" size="lg" fullWidth edgeColor="var(--color-ui-border)" onClick={onClose}>Back to lesson</ActionButton>
              </div>
            </div>
          )
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
