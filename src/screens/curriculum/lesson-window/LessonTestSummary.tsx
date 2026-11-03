import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { LESSON_TEST_PARTS } from '../../../utils/lesson/lessonTestPlan';

/** The Test tab's title in place of the lesson title: the test's name and, once taken, the best score. */
export function LessonTestTitle({ lessonId, best, isDesktop }: { lessonId: number; best: { correct: number; total: number } | null; isDesktop: boolean }) {
  return (
    <div>
      <h2 className={cn('font-black leading-tight text-ui-ink-strong', isDesktop ? 'text-4xl' : 'text-2xl md:text-3xl')}>Lesson {lessonId} test</h2>
      {best && (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-black text-ui-muted-strong">
          <AppIcon name="crown" size={16} className="text-feedback-warning" />
          Best {best.correct} / {best.total}
        </p>
      )}
    </div>
  );
}

/** In place of the mode buttons while the Test tab is chosen: the two parts, numbered in the order they run. */
export function LessonTestParts({ large = false }: { large?: boolean }) {
  return (
    <ol className={cn('flex flex-col', large ? 'gap-4' : 'gap-3')}>
      {LESSON_TEST_PARTS.map(({ part, label }, index) => (
        <li key={part} className={cn('flex items-center font-black text-ui-ink-strong', large ? 'gap-3.5 text-2xl' : 'gap-3 text-xl')}>
          <span
            aria-hidden
            className={cn(
              'flex shrink-0 items-center justify-center rounded-xs border-2 border-ui-border bg-ui-surface font-black tabular-nums text-ui-muted-strong',
              large ? 'size-10 text-base' : 'size-8 text-sm',
            )}
          >
            {index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}
