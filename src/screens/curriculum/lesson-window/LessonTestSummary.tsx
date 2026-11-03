import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { LESSON_TEST_PARTS } from '../../../utils/lesson/lessonTestPlan';

/** The big gold "Test": its letters drop in one by one, then a shine sweeps across now and then (index.css). */
function TestWord({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="Test" data-word="Test" className={cn('rw-test-word', className)}>
      {Array.from('Test').map((letter, index) => (
        <span key={index} aria-hidden style={{ '--i': index } as React.CSSProperties}>{letter}</span>
      ))}
    </span>
  );
}

/** The Test tab's title in place of the lesson title: the test's name, its parts, and the best score once taken. */
export function LessonTestTitle({ lessonId, best, isDesktop }: { lessonId: number; best: { correct: number; total: number } | null; isDesktop: boolean }) {
  return (
    <div data-tone="review" className={cn('flex flex-col', !isDesktop && 'items-center text-center')}>
      <h2 className="sr-only">Lesson {lessonId} test</h2>
      <p aria-hidden className={cn('font-black leading-none text-ui-muted-strong', isDesktop ? 'text-2xl' : 'text-xl')}>Lesson {lessonId}</p>
      <TestWord className={cn('mb-4 mt-1.5', isDesktop ? 'text-[108px]' : 'text-[92px]')} />
      <p className={cn('font-bold text-ui-muted-strong', isDesktop ? 'text-xl' : 'text-[17px]')}>
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
