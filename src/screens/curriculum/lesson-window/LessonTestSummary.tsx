import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { LESSON_TEST_PARTS } from '../../../utils/lesson/lessonTestPlan';

/** The Test tab's title in place of the lesson title: the test's name, its parts, and the best score once taken. */
export function LessonTestTitle({ lessonId, best, isDesktop }: { lessonId: number; best: { correct: number; total: number } | null; isDesktop: boolean }) {
  return (
    <div>
      <h2 className={cn('font-black leading-tight text-ui-ink-strong', isDesktop ? 'text-4xl' : 'text-2xl md:text-3xl')}>Lesson {lessonId} test</h2>
      <p className={cn('mt-1 font-bold text-ui-muted-strong', isDesktop ? 'text-xl' : 'text-lg')}>
        {LESSON_TEST_PARTS.map(({ label }) => label).join(' · ')}
      </p>
      {best && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-black text-ui-muted-strong">
          <AppIcon name="crown" size={16} className="text-feedback-warning" />
          Best {best.correct} / {best.total}
        </p>
      )}
    </div>
  );
}
